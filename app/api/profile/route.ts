import { NextResponse } from "next/server";
import { getProfile, saveProfile } from "@/lib/db";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/profile — the single-user profile. */
export async function GET() {
  return NextResponse.json({ profile: await getProfile() });
}

const numOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** PUT /api/profile — upsert the profile. */
export async function PUT(request: Request) {
  let body: Partial<Profile>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const goal = numOrNull(body.calorieGoal);
  if (goal !== null && (goal < 500 || goal > 10000)) {
    return NextResponse.json(
      { error: "Calorie goal must be between 500 and 10000." },
      { status: 400 },
    );
  }

  const profile = await saveProfile({
    name: typeof body.name === "string" ? body.name.trim().slice(0, 60) || null : null,
    calorieGoal: goal ?? 2000,
    proteinTarget: numOrNull(body.proteinTarget),
    carbsTarget: numOrNull(body.carbsTarget),
    fatTarget: numOrNull(body.fatTarget),
    heightCm: numOrNull(body.heightCm),
    weightKg: numOrNull(body.weightKg),
    age: numOrNull(body.age),
    sex: body.sex === "male" || body.sex === "female" ? body.sex : null,
    activity: numOrNull(body.activity),
    onboarded: typeof body.onboarded === "boolean" ? body.onboarded : undefined,
  });
  return NextResponse.json({ profile });
}
