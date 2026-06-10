# 2026-06-10 — Multi-user auth (Google) + per-user data + RLS

Fixes the reported issue: two people (e.g. spouses) were seeing each other's
data because the app was single-tenant. Now each person signs in with Google and
gets a private log + profile.

## What changed

- **Auth:** Google sign-in via Supabase Auth + `@supabase/ssr`.
  - `lib/supabase/server.ts` / `client.ts` — SSR + browser clients.
  - `middleware.ts` — refreshes the session cookie each request.
  - `app/login/page.tsx` — "Continue with Google".
  - `app/auth/callback/route.ts` — exchanges the OAuth code for a session.
  - `app/page.tsx` is now a **server auth-gate**: no session → redirect `/login`;
    otherwise renders `components/Home.tsx` (the former page, unchanged UI).
  - Sign-out in Profile (`SignOutButton`).
- **Per-user data:**
  - `log_entries` gained a `user_id uuid` (+ `(user_id, day)` index).
  - New `profiles` table keyed by `user_id` (replaces the old `profile` singleton,
    which is left untouched/deprecated). Onboarding flag is now genuinely per-user.
  - Every `lib/db.ts` query takes a `userId` and filters by it; ownership is
    re-checked on update/delete. Every route resolves `getUserId()` and 401s if
    absent. `foods` / `ai_cache` / `ai_usage` stay shared (catalogue + cost data).
- **RLS:** enabled on `log_entries` + `profiles` with `user_id = auth.uid()`
  policies. **Note:** the app's pooled connection runs as the service role, which
  *bypasses* RLS — so **app-level `user_id` scoping is the authoritative guard**;
  RLS is defense-in-depth for any future direct-client (anon-key) access.
- **Migration was additive** (no drops): added a column, a new table, indexes,
  RLS. Old co-mingled rows have `user_id = NULL` and are invisible to real
  accounts, so everyone starts clean.

## Manual setup (one-time — only you can do these)

**A. Google OAuth client (Google Cloud Console)**
1. console.cloud.google.com → create/select a project.
2. **APIs & Services → OAuth consent screen** → External → fill app name + your
   email → add both your and your wife's emails under **Test users** (or Publish).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** →
   type **Web application**.
4. Under **Authorized redirect URIs** add exactly:
   `https://nzydyfvixsloqxofoeau.supabase.co/auth/v1/callback`
5. Create → copy the **Client ID** and **Client secret**.

**B. Enable Google in Supabase**
1. Supabase dashboard → **Authentication → Providers → Google** → enable → paste
   the Client ID + secret → save.
2. **Authentication → URL Configuration:** Site URL =
   `https://calorie-tracker-gold-iota.vercel.app`; add Redirect URLs:
   `https://calorie-tracker-gold-iota.vercel.app/**` and
   `http://localhost:3000/**`.

**C. Env vars** (Supabase → Project Settings → API: Project URL + anon key)
- Add to **Vercel → Settings → Environment Variables** (all environments):
  `NEXT_PUBLIC_SUPABASE_URL=https://nzydyfvixsloqxofoeau.supabase.co`
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>`
- Add the same two to local `.env`.

Once these are set, push deploys the auth-gated app. (Until env vars exist on
Vercel, the code falls back to un-gated — so deploy only after they're set.)

## Test checklist

1. Open the live URL → redirected to **/login** → "Continue with Google" → signs
   in and lands on the app.
2. Add a meal as you. On your wife's phone, she signs in with *her* Google → she
   sees an **empty** log (her own), and your entry is **not** there.
3. Her edits don't appear in your app and vice-versa.
4. Profile (name/goal), History, Trends are all per-user.
5. Sign out (Profile → Account) → back to /login.
6. Invite (Profile → Share) sends the link; the invitee signs in and gets their
   own private space.
