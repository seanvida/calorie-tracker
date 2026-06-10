import { NextResponse } from "next/server";
import { getDailySummaries } from "@/lib/db";

export const runtime = "nodejs";

const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * GET /api/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Per-day calorie + macro totals for history and trends. Defaults to the last
 * 30 days ending today if no range is given.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let from = searchParams.get("from") ?? "";
  let to = searchParams.get("to") ?? "";

  if (!isDay(to)) to = new Date().toLocaleDateString("en-CA");
  if (!isDay(from)) {
    const d = new Date(to + "T00:00:00");
    d.setDate(d.getDate() - 29);
    from = d.toLocaleDateString("en-CA");
  }

  return NextResponse.json({ from, to, days: await getDailySummaries(from, to) });
}
