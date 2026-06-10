import { NextResponse } from "next/server";
import { addCatalogFood, recordAiUsage, searchFoods } from "@/lib/db";
import { analyzeNutrition, GeminiError } from "@/lib/gemini";
import { clientKey, dedupe, rateLimit, tooManyRequests } from "@/lib/ai-guard";

// Hits Supabase + Gemini, so it needs the Node.js runtime (not Edge).
export const runtime = "nodejs";

/**
 * GET /api/foods?q=<query> — search the food catalogue.
 *
 * Two layers:
 *  1. Search the seeded Supabase catalogue first (`source: "local"`).
 *  2. On a miss, ask Gemini for the single food, SAVE it to the catalogue
 *     (marked source="gemini", reviewed=false), and return it (`source:
 *     "gemini"`). The catalogue grows on every cache-miss; the unique-name
 *     index stops the same food from being stored — or re-queried — twice.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ foods: [], source: "local" });
  if (q.length > 100) {
    return NextResponse.json({ error: "Search query is too long." }, { status: 400 });
  }

  // Layer 1: local catalogue. (Unthrottled — this is just a fast DB query, and
  // search-as-you-type fires many of these.)
  const local = await searchFoods(q, 50);
  if (local.length > 0) {
    return NextResponse.json({ foods: local, source: "local" });
  }

  // Layer 2: Gemini fallback. Rate-limited + de-duplicated since this calls the
  // API; the `foods` table itself is the persistent cache (next search hits local).
  const rl = rateLimit(clientKey(request));
  if (!rl.ok) return tooManyRequests(rl.retryAfter);

  const key = q.toLowerCase().replace(/\s+/g, " ").trim();
  try {
    const saved = await dedupe(`food:${key}`, 10_000, async () => {
      const result = await analyzeNutrition([
        {
          text:
            `Identify the single common food item named "${q}" and give its ` +
            `nutrition for one typical serving. Return exactly one item for the ` +
            `food itself (not a multi-dish meal).`,
        },
      ]);
      const item = result.items[0];
      if (!item) return null;
      void recordAiUsage("foods");
      console.log(`[ai] foods fallback — "${key.slice(0, 60)}"`);
      return addCatalogFood({
        name: item.name,
        serving: item.serving,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        source: "gemini",
      });
    });
    if (!saved) {
      return NextResponse.json({ foods: [], source: "gemini", note: "No matching food found." });
    }
    return NextResponse.json({ foods: [saved], source: "gemini" });
  } catch (e) {
    if (e instanceof GeminiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Food lookup failed." }, { status: 500 });
  }
}
