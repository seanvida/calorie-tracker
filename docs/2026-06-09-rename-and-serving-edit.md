# 2026-06-09 — Rename to "Calorie Tracker" + Editable Serving Size

Fifth session. Three small, focused changes requested.

## 1. Renamed the app: Thali → Calorie Tracker

The product is now simply **Calorie Tracker**. Updated:

- `app/layout.tsx` — page `<title>` and description.
- `components/AppHeader.tsx` — wordmark now reads "Calorie Tracker" (dropped the
  redundant "calorie journal" tagline).
- `app/page.tsx` — footer text; and the goal `localStorage` key
  `thali.goal` → `calorie-tracker.goal`.
- `CLAUDE.md` and `PLAN.md` — name references.

The warm "editorial wellness" visual system (Fraunces + Hanken Grotesk, matcha-
on-paper, macro colors) is unchanged — only the name moved.

## 2. Editable serving size on logged entries

Each logged food can now have its **serving count changed in place**, instead of
being fixed at the quantity it was added with.

**UI** — `FoodEntryCard` gained a `− / qty / +` stepper (with accessible labels).
Calories and macros are stored *per serving*, so the card multiplies them by
`qty` for display; the daily total and the traffic-light progress bar update
live as you step.

**Persistence** — stepping calls a new endpoint:

- `PATCH /api/log/[id]` with `{ qty }` → validates `qty` is a whole number
  1–99 (400 otherwise), updates the row via `updateEntryQty(id, qty)` in
  `lib/db.ts`, and returns the updated entry.

**Loading & error handling** — `page.tsx`'s `updateQty` updates state
optimistically, disables that card's steppers while the request is in flight
(`updatingId`), and **rolls back** to the previous state if the request fails.
This mirrors the existing optimistic-delete pattern.

### Why a quantity stepper for "serving size"

Entries already stored per-serving macros plus a `qty` multiplier, so a stepper
is the most direct, lowest-risk way to "change the serving size" — 2× is a double
serving — with no schema change (the `qty` column already existed) and no
recomputation of the stored macro values. A free-text custom-serving editor is
noted as a future enhancement.

## Verification

- **Typecheck** clean.
- **API** — `PATCH /api/log/:id` with `qty:3` returns the updated entry; `qty:0`
  → 400 with a friendly message; reset to 1 → 200.
- **Browser (Playwright)** — stepped Poha from 1 → 3 servings: card showed
  750 kcal (250×3) with scaled macros, the hero rose to 1,994 kcal, and the
  progress bar correctly flipped **green → amber** (≥90% of goal). The `−`
  button is disabled at qty 1.
- **Persistence** — after a full page reload the change held (hero still
  "6 kcal left"); confirmed on disk: `Poha qty=3`, all 8 rows intact. Title bar
  reads "Calorie Tracker". No console errors (only a harmless favicon 404).

## Note

During development a batch of seeded demo rows was lost once — traced to repeated
manual `node` SQLite opens running concurrently with the dev server's cached
connection, not a fault in the app. Verified normal operation persists reliably
(POST and PATCH both survive reload and re-read from disk). The demo day was
re-seeded; entries can be removed with the × on each card.
