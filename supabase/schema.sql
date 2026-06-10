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

-- Persistent cache of Gemini responses, keyed by input, so identical text or
-- (by content hash) image requests never hit the API twice.
create table if not exists ai_cache (
  id         bigint generated always as identity primary key,
  kind       text        not null,          -- 'text' | 'image'
  cache_key  text        not null,          -- normalized description, or image sha256
  result     jsonb       not null,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_ai_cache_kind_key on ai_cache (kind, cache_key);

-- Rough daily counter of real (uncached) Gemini calls, so usage/cost is visible.
create table if not exists ai_usage (
  day        text    not null,              -- YYYY-MM-DD (UTC)
  route      text    not null,              -- 'text' | 'image' | 'foods'
  calls      integer not null default 0,
  primary key (day, route)
);

-- Single-user profile (id is always 1). Drives the daily goal + macro targets.
create table if not exists profile (
  id             integer primary key default 1,
  name           text,
  calorie_goal   integer not null default 2000,
  protein_target integer, carbs_target integer, fat_target integer,
  height_cm      real, weight_kg real, age integer, sex text, activity real,
  updated_at     timestamptz not null default now(),
  constraint profile_singleton check (id = 1)
);
insert into profile (id) values (1) on conflict do nothing;
