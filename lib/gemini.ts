// Thin wrapper around the Gemini REST API for nutrition lookups.
//
// We call the REST endpoint directly with fetch (no SDK dependency) and use
// Gemini's structured-output mode (responseMimeType + responseSchema) so the
// model returns JSON matching our NutritionResult shape every time.

const MODEL = "gemini-2.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/** One identified food item with its estimated nutrition (per the stated amount). */
export interface NutritionItem {
  name: string;
  /** Estimated amount, e.g. "1 cup", "150g", "1 medium". */
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Structured result returned by both nutrition routes. */
export interface NutritionResult {
  items: NutritionItem[];
  total: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  /** Short note about assumptions/uncertainty, or why nothing was found. */
  note: string;
}

// Gemini's responseSchema is a subset of OpenAPI schema. Keeping it strict and
// flat makes the model reliably fill every field.
const NUTRITION_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          serving: { type: "string" },
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" },
        },
        required: ["name", "serving", "calories", "protein", "carbs", "fat"],
        propertyOrdering: ["name", "serving", "calories", "protein", "carbs", "fat"],
      },
    },
    total: {
      type: "object",
      properties: {
        calories: { type: "number" },
        protein: { type: "number" },
        carbs: { type: "number" },
        fat: { type: "number" },
      },
      required: ["calories", "protein", "carbs", "fat"],
      propertyOrdering: ["calories", "protein", "carbs", "fat"],
    },
    note: { type: "string" },
  },
  required: ["items", "total", "note"],
  propertyOrdering: ["items", "total", "note"],
} as const;

const SYSTEM_INSTRUCTION = `You are a nutrition estimation assistant for a calorie tracker focused on Indian and common everyday foods.
Identify each distinct food in the input and estimate its nutrition for a realistic single serving.
- calories are kcal; protein, carbs, and fat are in grams.
- "total" must be the sum of all items.
- If the input has no identifiable food, return an empty items array, zeroed total, and explain in "note".
- Keep estimates reasonable for home-style portions; use the "note" field for assumptions (e.g. portion size, cooking style).`;

/** Thrown for any failure talking to Gemini so routes can map to HTTP codes. */
export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number = 502,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/**
 * Send content parts (text and/or an inline image) to Gemini and parse the
 * structured nutrition JSON it returns.
 */
export async function analyzeNutrition(parts: Part[]): Promise<NutritionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY is not set in the environment.", 500);
  }

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: NUTRITION_SCHEMA,
      temperature: 0.2,
    },
  };

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new GeminiError(`Could not reach Gemini: ${(e as Error).message}`);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // Surface auth/quota problems distinctly; otherwise treat as upstream error.
    const status = res.status === 401 || res.status === 403 ? 502 : 502;
    throw new GeminiError(
      `Gemini request failed (${res.status}): ${truncate(detail)}`,
      status,
    );
  }

  const json = await res.json();
  const text: string | undefined =
    json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    const finish = json?.candidates?.[0]?.finishReason;
    throw new GeminiError(
      `Gemini returned no content${finish ? ` (finishReason: ${finish})` : ""}.`,
    );
  }

  let parsed: NutritionResult;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiError("Gemini returned malformed JSON.");
  }

  return normalize(parsed);
}

/** Round numbers and guard against missing fields so the API output is clean. */
function normalize(r: NutritionResult): NutritionResult {
  const items = Array.isArray(r.items) ? r.items : [];
  const cleanItems = items.map((it) => ({
    name: String(it.name ?? "Unknown"),
    serving: String(it.serving ?? ""),
    calories: round(it.calories),
    protein: round(it.protein),
    carbs: round(it.carbs),
    fat: round(it.fat),
  }));

  // Recompute totals from items so they always reconcile with the breakdown.
  const total = cleanItems.reduce(
    (acc, it) => ({
      calories: acc.calories + it.calories,
      protein: acc.protein + it.protein,
      carbs: acc.carbs + it.carbs,
      fat: acc.fat + it.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return {
    items: cleanItems,
    total: {
      calories: round(total.calories),
      protein: round(total.protein),
      carbs: round(total.carbs),
      fat: round(total.fat),
    },
    note: typeof r.note === "string" ? r.note : "",
  };
}

function round(n: unknown): number {
  const v = typeof n === "number" && isFinite(n) ? n : 0;
  return Math.round(v * 10) / 10;
}

function truncate(s: string, max = 300): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}
