# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What this is

**Calorie Tracker** is a polished single-page calorie & macro tracker for
everyday Indian food. You log meals three ways — quick-add from a **searchable
catalogue of thousands of foods** (Indian + everyday + packaged, with an AI
fallback that grows the catalogue on misses), a plain-English description, or a
meal photo — and watch a daily calorie goal, a traffic-light progress bar, and
macro bars update live. **Nothing is logged until you review and edit it** in a
preview card (name, 0.5-step servings with live recompute, macros). Entries are
grouped by meal (Breakfast / Lunch / Dinner / Snack), each with an **editable
serving count**, and persist in a hosted **Supabase (Postgres)** database — the
same data on every device, surviving deploys. AI calls are guarded by caching,
de-duplication, image compression, and rate limiting. No login, no accounts (yet).

## Run it

```bash
npm install      # first time only
npm run dev      # Next.js at http://localhost:3000
```

Other scripts: `npm run build`, `npm start`. No test/lint suite yet.

## Environment & secrets

- Secrets live in `.env` (gitignored) — never commit it. Required keys:
  - `GEMINI_API_KEY` — AI nutrition lookup (read via `process.env` in `lib/gemini.ts`).
  - `DATABASE_URL` — Supabase Postgres connection string (read in `lib/db.ts`).
    Use Supabase's **Transaction pooler** string (port 6543); works locally and
    on Vercel. No keys are hardcoded anywhere.
- `.env.example` holds placeholder values so the project is reproducible — copy
  it to `.env` and fill in real values.
- `.gitignore` ignores `.env` / `.env.*` (except `.env.example`), `node_modules/`,
  `.next/`, and local DB files.
- When deploying, set both env vars in the host's settings (e.g. Vercel), not in
  the repo. First-time DB setup: run `supabase/schema.sql` once in the Supabase
  SQL Editor (see `docs/` for the dated migration write-up).

## Tech stack

- **Next.js 15** (App Router) + **React 19**, **TypeScript** (strict)
- **Tailwind CSS 3** with a custom design system (see below)
- **Fonts:** Fraunces (display serif) + Hanken Grotesk (body), via `next/font`
- **Supabase (Postgres)** via the `postgres` driver — hosted DB, no native build
- **Gemini API** (`gemini-2.5-flash-lite`) for AI nutrition lookup + search fallback
- **Food catalogue** seeded from **USDA FoodData Central (SR Legacy)** + a curated
  Indian core (~7.8k rows) — see `scripts/`

## Folder structure

```
app/
  layout.tsx              Root layout, fonts, metadata
  page.tsx                Single-page client component (all state + flows)
  globals.css             Tailwind layers + paper background + base type
  api/log/route.ts        GET (by date) + POST (add, with meal)
  api/log/[id]/route.ts   PATCH (change qty) + DELETE
  api/foods/route.ts      GET ?q= — catalogue search (Supabase first, Gemini fallback)
  api/nutrition/text/route.ts    POST description -> AI nutrition
  api/nutrition/image/route.ts   POST photo -> AI nutrition
components/
  AppHeader.tsx           Brand wordmark + live date & clock
  DailySummary.tsx        Calorie goal hero: progress bar + editable goal + macros
  MacroBars.tsx           Protein/carbs/fat bars vs. target
  MealSection.tsx         One meal group (icon, subtotal, entries, empty state)
  FoodEntryCard.tsx       Card-style logged entry + serving (qty) stepper
  MealPicker.tsx          Breakfast/Lunch/Dinner/Snack target selector
  SearchBar / FoodCard / FoodList   Quick-add catalog
  TextPanel / PhotoPanel                   AI add flows
  PendingPanel / PendingItemCard / ServingStepper   Review-before-commit editor
  Spinner.tsx / ErrorNote.tsx              Loading + error UI
lib/
  types.ts                Food, LogEntry, CatalogFood, PendingItem, etc.
  db.ts                   Supabase client + queries: log, catalogue, AI cache/usage
  foods.ts                Static curated Indian core (also the empty-search browse)
  gemini.ts               Gemini REST wrapper + nutrition schema/types
  nutrition.ts            Goal/macro targets, traffic-light, meal-by-hour, validateNutrition
  ai-guard.ts             In-memory rate limit + short-window request de-dup
  image.ts                Client-side photo downscale/compress before upload
scripts/
  gen-foods-seed.mjs      Builds foods_seed.json from USDA SR Legacy + Indian core
  seed-foods.mjs          Idempotently seeds the foods table (node scripts/seed-foods.mjs)
  foods_seed.json         Generated seed data (~7.8k foods)
supabase/schema.sql       Postgres schema — run once in the Supabase SQL Editor
docs/                     Dated decision logs
PLAN.md                   What we built / improved / roadmap
```

## Design system

Defined in `tailwind.config.ts` + `globals.css`. **Aesthetic: warm editorial
wellness** — a calm "nutrition journal", not a generic dashboard.

- **Canvas:** warm paper (`paper` `#FBF8F2`) with a faint two-tone radial grain;
  white `surface` cards.
- **Ink:** `ink` / `ink-2` / `ink-3` for primary/secondary/faint text.
- **Brand:** deep matcha green (`matcha`, `matcha-deep`, `matcha-soft/tint`).
- **Macros:** `protein` (green), `carbs` (honey), `fat` (clay) — used everywhere
  macros appear so the colors are learnable.
- **Progress states:** `good` (green) / `warn` (amber) / `over` (red).
- **Type:** `font-display` (Fraunces) for the wordmark and big numbers;
  `font-body` (Hanken Grotesk) elsewhere. `.nums` enables tabular figures.
- **Motion:** `animate-fade-up` / `animate-scale-in`; meal sections stagger in.
- Rounded `2xl`/`3xl` cards, `shadow-card` / `shadow-lift`.

## Architecture notes

- **Data flow:** `app/page.tsx` (client) fetches `GET /api/log?date=<today>` on
  mount to restore the day. All three add modes funnel through one
  `logFood(payload)` → `POST /api/log`, so everything persists identically.
  Totals and per-meal groups are derived with `useMemo`.
- **Meal categories:** every entry has a `meal`. The add tool has a `MealPicker`
  that defaults to the meal for the current hour (`mealForHour`); each
  `MealSection`'s "+ Add" re-targets the picker and scrolls to it.
- **Editable serving size:** each `FoodEntryCard` has a − / qty / + stepper.
  Changing it `PATCH`es `/api/log/[id]` with the new `qty` (validated 1–99),
  updating the row's quantity. The UI updates optimistically and rolls back on
  failure; the card's steppers disable while the request is in flight. Calories
  and macros are stored per-serving and multiplied by `qty` for display/totals.
- **Daily goal:** stored in `localStorage` (`calorie-tracker.goal`, default
  2000), editable in the hero. Macro gram targets are derived from the goal
  (`macroTargets`, 30/45/25 split). The calorie bar color comes from
  `calorieState` (green <90%, amber 90–100%, red >100%).
- **Catalogue search (two layers):** quick-add with an empty box browses the
  curated Indian core (`lib/foods.ts`, no fetch). Typing hits
  `GET /api/foods?q=` → `searchFoods` queries Supabase first (tokenized: every
  word must appear, so "chicken breast" matches USDA's comma-ordered names). On a
  **miss**, it falls back to Gemini for that single food, **saves** the result to
  the `foods` table (`source='gemini'`, `reviewed=false`) via `addCatalogFood`,
  and returns it — so the catalogue grows and the same food isn't re-queried. The
  unique `lower(name)` index prevents duplicates. `reviewed=false` is the review
  queue for AI-sourced entries (seed rows are `reviewed=true`).
- **AI lookup:** `lib/gemini.ts` uses Gemini structured output
  (`responseSchema`) so responses are valid JSON. The text/image routes return a
  `NutritionResult`; errors are mapped to HTTP codes.
- **Review before commit:** all three add paths funnel into one `pending`
  list rendered by `PendingPanel`. Quick-add/search **append** an item;
  text/photo **replace** with the detected items. Each `PendingItemCard` is fully
  editable — name, serving label, a `ServingStepper` (0.5 steps), and macro
  inputs that hold the *totals* and recompute live as servings change. **Nothing
  is written** until "Add meal", which loops `logFood` (baking the multiplier into
  the serving label). AI-sourced items run `validateNutrition` and show ⚠ flags
  for implausible values (absurd calories, macro/calorie mismatch) while staying
  editable. Photo results with multiple foods can be edited/removed individually.
- **Cost & abuse guardrails** (every Gemini path): a persistent Supabase cache
  (`ai_cache`, keyed by normalized text or image sha256) means the same input
  never bills twice; an in-memory short-window de-dup (`lib/ai-guard.ts`) shares
  concurrent identical calls; a per-IP fixed-window rate limit (20/min) guards
  the API paths (local search hits stay unthrottled); photos are downscaled to
  ~1024px JPEG client-side (`lib/image.ts`) before upload; and `recordAiUsage`
  increments a daily `ai_usage` counter so real call volume is visible.
- **Database:** `lib/db.ts` connects to Supabase Postgres via `DATABASE_URL`
  using the `postgres` driver (tagged-template queries → parameterized + safe).
  All query functions are **async**; the API routes `await` them. The client is
  cached on `globalThis` to avoid exhausting pooler connections across dev hot
  reloads. The schema is created once via `supabase/schema.sql`, not at runtime.

### Why Supabase + the `postgres` driver

Serverless hosts (Vercel) have an ephemeral filesystem, so the old local SQLite
file couldn't persist. Supabase gives a hosted Postgres on the free tier. The
lightweight `postgres` driver keeps the raw-SQL style of the old code. Routes set
`runtime = "nodejs"` because the driver uses TCP sockets (not available on Edge).
We connect through Supabase's **Transaction pooler** (port 6543), so the client
uses `prepare: false` (transaction-mode pooling can't reuse prepared statements)
and `ssl: "require"`.

## Data model

`log_entries` (Postgres): `id` (bigint identity), `food_name`, `serving`,
`calories`, `protein`, `carbs`, `fat` (real), `qty` (int, default 1), `meal`
(Breakfast/Lunch/Dinner/Snack, default Snack), `day` (text YYYY-MM-DD, indexed),
`created_at` (timestamptz). Defined in `supabase/schema.sql`.

`foods` (catalogue): `id`, `name` (unique on `lower(name)`), `serving`,
`calories`, `protein`, `carbs`, `fat`, `source` ('seed' | 'gemini'), `reviewed`
(bool), `created_at`. Seeded by `scripts/seed-foods.mjs`; grown by the search
fallback. `lib/foods.ts` stays as the curated Indian core for the empty-search
browse (and is merged into the seed).

`ai_cache`: `kind` ('text'|'image'), `cache_key` (unique with kind), `result`
(jsonb), `created_at` — caches Gemini responses. `ai_usage`: `day`, `route`
('text'|'image'|'foods'), `calls` — rough daily counter of real API calls.

## Next steps

Not built yet — natural follow-ups:

- **Review AI-sourced foods** — an admin view over `foods WHERE NOT reviewed` to
  vet/correct Gemini entries (flip `reviewed` once checked).
- **Food history & charts** — weekly/monthly calorie & macro trends.
- **User preferences** — custom macro split, units, theme, persisted server-side.
- **Barcode scanning** — look up packaged foods by barcode.
- Date navigation; custom foods; a test suite.
