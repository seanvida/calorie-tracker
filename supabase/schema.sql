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

-- Searchable food catalogue. Seeded from USDA SR Legacy + a curated Indian core
-- (see scripts/seed-foods.mjs), and grown automatically: when a search misses,
-- the Gemini fallback saves its result here as source='gemini', reviewed=false.
create table if not exists foods (
  id          bigint generated always as identity primary key,
  name        text        not null,
  serving     text        not null,
  calories    real        not null,
  protein     real        not null,
  carbs       real        not null,
  fat         real        not null,
  source      text        not null default 'seed',   -- 'seed' | 'gemini'
  reviewed    boolean     not null default false,     -- gemini entries: review later
  created_at  timestamptz not null default now()
);

-- Case-insensitive uniqueness: dedupes the catalogue and lets the Gemini
-- fallback insert without ever creating a duplicate / re-querying the same food.
create unique index if not exists idx_foods_name_lower on foods (lower(name));
