import { NextResponse } from "next/server";
import { createSavedFood, getSavedFoods } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import type { NewSavedFood, Portion } from "@/lib/types";

// Uses the Postgres client (TCP), so it needs the Node.js runtime (not Edge).
export const runtime = "nodejs";

/** GET /api/saved-foods — the signed-in user's saved custom foods. */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json({ foods: await getSavedFoods(userId) });
}

/** POST /api/saved-foods — save a single custom food (one serving's values). */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: Partial<NewSavedFood>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, serving, calories, protein, carbs, fat } = body;
  if (
    typeof name !== "string" ||
    typeof serving !== "string" ||
    typeof calories !== "number" ||
    typeof protein !== "number" ||
    typeof carbs !== "number" ||
    typeof fat !== "number"
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }
  if (!name.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  // Only accept gram-based fields when they form a valid set.
  const per100 =
    body.per100 && typeof body.per100.calories === "number" ? body.per100 : undefined;
  const portions = Array.isArray(body.portions)
    ? (body.portions as Portion[]).filter((p) => p && typeof p.grams === "number" && p.grams > 0)
    : undefined;

  const food = await createSavedFood(userId, {
    name: name.trim(),
    serving,
    calories,
    protein,
    carbs,
    fat,
    per100,
    portions: portions?.length ? portions : undefined,
    defaultGrams: typeof body.defaultGrams === "number" ? body.defaultGrams : undefined,
  });
  return NextResponse.json({ food }, { status: 201 });
}
