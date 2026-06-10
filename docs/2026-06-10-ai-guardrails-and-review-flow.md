# 2026-06-10 — AI cost/abuse guardrails + review-before-commit add flow

Two related changes: stop AI usage from running up a surprise bill, and stop
anything (especially AI estimates) from landing in the log unreviewed.

## Part A — Cost & abuse guardrails

Every path that can call Gemini now goes through the same protections.

| Guardrail | How | Cost impact |
|---|---|---|
| **Persistent cache** | `ai_cache` table keyed by normalized text or image **sha256**; checked before any API call (`getAiCache`/`setAiCache` in `lib/db.ts`). The `/api/foods` fallback already caches into `foods`. | The same description, photo, or food is **never billed twice** — repeat logs are free. |
| **Short-window de-dup** | In-memory map of in-flight calls (`dedupe` in `lib/ai-guard.ts`, 10 s TTL). | Double-clicks / two devices asking at once share **one** call instead of two. |
| **Image compression** | `lib/image.ts` downscales photos to ≤1024px JPEG (q0.82) on the client before upload. | Gemini bills image input by resolution — a multi-MB phone photo drops to ~100–200 KB, cutting image tokens by ~5–10×. |
| **Rate limit** | Per-IP fixed window, 20 calls/min (`rateLimit` in `lib/ai-guard.ts`), applied only on the actual API paths (local catalogue search stays unthrottled so search-as-you-type isn't blocked). | Caps a runaway/abusive client at ~20 calls/min/instance. |
| **Usage counter** | `recordAiUsage(route)` upserts a daily count into `ai_usage`; each real call also logs `[ai] …`. | `select * from ai_usage` shows how many real calls happened, per route per day. |

Notes:
- The in-memory limit + de-dup are **per server instance** (so on Vercel they're
  approximate across instances). The durable, cross-instance truth for "how many
  calls happened" is the `ai_usage` table; the persistent `ai_cache` is what
  actually prevents repeat spend regardless of instance.
- Routes still pin `runtime = "nodejs"` (DB + crypto + Gemini are Node-only).

**Expected impact:** steady-state cost is dominated by *first-time* unique foods
/ photos only; repeats, retries, and re-logs are free. A logged-in day of normal
use should be a handful of real calls at most.

## Part B — Review-before-commit add flow

Previously quick-add logged instantly, and AI items were confirmed with
checkboxes (no editing). Now **all three input methods** stage into one editable
review panel and **nothing saves until "Add meal"**.

- **One pending list** (`PendingPanel`): quick-add/search **append** an item;
  text/photo **replace** with the detected items.
- **`PendingItemCard`** is fully editable: food name, serving label, a
  **`ServingStepper`** (0.5 steps — 1, 1.5, 2 …), and calories/protein/carbs/fat.
  The macro fields hold the *totals* and **recompute live** when servings change
  (totals scale by the ratio). At commit the multiplier is baked into the stored
  serving label (e.g. `1.5× 1 roti (~40g)`) and per-item values; `qty` stays 1.
- **AI sanity-check** (`validateNutrition` in `lib/nutrition.ts`): for
  `source: "ai"` items, flags invalid/negative numbers, absurd ranges (e.g.
  calories > 1500 for one item), and macro/calorie mismatch
  (|4·P + 4·C + 9·F − kcal| beyond tolerance). Flags render as ⚠ notes and the
  offending field is outlined — **every field stays editable**.
- **Multiple foods** (photo): each detected item can be edited or removed before
  adding.

`AiResultPanel` (checkbox confirm) was removed in favour of this editor.

## Verified

- `npx tsc --noEmit` and `npm run build` pass.
- Text route: 2 identical POSTs → **1** Gemini call (`ai_usage.text` +1), 2nd served from cache.
- Browser: quick-add stages a card without logging (daily total unchanged);
  bumping to 1.5 servings recomputed 104→156 kcal live; "Add meal" then logged it
  (410→566) as `1.5× 1 roti (~40g)`; setting an AI item's calories to 9999 showed
  "Unusually high" + "don't match the macros" flags while staying editable.
