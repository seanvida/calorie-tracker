# 2026-06-09 — Wiring AI Nutrition Into the Frontend

Third build session (same date). Connects the existing Gemini backend routes to
the UI so users have **three ways to add food**: quick-add from the catalog, a
plain-English description, and a meal photo.

## What changed

### New components
- **`TextPanel.tsx`** — textarea (≤1000 chars, Cmd/Ctrl+Enter to submit) +
  "Look up nutrition" button for the *Describe* mode.
- **`PhotoPanel.tsx`** — file picker (`accept="image/*"`, `capture="environment"`
  so phones can shoot directly), an **image preview**, "Change photo", and an
  "Analyze photo" button.
- **`AiResultPanel.tsx`** — shared confirmation UI. Lists every food Gemini
  returned with a **checkbox each** (multi-select), shows per-item macros and
  the assumptions `note`, and an "Add N to log" / "Discard" action. Handles the
  empty case ("No foods were identified" + Try again).
- **`Spinner.tsx`** — inline loading spinner (used in all AI buttons).
- **`ErrorNote.tsx`** — friendly, dismissible error banner.

### `app/page.tsx` (refactored, not rewritten in spirit)
- Added a **tabbed "Add Food" section**: `quick` | `describe` | `photo`.
- Quick-add behavior is unchanged (catalog search + `+ Add`).
- Added AI state: `aiLoading`, `aiError`, `aiResult`, `aiSelected`, `aiAdding`,
  plus `description` and `imageFile` / `imagePreview`.
- Extracted a single **`logFood(payload)`** helper used by *all three* add
  paths → `POST /api/log`. This is why every entry persists identically.
- `runTextLookup()` → `POST /api/nutrition/text`; `runImageLookup()` →
  `POST /api/nutrition/image` (multipart `FormData`). Both map the response into
  `AiResultPanel` with all items pre-selected.
- `addSelected()` logs each checked item via `logFood`, then clears inputs.

No backend, `lib/db.ts`, `lib/foods.ts`, or API route was changed — only the UI
layer plus a type-only import from `lib/gemini.ts`.

## Decisions & rationale

### Tabs for the three modes
A single segmented control keeps the page a true single-page app and makes the
"three ways to add food" obvious without scrolling between separate sections.
Switching tabs clears any pending AI result so a stale lookup never leaks into a
different flow.

### One `logFood` helper / one persistence path
Rather than special-casing AI entries, all three modes build the same
`LogPayload` and hit `POST /api/log`. Guarantees consistent persistence and
means the DB/schema needed no changes. AI items are logged at their Gemini
serving estimate with `qty = 1`.

### Confirm-before-log for AI results (with checkboxes)
The brief requires showing all identified items so the user can confirm. The
shared `AiResultPanel` pre-selects everything (common case: log it all) but lets
the user uncheck items — e.g. drop the side salad — before saving. Verified in
the browser: unchecking the salad logged only the chicken + rice.

### `import type` from `lib/gemini.ts` (no server code in the client)
The client only needs the `NutritionResult` / `NutritionItem` *types*. Using
`import type` means the compiler erases the import, so the server-only module
(which reads `process.env` and calls Gemini) is never bundled into the client.

### Image preview via `URL.createObjectURL`
Instant local preview with no upload round-trip; object URLs are revoked on
replace/clear to avoid leaks. The actual bytes go to Gemini only when the user
clicks "Analyze photo".

### Loading + error UX
Every AI button swaps to a `Spinner` while awaiting the call and is disabled to
prevent double-submits. Failures surface in `ErrorNote` with a friendly message
(`friendlyError()` rewrites bare network errors into "Couldn't reach the
server…"); server-provided messages (e.g. validation) pass through.

## Verification (real browser, Playwright)

- **Describe:** "grilled chicken with rice and salad" → spinner → 3 items with
  checkboxes; unchecked the salad → "Add 2 to log" → header updated to
  405 kcal / 39P / 45C / 6F and both rows appeared in Today's Log.
- **Photo:** uploaded an image → preview rendered → "Analyzing photo…" spinner →
  result panel. (A synthetic test image was used because external photo
  downloads are blocked in this environment; Gemini correctly reported "No foods
  identified", exercising upload → preview → spinner → result handling. Real
  multi-item rendering is the same `AiResultPanel` proven by the text flow.)
- **Quick add:** still adds catalog foods.
- **Persistence:** after a full page **reload**, all three entries (2 AI + 1
  quick-add) were still present — confirming DB persistence across all modes.
- Only console message is a harmless `favicon.ico` 404.

## Notes

- Test data added during verification was cleared afterward; the log starts empty.
- `.playwright-mcp/` (browser-test artifacts) added to `.gitignore`.
- Still no automated test suite; verification is manual (Playwright + curl).
