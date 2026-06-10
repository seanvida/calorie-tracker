# 2026-06-10 — First-run onboarding, friendly empty states, one-tap invite

Make a brand-new user feel welcome instead of landing on a blank screen, and add
an easy way to share the app.

## ⚠️ Important precondition note

The request framed this as "now has multi-user auth and per-user data (RLS)."
**That isn't in the codebase** — there's no auth, no middleware, no `user_id`, no
RLS. `profile` is a single global row (`id`=1) and `log_entries` is one shared
log. So this work was built against the real single-tenant app:

- **Onboarding** is gated on a per-profile `onboarded` flag → it shows once for
  the one profile, not once per user.
- **Invite** shares the live URL, but everyone who opens it shares the **same**
  data. It does **not** create private spaces. Promoting the invite to family is
  only safe after real auth + RLS lands (flagged in CLAUDE.md + Next steps).

Everything else (onboarding UX, empty states, the invite mechanism) is correct
and useful today.

## First-run onboarding (`components/Onboarding.tsx`)

A skippable overlay shown when `profile.onboarded === false`:
1. One-line "what this app does".
2. Name + daily calorie goal (macro targets default to the 30/45/25 split).
3. "3 ways to add food: quick-add, describe, photo."

Finishing **or** skipping `PUT`s the profile with `onboarded: true` (+ any name/
goal entered), then drops the user on the main screen with their goal already
driving the bar. New `onboarded boolean` column on `profile`; `saveProfile` uses
`COALESCE(${onboarded}, profile.onboarded)` so a later partial save (e.g. editing
the goal) never clears the flag. The overlay never returns once set.

## Friendly empty states

- **Today empty** — a welcoming card ("Let's log your first meal") with a button
  that scrolls to the add-food panel (replaces the four per-meal empties).
- **History empty** — "No past days logged yet — your history builds as you go."
- **Trends empty** — "Charts appear once you've logged a few days."
- **Goal nudge** — while the goal is still the default 2000, a dismissible banner
  links to Profile ("Set your own goal"). Disappears once a custom goal is set.

## One-tap invite (`components/InviteButton.tsx`, in Profile → Share)

`navigator.share({ title, text, url: window.location.origin })` for the native
share sheet on mobile; falls back to `navigator.clipboard.writeText` (then a
`prompt`) on desktop. No tokens — the link just opens the app.

## Also

Bumped the service-worker `CACHE` to `thali-v3` so returning users get the new
shell (a stale SW from a prior deploy was caching old code in dev — clear via
DevTools → Application → Service Workers if you ever see stale UI locally).

## Verified (local, 390px)

Onboarding appears for a fresh profile → steps work → "Start tracking" saves goal
(2100 drove the bar) → does **not** reappear on reload. Skipping yields defaults.
Empty-day welcome renders; goal nudge shows on default and hides on a custom goal.
Invite button present with share/copy logic. Name persists via Profile save and
`onboarded` is preserved across saves. The live profile was reset to a fresh
first-run (onboarded=false) so the first real open shows the welcome flow.
