import postgres from "postgres";
import type { CatalogFood, DaySummary, LogEntry, NewLogEntry, Profile } from "./types";
import type { NutritionResult } from "./gemini";

// Hosted Postgres (Supabase). The connection string lives in DATABASE_URL.
// Use Supabase's "Transaction pooler" string (port 6543) so the same URL works
// both on serverless (Vercel) and locally with `npm run dev`. Transaction-mode
// pooling can't reuse prepared statements, hence `prepare: false`. Supabase
// enforces TLS, so `ssl: "require"`.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and paste your " +
      "Supabase connection string (see docs/ for the dashboard steps).",
  );
}

// Reuse a single client across hot reloads in dev (Next.js re-evaluates modules,
// so we stash the instance on globalThis to avoid exhausting pooler connections).
const globalForDb = globalThis as unknown as {
  _sql?: ReturnType<typeof postgres>;
};

const sql =
  globalForDb._sql ??
  postgres(connectionString, { prepare: false, ssl: "require" });

if (process.env.NODE_ENV !== "production") globalForDb._sql = sql;

export { sql };

// Raw DB rows use snake_case; map them to our camelCase LogEntry type.
// Postgres returns bigint ids as strings and timestamptz as Date objects.
interface Row {
  id: string | number;
  food_name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  qty: number;
  meal: string;
  day: string;
  created_at: Date | string;
}

function toEntry(r: Row): LogEntry {
  return {
    id: Number(r.id),
    foodName: r.food_name,
    serving: r.serving,
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    qty: r.qty,
    meal: (r.meal as LogEntry["meal"]) ?? "Snack",
    day: r.day,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at),
  };
}

// Every log query is scoped to the signed-in user's id (`user_id`). This is the
// authoritative isolation (the app's pooled connection runs as the service role,
// which bypasses RLS — RLS is enabled as a backstop for any direct-client access).

/** Return a user's entries for a given day (YYYY-MM-DD), oldest first. */
export async function getEntriesForDay(userId: string, day: string): Promise<LogEntry[]> {
  const rows = await sql<Row[]>`
    SELECT * FROM log_entries
    WHERE user_id = ${userId} AND day = ${day}
    ORDER BY created_at ASC, id ASC`;
  return rows.map(toEntry);
}

/** Insert a new entry for a user and return the created row. */
export async function addEntry(userId: string, entry: NewLogEntry): Promise<LogEntry> {
  const qty = entry.qty && entry.qty > 0 ? entry.qty : 1;
  const [row] = await sql<Row[]>`
    INSERT INTO log_entries
      (user_id, food_name, serving, calories, protein, carbs, fat, qty, meal, day)
    VALUES
      (${userId}, ${entry.foodName}, ${entry.serving}, ${entry.calories}, ${entry.protein},
       ${entry.carbs}, ${entry.fat}, ${qty}, ${entry.meal}, ${entry.day})
    RETURNING *`;
  return toEntry(row);
}

/** Update one of the user's entries' quantity. Returns the row, or null. */
export async function updateEntryQty(
  userId: string,
  id: number,
  qty: number,
): Promise<LogEntry | null> {
  const [row] = await sql<Row[]>`
    UPDATE log_entries SET qty = ${qty}
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *`;
  return row ? toEntry(row) : null;
}

/** Delete one of the user's entries by id. Returns true if a row was removed. */
export async function deleteEntry(userId: string, id: number): Promise<boolean> {
  const result = await sql`DELETE FROM log_entries WHERE id = ${id} AND user_id = ${userId}`;
  return result.count > 0;
}

// ---- Food catalogue (search-first, Gemini-fallback-and-cache) ----

interface CatalogRow {
  id: string | number;
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
}

function toCatalog(r: CatalogRow): CatalogFood {
  return {
    id: Number(r.id),
    name: r.name,
    serving: r.serving,
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    source: r.source === "gemini" ? "gemini" : "seed",
  };
}

/**
 * Search the catalogue. Tokenizes the query and requires every word to appear
 * (so "chicken breast" matches USDA's "Chicken, ..., breast, ..."). Ranks exact
 * and prefix matches first, then shorter names.
 */
export async function searchFoods(q: string, limit = 50): Promise<CatalogFood[]> {
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  if (tokens.length === 0) return [];

  let where = sql`name ILIKE ${"%" + tokens[0] + "%"}`;
  for (let i = 1; i < tokens.length; i++) {
    where = sql`${where} AND name ILIKE ${"%" + tokens[i] + "%"}`;
  }

  const rows = await sql<CatalogRow[]>`
    SELECT id, name, serving, calories, protein, carbs, fat, source
    FROM foods
    WHERE ${where}
    ORDER BY (lower(name) = ${q.toLowerCase()}) DESC,
             (name ILIKE ${q + "%"}) DESC,
             length(name) ASC
    LIMIT ${limit}`;
  return rows.map(toCatalog);
}

/**
 * Insert a food into the catalogue (used by the Gemini fallback to cache a miss).
 * Idempotent: on a name conflict it returns the existing row instead of
 * duplicating, so the same food is never stored — or re-queried — twice.
 */
export async function addCatalogFood(f: {
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "seed" | "gemini";
}): Promise<CatalogFood> {
  const [row] = await sql<CatalogRow[]>`
    INSERT INTO foods (name, serving, calories, protein, carbs, fat, source, reviewed)
    VALUES (${f.name}, ${f.serving}, ${f.calories}, ${f.protein}, ${f.carbs}, ${f.fat},
            ${f.source}, false)
    ON CONFLICT DO NOTHING
    RETURNING id, name, serving, calories, protein, carbs, fat, source`;
  if (row) return toCatalog(row);

  // Name already existed — return the stored row.
  const [existing] = await sql<CatalogRow[]>`
    SELECT id, name, serving, calories, protein, carbs, fat, source
    FROM foods WHERE lower(name) = lower(${f.name}) LIMIT 1`;
  return toCatalog(existing);
}

// ---- AI response cache + usage counter (cost guardrails) ----

/** Return a cached Gemini result for this input, or null on a miss. */
export async function getAiCache(
  kind: "text" | "image",
  key: string,
): Promise<NutritionResult | null> {
  const [row] = await sql<{ result: NutritionResult }[]>`
    SELECT result FROM ai_cache WHERE kind = ${kind} AND cache_key = ${key} LIMIT 1`;
  return row ? row.result : null;
}

/** Store a Gemini result so the same input never hits the API again. */
export async function setAiCache(
  kind: "text" | "image",
  key: string,
  result: NutritionResult,
): Promise<void> {
  await sql`
    INSERT INTO ai_cache (kind, cache_key, result)
    VALUES (${kind}, ${key}, ${JSON.stringify(result)}::jsonb)
    ON CONFLICT (kind, cache_key) DO NOTHING`;
}

/** Increment the rough daily counter of real (uncached) Gemini calls. */
export async function recordAiUsage(route: "text" | "image" | "foods"): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  await sql`
    INSERT INTO ai_usage (day, route, calls) VALUES (${day}, ${route}, 1)
    ON CONFLICT (day, route) DO UPDATE SET calls = ai_usage.calls + 1`;
}

// ---- Profile (single row, id = 1) + history aggregates ----

interface ProfileRow {
  name: string | null;
  calorie_goal: number;
  protein_target: number | null;
  carbs_target: number | null;
  fat_target: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  age: number | null;
  sex: string | null;
  activity: number | null;
  onboarded: boolean;
}

function toProfile(r: ProfileRow): Profile {
  return {
    name: r.name,
    calorieGoal: r.calorie_goal,
    proteinTarget: r.protein_target,
    carbsTarget: r.carbs_target,
    fatTarget: r.fat_target,
    heightCm: r.height_cm,
    weightKg: r.weight_kg,
    age: r.age,
    sex: (r.sex as Profile["sex"]) ?? null,
    activity: r.activity,
    onboarded: r.onboarded,
  };
}

/** Fetch a user's profile, creating a default row on first use. */
export async function getProfile(userId: string): Promise<Profile> {
  let [row] = await sql<ProfileRow[]>`SELECT * FROM profiles WHERE user_id = ${userId}`;
  if (!row) {
    [row] = await sql<ProfileRow[]>`
      INSERT INTO profiles (user_id) VALUES (${userId})
      ON CONFLICT (user_id) DO UPDATE SET user_id = ${userId} RETURNING *`;
  }
  return toProfile(row);
}

/** Upsert a user's profile. Most fields are replaced; `onboarded` only ever
 *  moves forward (COALESCE keeps it true once set, even on a partial save). */
export async function saveProfile(userId: string, p: Partial<Profile>): Promise<Profile> {
  const onboarded = typeof p.onboarded === "boolean" ? p.onboarded : null;
  const [row] = await sql<ProfileRow[]>`
    INSERT INTO profiles
      (user_id, name, calorie_goal, protein_target, carbs_target, fat_target,
       height_cm, weight_kg, age, sex, activity, onboarded, updated_at)
    VALUES
      (${userId}, ${p.name ?? null}, ${p.calorieGoal ?? 2000}, ${p.proteinTarget ?? null},
       ${p.carbsTarget ?? null}, ${p.fatTarget ?? null}, ${p.heightCm ?? null},
       ${p.weightKg ?? null}, ${p.age ?? null}, ${p.sex ?? null}, ${p.activity ?? null},
       ${onboarded ?? false}, now())
    ON CONFLICT (user_id) DO UPDATE SET
      name           = ${p.name ?? null},
      calorie_goal   = ${p.calorieGoal ?? 2000},
      protein_target = ${p.proteinTarget ?? null},
      carbs_target   = ${p.carbsTarget ?? null},
      fat_target     = ${p.fatTarget ?? null},
      height_cm      = ${p.heightCm ?? null},
      weight_kg      = ${p.weightKg ?? null},
      age            = ${p.age ?? null},
      sex            = ${p.sex ?? null},
      activity       = ${p.activity ?? null},
      onboarded      = COALESCE(${onboarded}, profiles.onboarded),
      updated_at     = now()
    RETURNING *`;
  return toProfile(row);
}

/** Per-day totals (calories + macros) for a user over a date range, newest first. */
export async function getDailySummaries(userId: string, from: string, to: string): Promise<DaySummary[]> {
  const rows = await sql<
    { day: string; calories: number; protein: number; carbs: number; fat: number; entries: number }[]
  >`
    SELECT day,
      COALESCE(SUM(calories * qty), 0)::float8 AS calories,
      COALESCE(SUM(protein  * qty), 0)::float8 AS protein,
      COALESCE(SUM(carbs    * qty), 0)::float8 AS carbs,
      COALESCE(SUM(fat      * qty), 0)::float8 AS fat,
      COUNT(*)::int AS entries
    FROM log_entries
    WHERE user_id = ${userId} AND day BETWEEN ${from} AND ${to}
    GROUP BY day
    ORDER BY day DESC`;
  return rows.map((r) => ({
    day: r.day,
    calories: Math.round(r.calories),
    protein: Math.round(r.protein),
    carbs: Math.round(r.carbs),
    fat: Math.round(r.fat),
    entries: r.entries,
  }));
}
