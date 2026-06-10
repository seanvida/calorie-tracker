# 2026-06-09 — Ralph Loop: Design Polish to Product Quality

Fourth session. Ran an iterative **review → improve → verify** loop (the "Ralph
Loop") to take the working-but-plain app to professional product quality, using
the **frontend-design skill** as the quality gate each round. Three rounds.

## Where it started

The app worked but looked like a tutorial: generic Inter font, emerald-on-slate
Tailwind defaults, a tiny "Today's Log" above an always-expanded 66-item catalog
that made the page a mile long. No daily goal, no macro visuals, no meal grouping.

## Aesthetic direction chosen

**"Thali" — warm editorial wellness.** Renamed the app to *Thali* (an Indian
plate/meal — authentic to the Indian-food focus). Warm paper canvas, deep matcha
accent, **Fraunces** serif for display numbers + **Hanken Grotesk** body
(deliberately avoiding generic Inter), card-based layout, tabular numerals.

## Round 1 — design system + required features

Built the token system (`tailwind.config.ts`, `globals.css`) and added every
requested feature:

- **AppHeader** — wordmark + logo + live date **and ticking clock**.
- **DailySummary** — big calorie figure vs. an **editable daily goal**
  (localStorage) with a **traffic-light progress bar** (green/amber/red via
  `calorieState`) and a remaining/over chip.
- **MacroBars** — protein/carbs/fat bars vs. targets derived from the goal, each
  in its own learnable color.
- **Meal categories** — `meal` column added to the DB (with a safe migration for
  the existing DB); `MealSection` groups entries under Breakfast/Lunch/Dinner/
  Snack with per-meal subtotals; `MealPicker` chooses the target meal (defaults
  to the current hour's meal).
- **Card-style entries** (`FoodEntryCard`) and a full restyle of every existing
  component to the new system.

## Round 1 verification (frontend-design skill)

Screenshotted desktop + mobile. Verdict: strong, cohesive, distinctive — passes
the "real product, not AI slop" bar. **Findings:**

1. The quick-add catalog renders all 66 foods expanded → page is enormous (the
   most "hackathon" issue).
2. `/ 2,000 kcal` wraps mid-phrase on mobile.
3. Meal icons faint/unclear (esp. Breakfast).
4. No orchestrated entrance motion.

## Round 2 — polish from findings

- **Contained the catalog** in a `max-h-[56vh]` scrollable panel — the page is
  now a sane length and reads like a product.
- Kept the goal phrase on one line (`flex-wrap` + `whitespace-nowrap`).
- Replaced meal icons with clear, distinct glyphs (sunrise / fork-knife /
  crescent / apple).
- Added **staggered fade-in** for meal sections + the hero.

## Round 2 verification → Round 3 — final detail pass

Re-screenshotted: mobile and desktop both clean, the constrained catalog fixed
the length problem, icons legible. Final small-details pass:

- `aria-pressed` on the meal picker and mode tabs (accessibility).
- Subtle **hover-lift** on entry cards.
- **Functional check (Playwright):** set target = Lunch, searched "samosa",
  added it from the catalog → it landed under **Lunch** and the subtotal +
  header totals updated. Confirmed `aria-pressed` state and meal-section "+ Add"
  re-targeting both work. No console errors (only a harmless favicon 404).

## How the design skill shaped the result

The skill's emphasis drove the concrete choices: **distinctive typography**
(Fraunces/Hanken over Inter), a **committed dominant palette** with sharp macro
accents (not timid evenly-distributed color), **atmosphere** (paper grain vs.
flat white), and **one orchestrated page-load** (staggered reveals) over
scattered effects. Each round's screenshot was judged against its checklist —
typography, color/theme, motion, spatial composition, and the "would someone
remember this?" test — and the findings fed the next round.

## Outcome

A polished, responsive, professional calorie tracker: branded header with live
clock, goal + traffic-light progress, macro visuals, meal-grouped card entries,
three add modes with loading/empty/error states, on warm editorial styling.
Verified on desktop (1200px) and mobile (390px), no console errors.

## Notes

- A realistic demo day is seeded in `data/calories.db` so the app looks alive on
  first open; entries can be deleted with the × on each card.
- Still no automated tests; verification is manual (Playwright + curl).
