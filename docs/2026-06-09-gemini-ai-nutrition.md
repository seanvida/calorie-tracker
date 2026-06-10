# 2026-06-09 — Gemini AI Nutrition Lookup (Backend)

Second build session, same date as the initial build. Adds AI-powered nutrition
estimation. **Backend only — the frontend was intentionally left untouched.**

## What was added

Two new API routes that estimate nutrition with the Gemini API
(`gemini-2.5-flash-lite`), plus a shared helper:

- **`lib/gemini.ts`** — REST wrapper around Gemini. Defines the
  `NutritionItem` / `NutritionResult` types, the JSON `responseSchema`, the
  system instruction, the `analyzeNutrition(parts)` call, a `GeminiError` class,
  and response normalization (rounding + totals recomputed from items).
- **`POST /api/nutrition/text`** — body `{ description }`; returns a
  `NutritionResult`. Validates non-empty, ≤1000 chars.
- **`POST /api/nutrition/image`** — `multipart/form-data` with an `image` file
  (or JSON `{ imageBase64, mimeType }` fallback); returns a `NutritionResult`.
  Validates presence, type (JPEG/PNG/WebP/HEIC), and size (≤8 MB).

Both routes return the **same response shape** so the frontend can handle them
with one code path later.

### Verification

Tested against the running dev server with the real key in `.env`:

- Text validation: empty body → `400`.
- Text real query: `"grilled chicken with rice and salad"` → `200` with three
  identified items (chicken / rice / salad), per-item macros, reconciled totals
  (455 kcal), and an assumptions note.
- Image validation: no file → `400`; `image/gif` → `415`.
- Image real upload: a locally generated PNG posted as multipart → `200` with a
  valid `NutritionResult`. (The synthetic test image has no real food, so Gemini
  correctly returned empty items with an explanatory note — this still exercises
  the full multipart → base64 → multimodal → structured-parse pipeline. A real
  meal photo returns identified foods, as the text path confirms the model
  produces real estimates.)

## Decisions & rationale

### REST `fetch` instead of an SDK (`@google/genai`)
No new dependency, no install/native-build risk (consistent with the earlier
`better-sqlite3` → `node:sqlite` decision this project already made). The REST
surface we need — `generateContent` with `systemInstruction`, `inlineData`, and
structured output — is small and stable. Trade-off: we hand-roll request
shaping and error handling instead of getting SDK helpers, which is acceptable
for two endpoints.

### Structured output via `responseSchema`
Gemini's `responseMimeType: "application/json"` + `responseSchema` makes the
model return JSON matching our shape directly, so there is no brittle parsing of
prose or markdown code fences. Schema is kept flat and strict (every field
`required`) so the model reliably fills it. `temperature: 0.2` keeps estimates
stable.

### One shared shape for both routes (`NutritionResult`)
`{ items[], total, note }`. Returning a per-item breakdown (not just a single
total) means the future UI can let the user add foods individually and show what
the AI identified. The `note` field carries portion/cooking assumptions and the
"no food found" explanation, keeping that out of the numeric fields.

### Totals recomputed server-side
Even though we ask Gemini for `total`, we recompute it from the rounded items so
the breakdown and total always reconcile (LLMs occasionally produce sums that
don't add up). All numbers are rounded to one decimal.

### Image input: multipart primary, base64 JSON fallback
A browser `<input type="file">` upload posts `multipart/form-data` most
naturally, so `image` is the primary path. The JSON base64 fallback (with
`data:` prefix stripping) keeps the route easy to call from scripts/tests and
flexible for the frontend. Size cap 8 MB and an allow-list of common photo MIME
types guard the Gemini call.

### Error handling → HTTP status mapping
`GeminiError` carries a status: `500` for a missing key, `502` for upstream/
network/parse failures; route-level validation returns `400` / `413` / `415`.
This gives the future frontend clear, actionable failure modes.

### Frontend untouched (as instructed)
Only additive files: `lib/gemini.ts` and the two route files. No existing
component, page, `lib/db.ts`, `lib/foods.ts`, or styling was modified. The app's
existing catalog/search/log behavior is unchanged.

## Notes / next steps

- Wiring the UI to these routes is the next session: a description input and a
  photo upload that render returned items and let the user add them to the log
  (reusing the existing `POST /api/log`).
- `GEMINI_API_KEY` must be present in `.env` (loaded automatically by Next.js).
  It is git-ignored.
- No automated tests yet; verification was manual via `curl`.
