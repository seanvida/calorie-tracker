# Gram-based portions + catalogue depth — 2026-08-09

## What changed (Phase 2a — shipped)

Foods can now be logged **by portion or by weight**. Each food may carry
per-100g macros (`per100`) plus a list of selectable `portions`; the review
card shows a **portion dropdown** (natural serving, 100 g, common weights,
Custom g) and recomputes macros as `per100 × grams/100 × servings` (servings now
step in 0.25).

Backward compatible: foods without per-100g data keep their single editable
`serving` string (legacy path).

### Where the per-100g data comes from
- **Static Indian core** (`lib/foods.ts`): enriched at load from the gram weight
  in each serving label (e.g. "1 cup (~150g)") via `lib/portions.ts`.
- **Seeded catalogue** (`foods` table): backfilled by `scripts/gen-portions.mjs`
  (already regenerated `foods_seed.json` — 7,797/7,806 rows) + `seed-foods.mjs`.
- **AI-added foods**: Gemini now returns a `grams` weight per item; the text/photo
  flows and the search fallback derive per-100g + portions from it on the fly.

### Files
- `lib/types.ts` — `Per100`, `Portion`, `GramBased`; optional fields on
  Food/DisplayFood/CatalogFood/PendingItem (+ `grams` on PendingItem).
- `lib/portions.ts` — `parseGrams`, `toPer100`, `buildPortions`, `scaleFromPer100`.
- `lib/foods.ts` — core enriched with portions.
- `components/PendingItemCard.tsx` — portion dropdown + recompute.
- `components/Home.tsx` — `toPending` maps gram data; `fmtServings` handles 0.25.
- `lib/db.ts` — catalogue reads/writes the new columns.
- `lib/gemini.ts` + `app/api/foods/route.ts` — AI returns/persists `grams`.
- `supabase/schema.sql`, `scripts/seed-foods.mjs`, `scripts/gen-portions.mjs`.

## DEPLOY ORDER — migrate first, then deploy

`searchFoods` selects the new columns, so they must exist in the live DB
**before** this deploy or `/api/foods` will 500. Run in the Supabase SQL editor:

```sql
alter table foods add column if not exists kcal100       real;
alter table foods add column if not exists protein100    real;
alter table foods add column if not exists carbs100      real;
alter table foods add column if not exists fat100        real;
alter table foods add column if not exists portions      jsonb;
alter table foods add column if not exists default_grams real;
```

After the deploy, backfill values onto the seeded rows (from a machine with a
working `DATABASE_URL`):

```bash
node scripts/gen-portions.mjs   # already run; regenerates foods_seed.json
node scripts/seed-foods.mjs     # adds columns (idempotent) + upserts per-100g/portions
```

Until the backfill runs, catalogue rows simply use the legacy single serving;
AI-added foods get portions immediately.

## Phase 2b — the big import (to reach 50–150k), still TODO

Needs the source dumps (multi-GB) on a real machine:
- **USDA FoodData Central** (SR Legacy + Foundation) — per-100g + real
  `food_portion` gram weights → richer named portions ("1 cup", "1 medium").
- **IFCT 2017** (Indian Food Composition Tables) — per-100g Indian foods.
- **Open Food Facts** — filtered India/packaged subset (per-100g + serving_size).

Extend `scripts/gen-foods-seed.mjs` to emit `kcal100/…/portions/default_grams`
(the USDA branch already has the gram weights; keep *all* `food_portion` rows,
not just the first). Cap output to stay within the Supabase free tier
(~50–150k rows), then `node scripts/seed-foods.mjs`.
