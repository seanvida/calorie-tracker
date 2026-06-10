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
same data on every device, surviving deploys. Four tabs: **Day** (with
prev/next + date-picker navigation), **History**, **Trends** (calorie & macro
charts), and **Profile** (goal + macro targets that drive the daily visuals). AI
calls are guarded by caching, de-dup, image compression, and rate limiting.
**Mobile-first, installable PWA, deployed on Vercel.** No login, no accounts (yet).

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
  api/nutrition/{text,image}/route.ts   POST description/photo -> AI nutrition
  api/profile/route.ts    GET + PUT the single-user profile
  api/summary/route.ts    GET ?from&to — per-day totals (history + trends)
components/
  AppHeader / DailySummary / MacroBars / MealSection / FoodEntryCard   Day view
  MealPicker / SearchBar / FoodCard / FoodList   Quick-add catalog
  TextPanel / PhotoPanel    AI add flows
  PendingPanel / PendingItemCard / ServingStepper   Review-before-commit editor
  BottomNav / DateNav / HistoryView / TrendsView / ProfileView   Tabs + views
  PwaRegister.tsx           Service-worker registration
  Spinner.tsx / ErrorNote.tsx   Loading + error UI
lib/
  types.ts    Food, LogEntry, CatalogFood, PendingItem, Profile, DaySummary
  db.ts       Supabase queries: log, catalogue, AI cache/usage, profile, summaries
  foods.ts    Static curated Indian core (also the empty-search browse)
  gemini.ts   Gemini REST wrapper + nutrition schema/types
  nutrition.ts  Goal/macro targets, traffic-light, validateNutrition, suggestGoal
  ai-guard.ts / image.ts / date.ts   Rate-limit+de-dup / image compress / date helpers
scripts/      gen-foods-seed.mjs, seed-foods.mjs, foods_seed.json, gen-icons.mjs
public/       manifest.webmanifest, sw.js, icon-*.png (PWA assets)
supabase/schema.sql   Postgres schema — run once in the Supabase SQL Editor
docs/         Dated decision logs   ·   PLAN.md   What we built + roadmap
```

## Design system

Defined in `tailwind.config.ts` + `globals.css`. **Aesthetic: warm editorial
wellness** — a calm "nutrition journal", not a generic dashboard.

- **Canvas:** warm `paper` `#FBF8F2` (faint radial grain); white `surface` cards.
  Text `ink`/`ink-2`/`ink-3`. Brand: deep matcha (`matcha`/`matcha-deep`/`-soft`/`-tint`).
- **Macros:** `protein` (green), `carbs` (honey), `fat` (clay) — learnable colors,
  reused in the trend charts. **Progress:** `good`/`warn`/`over` (green/amber/red).
- **Type:** `font-display` (Fraunces) for wordmark + big numbers; `font-body`
  (Hanken Grotesk) elsewhere; `.nums` = tabular figures. Rounded `2xl`/`3xl` cards,
  `shadow-card`/`shadow-lift`, `animate-fade-up`/`animate-scale-in`.

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
- **Views & navigation:** `page.tsx` switches between four tabs via `BottomNav`
  (`view` state). **Day** uses `DateNav` (prev/next + native date picker, capped
  at today) and a `selectedDate` — the log re-fetches per day, and adds target
  that day. **History** (`/api/summary`) lists logged days; tapping one opens it.
  **Trends** renders two CSS-bar charts (calories vs goal with a goal line; macros
  stacked by kcal contribution) over a continuous date range. **Profile** edits
  name/goal/macro targets (+ optional body stats → `suggestGoal`, Mifflin-St Jeor).
- **Daily goal & macros come from the profile** (Supabase, single row id=1, via
  `/api/profile`). The hero's goal edit also `PUT`s the profile. Macro targets are
  `resolveMacroTargets` (explicit profile targets, else the 30/45/25 goal split).
  The calorie bar color comes from `calorieState` (green <90%, amber 90–100%, red >100%).
- **PWA:** `public/manifest.webmanifest` + generated icons + `public/sw.js`
  (registered by `PwaRegister`; network-first shell, never caches `/api`) make it
  installable. `app/layout.tsx` sets the manifest, theme color, and apple-touch icon.
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
- **Database:** `lib/db.ts` connects to Supabase Postgres via `DATABASE_URL` with
  the `postgres` driver (tagged-template queries → parameterized + safe). All query
  functions are **async** (routes `await` them); the client is cached on
  `globalThis`. We use Supabase's **Transaction pooler** (port 6543), so
  `prepare: false` + `ssl: "require"`; routes pin `runtime = "nodejs"` (TCP, not
  Edge). Chosen over local SQLite because serverless has an ephemeral filesystem.
  Schema lives in `supabase/schema.sql` (run once), not created at runtime.

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
(jsonb) — caches Gemini responses. `ai_usage`: `day`, `route`, `calls` — daily
call counter. `profile`: single row (`id`=1) — `name`, `calorie_goal`,
`{protein,carbs,fat}_target`, `height_cm`/`weight_kg`/`age`/`sex`/`activity`.

## Deploy

Live on **Vercel** (auto-deploys on push to `main`). Env vars set in the Vercel
project: `GEMINI_API_KEY`, `DATABASE_URL`. PWA-installable from the live URL.

## Next steps

- **Review AI-sourced foods** — admin view over `foods WHERE NOT reviewed`.
- **Barcode scanning**; **accounts / multi-user**; a **native app** wrapper.
- **User preferences** (units, theme); custom foods; a test suite.
