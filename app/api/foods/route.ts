import { NextResponse } from "next/server";
import { addCatalogFood, searchFoods } from "@/lib/db";
import { analyzeNutrition, GeminiError } from "@/lib/gemini";

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

  // Layer 1: local catalogue.
  const local = await searchFoods(q, 50);
  if (local.length > 0) {
    return NextResponse.json({ foods: local, source: "local" });
  }

  // Layer 2: Gemini fallback, then cache the result.
  try {
    const result = await analyzeNutrition([
      {
        text:
          `Identify the single common food item named "${q}" and give its ` +
          `nutrition for one typical serving. Return exactly one item for the ` +
          `food itself (not a multi-dish meal).`,
      },
    ]);
    const item = result.items[0];
    if (!item) {
      return NextResponse.json({
        foods: [],
        source: "gemini",
        note: result.note || "No matching food found.",
      });
    }
    const saved = await addCatalogFood({
      name: item.name,
      serving: item.serving,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      source: "gemini",
    });
    return NextResponse.json({ foods: [saved], source: "gemini" });
  } catch (e) {
    if (e instanceof GeminiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Food lookup failed." }, { status: 500 });
  }
}
