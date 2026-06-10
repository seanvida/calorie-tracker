# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What this is

**Calorie Tracker** is a polished single-page calorie & macro tracker for
everyday Indian food. You log meals three ways — quick-add from a 60+ food
catalog, a plain-English description, or a meal photo — and watch a daily calorie
goal, a traffic-light progress bar, and macro bars update live. Entries are
grouped by meal (Breakfast / Lunch / Dinner / Snack), each with an **editable
serving count**, and persist in a hosted **Supabase (Postgres)** database — the
same data on every device, surviving deploys. No login, no accounts (yet).

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
- **Gemini API** (`gemini-2.5-flash-lite`) for AI nutrition lookup, via REST `fetch`

## Folder structure

```
app/
  layout.tsx              Root layout, fonts, metadata
  page.tsx                Single-page client component (all state + flows)
  globals.css             Tailwind layers + paper background + base type
  api/log/route.ts        GET (by date) + POST (add, with meal)
  api/log/[id]/route.ts   PATCH (change qty) + DELETE
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
  TextPanel / PhotoPanel / AiResultPanel   AI add flows
  Spinner.tsx / ErrorNote.tsx              Loading + error UI
lib/
  types.ts                Food, LogEntry, MealCategory, etc.
  db.ts                   Supabase/Postgres client + queries (postgres driver)
  foods.ts                Static catalog of 60+ Indian foods
  gemini.ts               Gemini REST wrapper + nutrition schema/types
  nutrition.ts            Goal/macro targets, traffic-light state, meal-by-hour
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
- **AI lookup:** `lib/gemini.ts` uses Gemini structured output
  (`responseSchema`) so responses are valid JSON. Both routes return the same
  `NutritionResult`; `AiResultPanel` shows items with checkboxes to confirm
  before logging. Totals recomputed server-side; errors mapped to HTTP codes.
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

The food **catalog** (`lib/foods.ts`) is static TS data, not in the DB; only
logged entries are persisted (nothing to seed in the DB).

## Next steps

Not built yet — natural follow-ups:

- **Deploy to Vercel** — DB is now hosted (Supabase), so set `GEMINI_API_KEY`
  and `DATABASE_URL` in Vercel's env settings and ship.
- **Food history & charts** — weekly/monthly calorie & macro trends.
- **User preferences** — custom macro split, units, theme, persisted server-side.
- **Barcode scanning** — look up packaged foods by barcode.
- Editable quantity/serving on entries; date navigation; custom foods; a test suite.
