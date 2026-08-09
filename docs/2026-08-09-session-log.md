# Session log — 2026-08-09: portions, saved foods, workouts, UX & perf

A large iteration driven by user feedback ("app works but tons of issues").
Sequenced **quick wins → features**, each batch shipped + deployed independently
(Vercel auto-deploys `main`). Migrations were run manually in the Supabase SQL
editor **before** the dependent deploy (migrate-first).

## Shipped (in order), with commits

1. **Quick wins** (`a47d76d`)
   - 0.25-step servings (`ServingStepper`); photo picker allows **library upload**
     (dropped forced `capture`); replaced the heavy empty-day hero with a slim
     inline prompt; `app/loading.tsx` skeleton; shared `lib/summaryCache.ts`
     (stale-while-revalidate) so History/Trends open instantly + prefetch on open.

2. **Gram-based portions (Phase 2a)** (`0cc5b2e`) — migrate-first
   - `foods` gained `kcal100/protein100/carbs100/fat100/portions(jsonb)/
     default_grams`. `lib/portions.ts` (parseGrams/toPer100/buildPortions/
     scaleFromPer100). `PendingItemCard` portion dropdown (+ custom grams);
     macros = per100 × grams/100 × servings. Static core + 7,797/7,806 seed rows
     backfilled from their serving gram weights (`scripts/gen-portions.mjs`,
     `seed-foods.mjs` upsert). Gemini returns a `grams` weight so AI foods get
     portions. Decision doc: `docs/2026-08-09-gram-based-portions.md`.
   - **Catalogue depth (#3):** chose **option C** for now — stay ~7.8k + AI grows
     on misses; the bulk import (option A: IFCT + OFF-India) is **deferred to the
     end** (see that doc + Next steps in `CLAUDE.md`).

3. **Saved custom foods (Phase 3)** (`5c37863`) — migrate-first
   - `saved_foods` table (per-user, RLS). `/api/saved-foods` (GET/POST) + `[id]`
     (DELETE). ★ Save on a review item (normalized to one serving, keeps gram
     data); shown under "★ Saved foods" in Quick-add (empty search). `sw.js`
     `CACHE` → `thali-v5`.

4. **Quick-add UX redesign** (`a8cfb51`) — client-only
   - Review/"Add meal" panel moved to the **top** of the add tool; search shows
     only the closest ~8 (`MAX_RESULTS`) and **clears after adding**; the full
     browse list is collapsed behind a "Browse common foods" toggle.

5. **Workouts (Phase 4)** (`052d1d5`) — migrate-first — *then reworked (see 7)*
   - `workout_entries` table. First version was **AI-estimated** (describe →
     Gemini). `DailySummary` net line + `TrendsView` burned chart; `/api/summary`
     merges burned per day.

6. **App-like zoom lock** (`79e664a`) — client-only
   - Viewport `maximumScale:1 userScalable:false` + `touch-action: manipulation`
     + `overscroll-behavior: none`. No pinch/double-tap zoom or rubber-band.

7. **Workout rehaul → static MET (not AI)** (`910495c`) — client-only, no migration
   - Replaced the AI describe→estimate flow with `lib/workouts.ts`: `ACTIVITIES`
     (MET table) + `INTENSITIES` (Light/Moderate/Vigorous) + `caloriesBurned(met,
     weightKg, minutes)`. `WorkoutSection` = activity/intensity/minutes → live
     calories (editable); weight pulled from the profile with an inline prompt if
     unset (saved via profile PUT). Deleted `/api/workouts/estimate` +
     `estimateWorkout`/schema from `lib/gemini.ts`. **No data erased** — existing
     rows/entries intact. Verified: Running/Moderate/30min@70kg = 343 kcal;
     Vigorous = 429.

8. **Performance pass** (`e5bd4f3`) — no migration
   - Diagnosis: open-lag is **server/data-bound** (Vercel Hobby + Supabase free
     cold starts), not the JS bundle (local prod load ~300 ms). Live `/` TTFB was
     ~0.4–1 s.
   - Fixes (all free): **`/api/bootstrap`** (profile + saved + 30-day summary) and
     **`/api/day`** (entries + workouts) → mount fires 2 requests (was 5), day-nav
     1 (was 2); summary seeds `summaryCache`. Cookie-based **`getSession()`** page
     gate (drops one auth round-trip). **Trimmed fonts** (no Fraunces italic;
     used weights only). **Keep-alive:** `/api/ping` (`select 1`) +
     `.github/workflows/keepalive.yml` cron (~14 min) so the free-tier project
     never auto-pauses. Full cold-start removal would need Supabase Pro — declined.

## Deferred / not done
- **Push reminders (#9)** — skipped by user (needs VAPID + Vercel env + cron).
- **Bulk catalogue import (Phase 2b, option A)** — at project end; needs local
  multi-GB dumps and a fixed local `.env` `DATABASE_URL` (`https:` → `postgresql://`).

## Testing notes / caveats
- Local `.env` has no Supabase auth keys, so localhost renders the app **un-gated**
  and all `/api/*` return 401 → auth-only loops (saved-foods, workouts save,
  search) can't be exercised locally; verified via typecheck, `next build`,
  Playwright on the un-gated UI, and asked the user to sanity-check on their phone.
- The **service worker can serve a stale bundle** in dev after prior runs —
  unregister it / clear caches (or hard-reload) when testing new client code.
- Migrate-first: run the `ALTER/CREATE TABLE` in Supabase before deploying any
  change whose queries read new columns/tables (else `/api/*` 500s in prod).
