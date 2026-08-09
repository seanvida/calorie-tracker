import { NextResponse } from "next/server";
import { getProfile, getSavedFoods, getSummaryDays } from "@/lib/db";
import { getUserId } from "@/lib/auth";

// One round-trip for the day-independent data the app needs on open:
// profile + saved foods + the 30-day summary (was three separate fetches).
export const runtime = "nodejs";

/** GET /api/bootstrap — { profile, savedFoods, summary } for the signed-in user. */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const to = new Date().toLocaleDateString("en-CA");
  const d = new Date(to + "T00:00:00");
  d.setDate(d.getDate() - 29);
  const from = d.toLocaleDateString("en-CA");

  const [profile, savedFoods, days] = await Promise.all([
    getProfile(userId),
    getSavedFoods(userId),
    getSummaryDays(userId, from, to),
  ]);
  return NextResponse.json({ profile, savedFoods, summary: { from, to, days } });
}
