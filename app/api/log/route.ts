import { NextResponse } from "next/server";
import { addEntry, getEntriesForDay } from "@/lib/db";
import { MEALS, type MealCategory, type NewLogEntry } from "@/lib/types";

// The Postgres client uses TCP sockets, so it needs the Node.js runtime (not Edge).
export const runtime = "nodejs";

/** GET /api/log?date=YYYY-MM-DD — entries logged for that day. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const day = searchParams.get("date") ?? todayKey();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  return NextResponse.json({ entries: await getEntriesForDay(day) });
}

/** POST /api/log — add a food to the log. */
export async function POST(request: Request) {
  let body: Partial<NewLogEntry>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { foodName, serving, calories, protein, carbs, fat, day } = body;
  if (
    typeof foodName !== "string" ||
    typeof serving !== "string" ||
    typeof calories !== "number" ||
    typeof protein !== "number" ||
    typeof carbs !== "number" ||
    typeof fat !== "number" ||
    typeof day !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(day)
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  // Default to Snack if an unknown/missing meal is sent.
  const meal: MealCategory = MEALS.includes(body.meal as MealCategory)
    ? (body.meal as MealCategory)
    : "Snack";

  const entry = await addEntry({
    foodName,
    serving,
    calories,
    protein,
    carbs,
    fat,
    qty: typeof body.qty === "number" ? body.qty : 1,
    meal,
    day,
  });
  return NextResponse.json({ entry }, { status: 201 });
}

function todayKey(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}
