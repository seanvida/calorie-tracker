import { NextResponse } from "next/server";
import { addWorkout, getWorkoutsForDay } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import type { NewWorkoutEntry } from "@/lib/types";

// Uses the Postgres client (TCP), so it needs the Node.js runtime (not Edge).
export const runtime = "nodejs";

const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/** GET /api/workouts?date=YYYY-MM-DD — workouts logged that day. */
export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const day = searchParams.get("date") ?? new Date().toLocaleDateString("en-CA");
  if (!isDay(day)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  return NextResponse.json({ workouts: await getWorkoutsForDay(userId, day) });
}

/** POST /api/workouts — log a workout (calories burned). */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: Partial<NewWorkoutEntry>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { activity, calories, day } = body;
  if (
    typeof activity !== "string" ||
    !activity.trim() ||
    typeof calories !== "number" ||
    !(calories >= 0) ||
    typeof day !== "string" ||
    !isDay(day)
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const workout = await addWorkout(userId, {
    activity: activity.trim(),
    durationMin:
      typeof body.durationMin === "number" && body.durationMin > 0 ? Math.round(body.durationMin) : null,
    calories: Math.round(calories),
    notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
    day,
  });
  return NextResponse.json({ workout }, { status: 201 });
}
