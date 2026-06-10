# Calorie Tracker — Project Plan

**Calorie Tracker** is a calm, professional calorie & macro tracker for everyday
Indian food. Single page, no accounts, local-first. Built with Next.js 15, React
19, TypeScript, Tailwind, `node:sqlite`, and the Gemini API.

---

## What We Built

- **Three ways to log food**
  - *Quick add* — search a catalog of 60+ common Indian foods and tap to add.
  - *Describe* — type a meal in plain English; Gemini estimates calories & macros.
  - *Photo* — upload/take a meal photo; Gemini identifies the foods.
  - The AI modes show every identified item with checkboxes to confirm before logging.
- **A real local database** — entries persist in SQLite (`node:sqlite`) across
  refreshes and restarts; one `POST /api/log` path for all add modes.
- **Daily goal + traffic-light progress bar** — editable goal (saved locally),
  green / amber / red by how close you are.
- **Macro breakdown** — protein, carbs, fat bars vs. goal-derived targets, each
  in its own color.
- **Meal categories** — entries grouped under Breakfast / Lunch / Dinner / Snack
  with per-meal subtotals; a picker that defaults to the current time of day.
- **Branded, responsive UI** — "Calorie Tracker" header with a live date & clock,
  card-style entries (with an editable serving stepper), loading/empty/error
  states, on a warm editorial design system (Fraunces + Hanken Grotesk,
  matcha-on-paper palette).

## What We Improved

Took the app from a working tutorial-grade build to product quality over a
three-round **Ralph Loop** (review → improve → verify with the frontend-design
skill — full write-up in `docs/2026-06-09-ralph-polish.md`):

- **Rebranded & restyled** from generic Inter/emerald defaults to the distinctive
  the editorial-wellness system (custom fonts, palette, paper texture, motion).
- **Added the product features** that make it feel real: goal progress, macro
  visuals, meal grouping, live-clock header, card entries.
- **Fixed the biggest UX flaw** — the endless always-expanded catalog — by
  containing it in a scrollable panel, so the page is a sane length.
- **Polished the details** — mobile text wrapping, clearer meal icons, staggered
  entrance animation, hover-lift on cards, `aria-pressed` on segmented controls.
- **Verified end-to-end** on desktop and mobile via Playwright (meal-aware add,
  persistence, no console errors).

## Future Roadmap

- **Deploy to Vercel** — move persistence off the local SQLite file to a hosted
  DB (Turso/libSQL or Postgres), since serverless filesystems aren't durable.
- **Food history & charts** — weekly/monthly calorie & macro trends and streaks.
- **User preferences** — custom macro split, units, light/dark, server-synced.
- **Barcode scanning** — look up packaged foods by barcode.
- **Nice-to-haves** — editable quantity/serving on entries, date navigation,
  custom foods, and an automated test suite.
