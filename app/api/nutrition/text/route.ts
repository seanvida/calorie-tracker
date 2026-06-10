import { NextResponse } from "next/server";
import { analyzeNutrition, GeminiError } from "@/lib/gemini";
import { getAiCache, recordAiUsage, setAiCache } from "@/lib/db";
import { clientKey, dedupe, rateLimit, tooManyRequests } from "@/lib/ai-guard";
import { getUserId } from "@/lib/auth";

// Gemini call runs server-side on the Node.js runtime.
export const runtime = "nodejs";

/**
 * POST /api/nutrition/text
 * Body: { "description": "grilled chicken with rice and salad" }
 * Returns structured NutritionResult estimated by Gemini.
 *
 * Guardrails: rate-limited per IP, de-duplicated over a short window, and cached
 * in Supabase so the same description never hits the API twice.
 */
export async function POST(request: Request) {
  if (!(await getUserId())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!description) {
    return NextResponse.json(
      { error: "Provide a 'description' string of what you ate." },
      { status: 400 },
    );
  }
  if (description.length > 1000) {
    return NextResponse.json(
      { error: "Description is too long (max 1000 characters)." },
      { status: 400 },
    );
  }

  // Normalize so trivially different inputs share a cache slot.
  const key = description.toLowerCase().replace(/\s+/g, " ").trim();

  // Cache hit → no API call.
  const cached = await getAiCache("text", key);
  if (cached) return NextResponse.json(cached);

  // Rate limit only the path that actually calls Gemini.
  const rl = rateLimit(clientKey(request));
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  try {
    const result = await dedupe(`text:${key}`, 10_000, async () => {
      const r = await analyzeNutrition([
        { text: `Estimate the nutrition for this meal: ${description}` },
      ]);
      await setAiCache("text", key, r);
      void recordAiUsage("text");
      console.log(`[ai] text call — "${key.slice(0, 60)}"`);
      return r;
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GeminiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: "Unexpected error analyzing nutrition." },
      { status: 500 },
    );
  }
}
