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

-- Gram-based portions: per-100g macros + a list of selectable portions, so a
-- food can be logged by portion (dropdown) or by weight. Nullable — rows without
-- these fall back to their single `serving` string. Backfilled by
-- scripts/gen-portions.mjs + seed-foods.mjs; AI-added rows fill them on the fly.
alter table foods add column if not exists kcal100       real;
alter table foods add column if not exists protein100    real;
alter table foods add column if not exists carbs100      real;
alter table foods add column if not exists fat100        real;
alter table foods add column if not exists portions      jsonb;
alter table foods add column if not exists default_grams real;

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

-- Per-user profile (one row per authenticated user). Drives goal + macro targets.
-- (The old single-row `profile` table is deprecated and left untouched.)
create table if not exists profiles (
  user_id        uuid primary key,                 -- = auth.uid()
  name           text,
  calorie_goal   integer not null default 2000,
  protein_target integer, carbs_target integer, fat_target integer,
  height_cm      real, weight_kg real, age integer, sex text, activity real,
  onboarded      boolean not null default false,   -- first-run welcome shown/skipped?
  updated_at     timestamptz not null default now()
);

-- Per-user saved foods (single custom foods the user re-logs often). Mirrors a
-- catalogue row but user-scoped + gram-based, so re-logging keeps the portion
-- dropdown. RLS on.
create table if not exists saved_foods (
  id            bigint generated always as identity primary key,
  user_id       uuid        not null,
  name          text        not null,
  serving       text        not null,
  calories      real        not null,   -- for one serving (at default_grams)
  protein       real        not null,
  carbs         real        not null,
  fat           real        not null,
  kcal100       real, protein100 real, carbs100 real, fat100 real,
  portions      jsonb, default_grams real,
  created_at    timestamptz not null default now()
);
create index if not exists idx_saved_foods_user on saved_foods (user_id, created_at desc);

-- Per-user workout log. Calories burned are AI-estimated (or hand-entered); the
-- daily food goal stays fixed, but the app surfaces a "net" number + burned trend.
create table if not exists workout_entries (
  id           bigint generated always as identity primary key,
  user_id      uuid        not null,
  activity     text        not null,
  duration_min integer,                        -- optional minutes
  calories     real        not null,           -- calories burned
  notes        text,
  day          text        not null,           -- YYYY-MM-DD (local day key)
  created_at   timestamptz not null default now()
);
create index if not exists idx_workout_user_day on workout_entries (user_id, day);

-- Per-user isolation. The app's pooled (service-role) connection bypasses RLS,
-- so queries are also scoped by user_id in code; RLS is the backstop.
alter table log_entries add column if not exists user_id uuid;
create index if not exists idx_log_entries_user_day on log_entries (user_id, day);

alter table log_entries     enable row level security;
alter table profiles        enable row level security;
alter table saved_foods     enable row level security;
alter table workout_entries enable row level security;
drop policy if exists own_log on log_entries;
create policy own_log on log_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists own_profile on profiles;
create policy own_profile on profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists own_saved on saved_foods;
create policy own_saved on saved_foods
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists own_workout on workout_entries;
create policy own_workout on workout_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
