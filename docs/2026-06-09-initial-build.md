# 2026-06-09 — Initial Build

Decision log for the first build of the Indian calorie tracker.

## What was built

A working single-page calorie tracker (Next.js + TypeScript + Tailwind) with:

- A **static catalog of 67 common Indian foods** (`lib/foods.ts`) across 8
  categories — grains & breads, dals & legumes, sabzis & paneer, non-veg, eggs,
  snacks & street food, dairy, fruits. Each food carries calories, protein,
  carbs, fat, and a human-readable serving size.
- A **live search bar** that filters the catalog by name or category.
- **Quick-add** buttons that log a food to today via the API.
- A **today's log** list with per-item calories/macros and delete buttons.
- A **sticky header** showing the running calorie total and P/C/F macro
  breakdown for the day.
- **Persistence** via an on-disk SQLite database (`data/calories.db`), so the
  log survives page refreshes and server restarts.
- API route handlers: `GET/POST /api/log`, `DELETE /api/log/[id]`.

Verified end-to-end: home page returns 200; POST inserts and returns the row;
GET re-reads persisted rows (refresh-survival proof); DELETE removes them; the
SQLite file is created on first write.

## Technical choices & rationale

### Next.js App Router + Route Handlers
Required by the brief. The App Router's Route Handlers give a clean place for
the data API without a separate backend. The main page is a client component so
search and optimistic add/delete feel instant.

### Persistence: `node:sqlite` instead of `better-sqlite3`
The plan specified `better-sqlite3`. In practice it **failed to install**: there
is no prebuilt binary for the installed **Node 26**, and compiling from source
errored against the new V8 headers (`node-gyp` build failure).

Rather than downgrade Node or fight native toolchains, I switched to
**`node:sqlite`**, Node's built-in SQLite module (stable-ish since Node 22).
Benefits:
- Same outcome the brief asked for — a real, on-disk *local database* that
  persists across refreshes (not `localStorage`).
- Zero native build step and zero extra dependencies.
- Near-identical synchronous API (`DatabaseSync`, `prepare`, `run`, `all`).

Trade-off: it requires the Node.js runtime, so the route handlers declare
`export const runtime = "nodejs"` (the builtin isn't available on Edge). This is
a non-issue for local `npm run dev`.

### Why a database at all (vs. localStorage)
The brief explicitly asked to "save the food log in a local database." SQLite is
a genuine database file on disk, independent of the browser, and is trivial to
extend later (multiple days are already indexed by `day`). `localStorage` would
have met "persists across refreshes" but not "local database."

### Data model: catalog static, only entries persisted
The 67-food catalog is shipped as TypeScript data, not seeded into the DB. Only
*logged entries* live in SQLite. This keeps the catalog easy to edit/extend in
code and keeps the DB small and purely user-data.

Each entry stores per-serving macros plus a `qty` column (default 1). Totals
multiply by `qty`, so a quantity stepper can be added later with no schema
change.

### Dates in local time
A day is keyed `YYYY-MM-DD` using `toLocaleDateString("en-CA")` so "today"
follows the user's local calendar rather than UTC.

### Styling
Plain Tailwind with a small emerald/slate palette and a custom `brand` color in
`tailwind.config.ts`. No component library, to keep the single page light.

## Notable deviations from the plan

- **`better-sqlite3` → `node:sqlite`** (see above). `next.config.ts` no longer
  needs `serverExternalPackages` since there's no native package to externalize.
- Catalog grew to **67 foods** (plan said 50+).

## Known limitations / next steps

- Add quantity is always 1 from the UI (schema already supports more).
- No daily goal, no date navigation, no custom-food entry yet.
- The `GEMINI_API_KEY` placeholder in `.env` is unused — earmarked for a future
  natural-language food-logging feature.
- No automated tests or linting configured.
