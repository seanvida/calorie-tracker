import { NextResponse } from "next/server";
import { getEntriesForDay, getWorkoutsForDay } from "@/lib/db";
import { getUserId } from "@/lib/auth";

// One round-trip for a day's food log + workouts (was two separate fetches).
export const runtime = "nodejs";

/** GET /api/day?date=YYYY-MM-DD — { entries, workouts } for that day. */
export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const day = searchParams.get("date") ?? new Date().toLocaleDateString("en-CA");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const [entries, workouts] = await Promise.all([
    getEntriesForDay(userId, day),
    getWorkoutsForDay(userId, day),
  ]);
  return NextResponse.json({ entries, workouts });
}
