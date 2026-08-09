import { NextResponse } from "next/server";
import { getBurnedByDay, getDailySummaries } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import type { DaySummary } from "@/lib/types";

export const runtime = "nodejs";

const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * GET /api/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Per-day calorie + macro totals for history and trends. Defaults to the last
 * 30 days ending today if no range is given.
 */
export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let from = searchParams.get("from") ?? "";
  let to = searchParams.get("to") ?? "";

  if (!isDay(to)) to = new Date().toLocaleDateString("en-CA");
  if (!isDay(from)) {
    const d = new Date(to + "T00:00:00");
    d.setDate(d.getDate() - 29);
    from = d.toLocaleDateString("en-CA");
  }

  // Food totals + calories burned, merged by day (a workout-only day still shows).
  const [days, burned] = await Promise.all([
    getDailySummaries(userId, from, to),
    getBurnedByDay(userId, from, to),
  ]);
  const byDay = new Map<string, DaySummary>(days.map((d) => [d.day, d]));
  for (const b of burned) {
    const existing = byDay.get(b.day);
    if (existing) existing.burned = b.burned;
    else byDay.set(b.day, { day: b.day, calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0, burned: b.burned });
  }
  const merged = [...byDay.values()].sort((a, b) => (a.day < b.day ? 1 : -1));
  return NextResponse.json({ from, to, days: merged });
}
