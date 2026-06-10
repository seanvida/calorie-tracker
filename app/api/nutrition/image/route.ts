import { NextResponse } from "next/server";
import { analyzeNutrition, GeminiError } from "@/lib/gemini";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/**
 * POST /api/nutrition/image
 * Accepts an uploaded meal photo and returns a structured NutritionResult.
 *
 * Two body formats are supported:
 *  - multipart/form-data with an "image" file field (typical browser upload)
 *  - application/json: { "imageBase64": "...", "mimeType": "image/jpeg" }
 */
export async function POST(request: Request) {
  let data: string;
  let mimeType: string;

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("image");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Attach the photo as form field 'image'." },
          { status: 400 },
        );
      }
      mimeType = file.type || "image/jpeg";
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.byteLength === 0) {
        return NextResponse.json({ error: "Uploaded image is empty." }, { status: 400 });
      }
      if (bytes.byteLength > MAX_BYTES) {
        return NextResponse.json({ error: "Image too large (max 8 MB)." }, { status: 413 });
      }
      data = Buffer.from(bytes).toString("base64");
    } else {
      // JSON fallback: base64 payload
      const body = (await request.json()) as {
        imageBase64?: unknown;
        mimeType?: unknown;
      };
      if (typeof body.imageBase64 !== "string" || !body.imageBase64) {
        return NextResponse.json(
          { error: "Provide 'imageBase64' (and optional 'mimeType')." },
          { status: 400 },
        );
      }
      data = body.imageBase64.replace(/^data:[^;]+;base64,/, "");
      mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";
    }
  } catch {
    return NextResponse.json({ error: "Could not read the request body." }, { status: 400 });
  }

  if (!ALLOWED.includes(mimeType)) {
    return NextResponse.json(
      { error: `Unsupported image type '${mimeType}'. Use JPEG, PNG, WebP, or HEIC.` },
      { status: 415 },
    );
  }

  try {
    const result = await analyzeNutrition([
      {
        text:
          "Identify the foods in this meal photo and estimate their nutrition. " +
          "If portion size is unclear, assume a typical serving and note the assumption.",
      },
      { inlineData: { mimeType, data } },
    ]);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GeminiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: "Unexpected error analyzing image." },
      { status: 500 },
    );
  }
}
