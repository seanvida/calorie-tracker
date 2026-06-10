# 2026-06-10 — Day nav, History, Trends, Profile + mobile-first PWA, deployed

Turned the single "today" page into a four-tab app, added a Supabase-backed
profile that drives the daily goal, made it installable, and deployed.

## Navigation & views (`BottomNav` → `view` state in `page.tsx`)

- **Day** — `DateNav` (prev/next + native date picker, capped at today) drives a
  `selectedDate`; the log re-fetches per day (`GET /api/log?date=`), and new
  entries are added to whichever day you're viewing. Entries stay grouped by meal.
- **History** — `GET /api/summary` returns per-day totals (`getDailySummaries`,
  `GROUP BY day`). `HistoryView` lists logged days with a calorie bar + macros;
  tapping a day opens it in the Day view.
- **Trends** — `TrendsView` fills the summary into a continuous date range and
  renders two CSS-bar charts: **calories vs goal** (bar color = `calorieState`,
  dashed goal line) and **macro breakdown** (stacked by kcal contribution, P/C/F
  colors), plus "days logged" + "avg calories" stats.
- **Profile** — `ProfileView` edits name, calorie goal, explicit macro targets,
  and optional body stats. `suggestGoal` (Mifflin-St Jeor BMR × activity) offers a
  goal from height/weight/age/sex/activity.

## Profile drives the goal (`/api/profile`, `profile` table, single row id=1)

The daily goal + macro targets now come from the profile in Supabase, not
`localStorage`. `page.tsx` loads it on mount; the hero's goal edit `PUT`s it back.
Macro targets resolve via `resolveMacroTargets` (explicit profile targets, else
the 30/45/25 split of the goal), and flow into `DailySummary`/`MacroBars`.

## Mobile-first audit

- Fixed bottom `BottomNav` (56px tap targets, `env(safe-area-inset-bottom)`);
  content gets `pb-24` so nothing hides behind it.
- Inputs/steppers are ≥40px; charts are responsive flex bars (no overflow);
  the date picker uses the native control. `viewport` sets `viewportFit: cover`.

## PWA (installable)

- `public/manifest.webmanifest` (standalone, theme `#3E6F48`, icons).
- Icons generated with **no dependencies** by `scripts/gen-icons.mjs` (a raw PNG
  encoder via `node:zlib`) → `icon-192/512`, maskable, and `apple-touch-icon`.
- `public/sw.js` registered by `PwaRegister`: network-first app shell, cache-first
  static assets, and **never caches `/api`** (logged data stays fresh).
- `app/layout.tsx` wires the manifest, theme color, and apple-web-app meta.

## Deploy

Pushed to `main` → Vercel auto-deploys. Env vars (`GEMINI_API_KEY`,
`DATABASE_URL`) were already set in the Vercel project from the earlier DB
migration, so no dashboard changes were needed this round. New tables
(`profile`) were applied to the shared Supabase DB, so production picked them up
immediately.

## Verified

- `npx tsc --noEmit` + `npm run build` pass (routes now include `/api/profile`,
  `/api/summary`).
- APIs: profile GET/PUT round-trips; summary returns the 30-day range.
- Browser (390px): all four tabs switch; Trends renders both charts; Profile
  loads saved values and the suggest-goal button activates with stats filled.
