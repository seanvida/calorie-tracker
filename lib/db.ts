import postgres from "postgres";
import type { LogEntry, NewLogEntry } from "./types";

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

/** Return all entries for a given day (YYYY-MM-DD), oldest first. */
export async function getEntriesForDay(day: string): Promise<LogEntry[]> {
  const rows = await sql<Row[]>`
    SELECT * FROM log_entries
    WHERE day = ${day}
    ORDER BY created_at ASC, id ASC`;
  return rows.map(toEntry);
}

/** Insert a new entry and return the created row. */
export async function addEntry(entry: NewLogEntry): Promise<LogEntry> {
  const qty = entry.qty && entry.qty > 0 ? entry.qty : 1;
  const [row] = await sql<Row[]>`
    INSERT INTO log_entries
      (food_name, serving, calories, protein, carbs, fat, qty, meal, day)
    VALUES
      (${entry.foodName}, ${entry.serving}, ${entry.calories}, ${entry.protein},
       ${entry.carbs}, ${entry.fat}, ${qty}, ${entry.meal}, ${entry.day})
    RETURNING *`;
  return toEntry(row);
}

/** Update an entry's quantity (servings). Returns the updated row, or null. */
export async function updateEntryQty(
  id: number,
  qty: number,
): Promise<LogEntry | null> {
  const [row] = await sql<Row[]>`
    UPDATE log_entries SET qty = ${qty} WHERE id = ${id}
    RETURNING *`;
  return row ? toEntry(row) : null;
}

/** Delete an entry by id. Returns true if a row was removed. */
export async function deleteEntry(id: number): Promise<boolean> {
  const result = await sql`DELETE FROM log_entries WHERE id = ${id}`;
  return result.count > 0;
}
