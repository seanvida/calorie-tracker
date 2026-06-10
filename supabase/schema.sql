-- Calorie Tracker — Supabase (Postgres) schema.
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run (uses IF NOT EXISTS).

create table if not exists log_entries (
  id          bigint generated always as identity primary key,
  food_name   text        not null,
  serving     text        not null,
  calories    real        not null,
  protein     real        not null,
  carbs       real        not null,
  fat         real        not null,
  qty         integer     not null default 1,
  meal        text        not null default 'Snack',
  day         text        not null,                 -- YYYY-MM-DD (local day key)
  created_at  timestamptz not null default now()
);

create index if not exists idx_log_entries_day on log_entries (day);

-- The food catalog (lib/foods.ts) is static TypeScript, not stored in the DB,
-- so there are no seeded food rows to migrate — only logged entries persist here.
