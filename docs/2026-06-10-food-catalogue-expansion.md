# 2026-06-10 — Food catalogue: thousands of foods + AI fallback that caches

## Goal

The app shipped with ~60 hardcoded Indian foods (`lib/foods.ts`). We wanted
**thousands** of searchable foods (Indian + everyday + packaged) without typing
them by hand, and a way for the catalogue to keep growing automatically.

## Design — two layers

1. **Seeded base** in Supabase (`foods` table). Search hits this first.
2. **Gemini fallback + cache.** On a search miss, ask Gemini
   (`gemini-2.5-flash-lite`) for that single food, **save** it to `foods`
   (`source='gemini'`, `reviewed=false`), and return it. Next search for the same
   food is a local hit. The catalogue grows on every miss; it's never re-queried.

## Seed source & count

- **Source:** USDA **FoodData Central — SR Legacy** CSV
  (`FoodData_Central_sr_legacy_food_csv_2018-04.zip`, ~6 MB, public domain).
  Open Food Facts was considered for Indian packaged items but was rate-limiting
  at build time, so it was skipped — USDA covers the everyday/ingredient base.
- **Build** (`scripts/gen-foods-seed.mjs`): stream `food_nutrient.csv`, keep
  nutrient IDs 1008 (kcal), 1003 (protein), 1004 (fat), 1005 (carbs) per 100 g;
  join `food.csv` names and the first `food_portion.csv` portion to get a real
  serving size + gram weight; scale macros to that serving. Drop foods with no
  energy; dedupe by lower(name).
- **Curation / India focus:** merge the **66 curated Indian dishes** from
  `lib/foods.ts` first (they win name collisions), then the USDA rows.
- **Result:** `scripts/foods_seed.json` — **7,806 foods** (66 Indian core +
  7,740 USDA). Seeded with `scripts/seed-foods.mjs` (idempotent, `ON CONFLICT DO
  NOTHING`). After one real cache-miss in testing ("Thalipeeth"), the live table
  holds **7,807** (7,806 seed + 1 gemini).

## Schema

`foods`: `id` (bigint identity), `name`, `serving`, `calories`, `protein`,
`carbs`, `fat`, `source` ('seed'|'gemini'), `reviewed` (bool), `created_at`.
- **Unique index on `lower(name)`** → no duplicates, and the fallback can insert
  blindly (conflict → return the existing row).
- **Review marking:** seed rows are `reviewed=true` (trusted source); Gemini rows
  are `reviewed=false`, so `WHERE NOT reviewed` is a clean review queue.

## Search behaviour (`lib/db.ts: searchFoods`)

Tokenizes the query and requires **every** word to appear (AND of `ILIKE
%word%`). This matters because USDA names are comma-ordered
("Chicken, broilers or fryers, breast, meat only, cooked, roasted"), so
"chicken breast roasted" still finds them. Ranks exact match, then prefix, then
shorter names. At ~7.8k rows a plain ILIKE scan is instant, so no extension
(pg_trgm) was needed.

## UI (`app/page.tsx`)

Quick-add with an **empty** box browses the curated Indian core (no fetch).
Typing debounces (350 ms) and calls `GET /api/foods?q=`. Results render as a flat
list; when a result came from the fallback, a small "Estimated by AI and added to
the catalogue" note shows. `FoodCard`/`FoodList` were generalized to a
`DisplayFood` shape so both the browse list and search hits reuse them.

## Verified

- `npx tsc --noEmit` passes.
- "paneer" → 6 local Indian hits; "chicken breast roasted" → USDA hits via
  tokenized match; "thalipeeth" → Gemini on first query, **local** on the second
  (cached); DB review queue = exactly the AI rows.
