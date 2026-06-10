// In-memory guardrails for the AI routes: per-IP rate limiting and short-window
// request de-duplication. These live on the server instance (not the DB) because
// they only need to be approximately right and must be fast. On serverless they
// are per-instance — combined with the persistent Supabase cache + usage counter,
// that's enough to stop a runaway bill. The recordAiUsage counter (in db.ts) is
// the durable, cross-instance source of truth for "how many calls happened".

interface Bucket {
  count: number;
  reset: number;
}
const buckets = new Map<string, Bucket>();

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds until the window resets
}

/** Fixed-window rate limit. Default: 20 AI calls per IP per minute. */
export function rateLimit(key: string, limit = 20, windowMs = 60_000): RateResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((b.reset - now) / 1000) };
  }
  b.count++;
  return { ok: true, remaining: limit - b.count, retryAfter: 0 };
}

/** Best-effort client identifier from proxy headers (Vercel sets x-forwarded-for). */
export function clientKey(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "anon";
}

// --- Short-window de-duplication --------------------------------------------
// Identical requests that arrive close together share a single in-flight call
// (and its result for a few seconds), so a double-click or two devices asking
// the same thing at once don't fire two Gemini calls.

interface Inflight {
  p: Promise<unknown>;
  ts: number;
}
const inflight = new Map<string, Inflight>();

export async function dedupe<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = inflight.get(key);
  if (hit && now - hit.ts < ttlMs) return hit.p as Promise<T>;

  const p = fn();
  inflight.set(key, { p, ts: now });
  // Keep a successful result around for ttlMs; drop errors immediately so a
  // genuine retry isn't blocked by a transient failure.
  p.then(
    () => setTimeout(() => {
      if (inflight.get(key)?.p === p) inflight.delete(key);
    }, ttlMs),
    () => {
      if (inflight.get(key)?.p === p) inflight.delete(key);
    },
  );
  return p;
}

/** Standard 429 helper for the AI routes. */
export function tooManyRequests(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many AI requests — please slow down a moment." }),
    {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter) },
    },
  );
}
