# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What this is

**Calorie Tracker** is a polished single-page calorie & macro tracker for
everyday Indian food. You log meals three ways — quick-add from a **searchable
catalogue of thousands of foods** (Indian + everyday + packaged, with an AI
fallback that grows the catalogue on misses), a plain-English description, or a
meal photo — and watch a daily calorie goal, a traffic-light progress bar, and
macro bars update live. **Nothing is logged until you review and edit it** in a
preview card (name, a **portion dropdown** + **0.25-step servings** with live
**gram-based** recompute, macros). Entries are grouped by meal (Breakfast / Lunch
/ Dinner / Snack), each with an **editable serving count**, and persist in a
hosted **Supabase (Postgres)** database — the same data on every device,
surviving deploys. You can also **save foods** to re-log in one tap, and **log
workouts** (static activity + minutes → MET-based calories burned, surfaced as a
daily **net** number + a burned trend). Four tabs: **Day** (with prev/next +
date-picker navigation), **History**, **Trends** (calorie, macro & burned
charts), and **Profile** (goal + macro targets that drive the daily visuals). AI
calls are guarded by caching, de-dup, image compression, and rate limiting.
**Mobile-first, installable PWA, deployed on Vercel.** **Per-user accounts** via
Google sign-in (Supabase Auth) — each person's log & profile are private (RLS).

## Run it

```bash
npm install      # first time only
npm run dev      # Next.js at http://localhost:3000
```

## Environment & secrets

`.env` (gitignored; `.env.example` has placeholders). Required: `GEMINI_API_KEY`,
`DATABASE_URL` (Supabase **Transaction pooler**, port 6543), and
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (for Google sign-in;
public/anon — isolation is enforced by server session checks + RLS). No keys
hardcoded. `.gitignore` covers `.env*` (except the example), `node_modules/`,
`.next/`. On a fresh DB run `supabase/schema.sql` once; set all four env vars in
Vercel. Auth setup (Google OAuth client + Supabase provider) is in `docs/`.

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
  layout.tsx              Root layout, fonts, metadata, PWA register
  page.tsx                Server auth-gate → redirects to /login or renders Home
  login/page.tsx          Google sign-in screen
  auth/callback/route.ts  OAuth code → session exchange
  globals.css             Tailwind layers + paper background + base type
  api/bootstrap             GET: profile + saved foods + 30-day summary (one open call)
  api/day                   GET: a day's entries + workouts (one nav call)
  api/log, api/log/[id], api/foods, api/nutrition/{text,image},
  api/profile, api/summary   Route handlers (all require a signed-in user)
  api/saved-foods, api/saved-foods/[id]   Saved custom foods (GET/POST/DELETE)
  api/workouts, api/workouts/[id]         Workout log (GET by date / POST / DELETE)
  api/ping                  Public keep-alive (`select 1`) for the free-tier DB
middleware.ts             Refreshes the Supabase session on each request
components/
  Home.tsx                The single-page app (all client state + flows)
  AppHeader / DailySummary / MacroBars / MealSection / FoodEntryCard   Day view
  MealPicker / SearchBar / FoodCard / FoodList / SavedFoodsSection   Quick-add catalog
  TextPanel / PhotoPanel    AI add flows
  PendingPanel / PendingItemCard / ServingStepper   Review-before-commit editor
  WorkoutSection            Static MET workout logger (Day view)
  BottomNav / DateNav / HistoryView / TrendsView / ProfileView   Tabs + views
  Onboarding / InviteButton / SignOutButton   First-run, invite, sign-out
  PwaRegister.tsx           Service-worker registration
  Spinner.tsx / ErrorNote.tsx   Loading + error UI
lib/
  supabase/{server,client}.ts   @supabase/ssr clients   ·   auth.ts  getUserId()
  types.ts    Food, LogEntry, CatalogFood, PendingItem, Profile, DaySummary,
              Per100/Portion/GramBased, SavedFood, WorkoutEntry
  db.ts       Supabase queries (all user-scoped): log, catalogue, cache, profile,
              saved foods, workouts, getSummaryDays
  foods.ts    Static curated Indian core (enriched with gram-based portions)
  portions.ts   parseGrams / toPer100 / buildPortions / scaleFromPer100 (pure)
  workouts.ts   Static MET activity table + caloriesBurned()
  summaryCache.ts  Shared stale-while-revalidate cache for History/Trends
  gemini.ts   Gemini REST wrapper + nutrition schema/types
  nutrition.ts  Goal/macro targets, traffic-light, validateNutrition, suggestGoal
  ai-guard.ts / image.ts / date.ts   Rate-limit+de-dup / image compress / date helpers
scripts/      gen-foods-seed.mjs, gen-portions.mjs, seed-foods.mjs, foods_seed.json, gen-icons.mjs
public/       manifest.webmanifest, sw.js, icon-*.png (PWA assets)
supabase/schema.sql   Postgres schema — run once in the Supabase SQL Editor
.github/workflows/keepalive.yml   Cron ping (~14 min) so the free-tier DB never pauses
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

- **Auth & per-user isolation:** Google sign-in via Supabase Auth (`@supabase/ssr`).
  `middleware.ts` refreshes+validates the session (`getUser()`) on each request;
  `app/page.tsx` (server) gates with the cookie-based `getSession()` (no network
  round-trip) and redirects to `/login` when there's no session. `/auth/callback`
  exchanges the OAuth code. Every route handler resolves the user with
  `getUserId()` (`lib/auth.ts`, uses `getUser()`) and returns 401 if absent;
  **every DB query is scoped by `user_id`** (the authoritative isolation, since
  the pooled service connection bypasses RLS — RLS is the backstop).
  `foods`/`ai_cache`/`ai_usage` stay shared. If auth env vars are unset,
  `authConfigured()` lets the app fall back to un-gated (pre-cutover only).
- **Data flow (batched for fewer round-trips):** on open, `Home` fires **two**
  requests in parallel — `GET /api/bootstrap` (profile + saved foods + 30-day
  summary, which seeds the History/Trends `summaryCache`) and `GET /api/day?date=`
  (that day's entries + workouts). Day prev/next re-fetches only `/api/day` (one
  call). All three add modes funnel through one `logFood(payload)` → `POST
  /api/log`. Totals, per-meal groups, and burned/net are derived with `useMemo`.
- **Meal categories:** every entry has a `meal`. The add tool has a `MealPicker`
  that defaults to the meal for the current hour (`mealForHour`); each
  `MealSection`'s "+ Add" re-targets the picker and scrolls to it.
- **Editable serving size:** `FoodEntryCard`'s − / qty / + stepper `PATCH`es
  `/api/log/[id]` (qty 1–99, optimistic + rollback); macros are stored per-serving
  and multiplied by `qty` for display/totals.
- **Views & navigation:** `page.tsx` switches between four tabs via `BottomNav`
  (`view` state). **Day** uses `DateNav` (prev/next + native date picker, capped
  at today) and a `selectedDate` — the log re-fetches per day, and adds target
  that day. **History** (`/api/summary`) lists logged days; tapping one opens it.
  **Trends** renders two CSS-bar charts (calories vs goal with a goal line; macros
  stacked by kcal contribution) over a continuous date range. **Profile** edits
  name/goal/macro targets (+ optional body stats → `suggestGoal`, Mifflin-St Jeor).
- **Daily goal & macros come from the profile** (Supabase `profiles`, one row per
  user, via `/api/profile`). The hero's goal edit also `PUT`s the profile. Macro targets are
  `resolveMacroTargets` (explicit profile targets, else the 30/45/25 goal split).
  The calorie bar color comes from `calorieState` (green <90%, amber 90–100%, red >100%).
- **First-run & empty states:** a skippable 3-step `Onboarding` overlay shows
  when `profile.onboarded` is false (what the app does → name + goal → 3 ways to
  add); finishing/skipping flips `onboarded` (preserved by `COALESCE` on saves) so
  it never returns. Empty Day/History/Trends render friendly prompts (not blank
  screens); a dismissible nudge appears while the goal is still the default 2000.
- **Invite:** `InviteButton` opens the device share sheet (`navigator.share`)
  with `window.location.origin`, falling back to clipboard copy. No tokens.
- **PWA:** `public/manifest.webmanifest` + generated icons + `public/sw.js`
  (registered by `PwaRegister`; network-first shell, never caches `/api`; **bump
  the `CACHE` version on shell changes** — currently `thali-v5`). `app/layout.tsx`
  sets manifest + theme + icons and **locks the viewport** (`maximumScale: 1`,
  `userScalable: false`) + `globals.css` adds `touch-action: manipulation` +
  `overscroll-behavior: none` so the installed PWA doesn't pinch/double-tap-zoom
  or rubber-band like a web page.
- **Performance:** the app-open cost is server/data-bound (Vercel Hobby + Supabase
  free-tier cold starts), not the bundle. Mitigations: batched `/api/bootstrap` +
  `/api/day` (fewer round-trips), cookie-based page gate (`getSession`), trimmed
  fonts (no Fraunces italic), `app/loading.tsx` skeleton, the `summaryCache`, and a
  free **keep-alive** cron (`.github/workflows/keepalive.yml` → `/api/ping`) that
  stops the free-tier project auto-pausing and keeps the DB warm. Full cold-start
  removal would need Supabase Pro (deliberately not done — no paid tier).
- **Catalogue search (two layers):** empty box browses the curated Indian core
  (`lib/foods.ts`, no fetch); typing hits `GET /api/foods?q=` → `searchFoods`
  (tokenized Supabase search — "chicken breast" matches USDA's comma-ordered
  names). On a **miss** it falls back to Gemini and **saves** the food
  (`source='gemini'`, `reviewed=false`; unique `lower(name)`) so the catalogue
  grows and isn't re-queried. `reviewed=false` = the AI review queue.
- **AI lookup:** `lib/gemini.ts` uses Gemini structured output
  (`responseSchema`) so responses are valid JSON. The text/image routes return a
  `NutritionResult`; errors are mapped to HTTP codes.
- **Review before commit:** the `PendingPanel` renders at the **top** of the add
  tool (so a tapped item's "Add meal" is visible without scrolling). All add paths
  stage into it (quick-add/search append + clear the search; text/photo replace).
  Each `PendingItemCard` is fully editable — name, a **portion dropdown**
  (gram-based foods) or free-text serving, a **0.25-step** `ServingStepper`, macro
  totals that recompute live, and a **★ Save** action. **Nothing saves until "Add
  meal"** (loops `logFood`). AI items run `validateNutrition` → ⚠ flags while
  staying editable; photo items individually removable.
- **Gram-based portions:** foods carry per-100g macros (`per100`) + a `portions`
  list; `PendingItemCard`'s dropdown picks a portion (or custom grams) and macros
  = `per100 × grams/100 × servings` (`lib/portions.ts`). The static Indian core
  (`lib/foods.ts`) and the seeded catalogue are enriched from the gram weight in
  their serving labels (`scripts/gen-portions.mjs` backfills `foods`); AI results
  return a `grams` weight so AI-added foods get portions too. `foods` without
  per-100g fall back to a single editable serving (back-compat).
- **Search UX:** empty box → your **saved foods** + a collapsible "Browse common
  foods"; typing shows only the **closest ~8** matches (`MAX_RESULTS`), and adding
  clears the search. Two layers: local `searchFoods` first, Gemini fallback on a
  miss (saves `source='gemini'`, `reviewed=false`, unique `lower(name)`).
- **Saved foods:** `saved_foods` (per-user, RLS). ★ Save on a review item stores it
  normalized to one serving (keeping gram data); it appears under "★ Saved foods"
  in Quick-add (empty search) for one-tap re-log; ✕ removes. Loaded via
  `/api/bootstrap`; `lib/db` `getSavedFoods`/`createSavedFood`/`deleteSavedFood`.
- **Workouts (static, MET-based — not AI):** `WorkoutSection` on the Day view —
  pick an activity + intensity + minutes → `caloriesBurned = MET × weightKg ×
  hours` (`lib/workouts.ts`; weight from the profile, with an inline prompt if
  unset). Calories are editable. Persisted in `workout_entries` (per-user, RLS) via
  `/api/workouts`. `DailySummary` shows a **net** (eaten − burned) line and
  `TrendsView` a burned chart; the food goal/bar stays fixed. `/api/summary` +
  `/api/bootstrap` merge burned per day (`getSummaryDays`).
- **Cost & abuse guardrails** (every Gemini path): persistent Supabase cache
  (`ai_cache`, by normalized text / image sha256) so the same input never bills
  twice; in-memory short-window de-dup (`lib/ai-guard.ts`); per-IP rate limit
  (20/min) on the API paths; client-side ~1024px JPEG downscale (`lib/image.ts`)
  before upload; and a daily `ai_usage` counter (`recordAiUsage`) for visibility.
- **Database:** `lib/db.ts` connects to Supabase Postgres via `DATABASE_URL` with
  the `postgres` driver (tagged-template queries → parameterized + safe). All query
  functions are **async** (routes `await` them); the client is cached on
  `globalThis`. We use Supabase's **Transaction pooler** (port 6543), so
  `prepare: false` + `ssl: "require"`; routes pin `runtime = "nodejs"` (TCP, not
  Edge). Chosen over local SQLite because serverless has an ephemeral filesystem.
  Schema lives in `supabase/schema.sql` (run once), not created at runtime.

## Data model

`log_entries` (Postgres): `id` (bigint identity), `user_id` (uuid, indexed with
`day`), `food_name`, `serving`, `calories`, `protein`, `carbs`, `fat` (real),
`qty` (int, default 1), `meal` (default Snack), `day` (text YYYY-MM-DD),
`created_at`. RLS on. Rows with NULL `user_id` are pre-auth orphans (invisible).

`foods` (catalogue): `id`, `name` (unique on `lower(name)`), `serving`,
`calories`, `protein`, `carbs`, `fat`, `source` ('seed' | 'gemini'), `reviewed`
(bool), `created_at`, **plus gram-based cols** `kcal100/protein100/carbs100/fat100`
(real), `portions` (jsonb `[{label,grams}]`), `default_grams` (real) — nullable;
rows without them use the legacy single serving. Seeded by `scripts/seed-foods.mjs`
(backfilled by `gen-portions.mjs`); grown by the search fallback. `lib/foods.ts`
is the curated Indian core for the empty-search browse.

`saved_foods` (per-user, RLS): a user's single custom foods to re-log — same
shape as a catalogue row (name/serving/macros + gram-based cols) + `user_id`,
`created_at`.

`workout_entries` (per-user, RLS): `id`, `user_id`, `activity`, `duration_min`
(int, nullable), `calories` (real, burned), `notes`, `day` (text), `created_at`;
indexed `(user_id, day)`.

`profiles`: one row per user — `user_id` (PK = auth.uid()), `name`,
`calorie_goal`, `{protein,carbs,fat}_target`, body stats (incl. `weight_kg`, used
by the workout calculator), `onboarded`. RLS on. (The old single-row `profile`
table is deprecated/unused.) `ai_cache` (Gemini responses by text/image/**workout**
key); `ai_usage` (daily call counter) — shared.

## Deploy

Live on **Vercel** (auto-deploys on push to `main`). Env vars in the Vercel
project: `GEMINI_API_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. PWA-installable from the live URL. Google OAuth
must be enabled in the Supabase dashboard (provider + redirect URLs) — see `docs/`.

## Next steps

Two features are **deliberately deferred** (both free to build; parked by choice):
- **Push reminders (#9)** — web push to remind you to log meals. Needs `web-push`
  + VAPID keys, `push_subscriptions` table + reminder prefs on `profiles`, `push`/
  `notificationclick` handlers in `sw.js`, a subscribe flow + ProfileView settings,
  and a secret-guarded `/api/push/send` driven by a free external cron. Installed-
  PWA only (iOS 16.4+).
- **Bulk catalogue import (Phase 2b)** — the fuller "HealthifyMe-level" catalogue:
  IFCT 2017 + a filtered Open Food Facts India subset (~30–80k rows), skipping
  bulk USDA (already have SR). Needs the multi-GB dumps run locally (`scripts/`)
  once the local `.env` `DATABASE_URL` is fixed (it currently starts `https:` not
  `postgresql://`). Current strategy is "option C": AI grows the catalogue on
  misses. See `docs/2026-08-09-gram-based-portions.md`.

Other ideas: **Review AI-sourced foods** (admin over `foods WHERE NOT reviewed`);
**barcode scanning**; a **native app** wrapper; **prefs** (units, theme); tests;
optionally drop the deprecated `profile` table.
