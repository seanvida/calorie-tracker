# 2026-06-10 — Migrate from local SQLite to Supabase (Postgres)

## Why

The app stored its food log in a local SQLite file (`data/calories.db`) via
Node's built-in `node:sqlite`. That's perfect on a laptop but a dead end for
deploy: Vercel (and serverless hosts generally) have an **ephemeral, read-only
filesystem**, so the DB file would reset on every deploy/cold start and never be
shared between devices. To get "same data on laptop and phone, surviving
deploys," the database has to be **hosted**.

We chose **Supabase** — managed Postgres on a free tier, no infra to run.

## What changed

- **Driver:** added the lightweight [`postgres`](https://github.com/porsager/postgres)
  npm package. It keeps the raw-SQL style of the old code (tagged-template
  queries are automatically parameterized, so still injection-safe).
- **`lib/db.ts`:** rewritten to connect to `process.env.DATABASE_URL` instead of
  opening a local file. All query functions (`getEntriesForDay`, `addEntry`,
  `updateEntryQty`, `deleteEntry`) are now **async**. The client is cached on
  `globalThis` so dev hot reloads don't open a new pool each time. No runtime
  DDL/migration code — schema lives in `supabase/schema.sql`.
- **API routes** (`app/api/log/route.ts`, `app/api/log/[id]/route.ts`): now
  `await` the async db calls; `GET /api/log` became `async`. Routes still pin
  `runtime = "nodejs"` because the driver uses TCP sockets (not Edge-compatible).
- **`supabase/schema.sql`:** the Postgres schema (`log_entries` + day index),
  to run once in the Supabase SQL Editor. Column types mapped from SQLite:
  `INTEGER PK AUTOINCREMENT` → `bigint generated always as identity`,
  `created_at` text → `timestamptz default now()`; `real`/`integer`/`text` as-is.
- **`.env.example` / docs / CLAUDE.md:** document the new `DATABASE_URL` key.

## Connection choice

We use Supabase's **Transaction pooler** connection string (port 6543). It's the
recommended mode for serverless and also works fine for local `npm run dev`, so a
single `DATABASE_URL` works everywhere. Because transaction-mode pooling can't
reuse prepared statements, the client sets `prepare: false`; Supabase enforces
TLS, so `ssl: "require"`.

## Data migration

No data was copied. The only persisted table was `log_entries` (transient daily
logs); the food **catalog** is static TypeScript (`lib/foods.ts`), never in the
DB, so there was nothing to seed. Fresh start on Supabase. (If you want to keep
existing local rows, dump them from `data/calories.db` and `INSERT` into
Supabase — not done here.)

## Manual steps (one-time, done in the Supabase dashboard)

1. Create a project at supabase.com, set a DB password.
2. SQL Editor → paste `supabase/schema.sql` → Run.
3. Connect → Transaction pooler → copy the string, put it in `.env` as
   `DATABASE_URL` (replace `[YOUR-PASSWORD]`).
4. For deploy: add `DATABASE_URL` and `GEMINI_API_KEY` to Vercel env vars.

## Result

`npm run dev` runs against hosted Postgres; logged entries persist across
restarts and are identical on every device. `npx tsc --noEmit` passes.
