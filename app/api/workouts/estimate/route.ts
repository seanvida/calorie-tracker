import { NextResponse } from "next/server";
import { estimateWorkout, GeminiError, type WorkoutEstimate } from "@/lib/gemini";
import { getAiCache, recordAiUsage, setAiCache } from "@/lib/db";
import { clientKey, dedupe, rateLimit, tooManyRequests } from "@/lib/ai-guard";
import { getUserId } from "@/lib/auth";

// Gemini call runs server-side on the Node.js runtime.
export const runtime = "nodejs";

/**
 * POST /api/workouts/estimate
 * Body: { "description": "ran 5k this morning" }
 * Returns { activity, durationMin, calories, note } estimated by Gemini.
 *
 * Same guardrails as the nutrition routes: cached in Supabase, rate-limited per
 * IP, and de-duplicated over a short window.
 */
export async function POST(request: Request) {
  if (!(await getUserId())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) {
    return NextResponse.json({ error: "Describe your workout." }, { status: 400 });
  }
  if (description.length > 500) {
    return NextResponse.json({ error: "Description is too long (max 500 characters)." }, { status: 400 });
  }

  const key = description.toLowerCase().replace(/\s+/g, " ").trim();

  const cached = await getAiCache<WorkoutEstimate>("workout", key);
  if (cached) return NextResponse.json(cached);

  const rl = rateLimit(clientKey(request));
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  try {
    const result = await dedupe(`workout:${key}`, 10_000, async () => {
      const r = await estimateWorkout(description);
      await setAiCache("workout", key, r);
      void recordAiUsage("workout");
      console.log(`[ai] workout call — "${key.slice(0, 60)}"`);
      return r;
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GeminiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Unexpected error estimating workout." }, { status: 500 });
  }
}
