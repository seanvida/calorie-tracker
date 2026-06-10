import { NextResponse } from "next/server";
import { analyzeNutrition, GeminiError } from "@/lib/gemini";

// Gemini call runs server-side on the Node.js runtime.
export const runtime = "nodejs";

/**
 * POST /api/nutrition/text
 * Body: { "description": "grilled chicken with rice and salad" }
 * Returns structured NutritionResult estimated by Gemini.
 */
export async function POST(request: Request) {
  let body: { description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!description) {
    return NextResponse.json(
      { error: "Provide a 'description' string of what you ate." },
      { status: 400 },
    );
  }
  if (description.length > 1000) {
    return NextResponse.json(
      { error: "Description is too long (max 1000 characters)." },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeNutrition([
      { text: `Estimate the nutrition for this meal: ${description}` },
    ]);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GeminiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: "Unexpected error analyzing nutrition." },
      { status: 500 },
    );
  }
}
