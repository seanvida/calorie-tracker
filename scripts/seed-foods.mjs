// Seed the `foods` catalogue into Supabase. Idempotent: creates the table if
// needed and inserts rows with ON CONFLICT DO NOTHING (unique on lower(name)),
// so re-running never duplicates. Reads scripts/foods_seed.json.
//
//   node scripts/seed-foods.mjs
//
import postgres from "postgres";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load DATABASE_URL from .env (no dependency on Next's loader).
function loadEnv() {
  if (process.env.DATABASE_URL) return;
  try {
    const env = readFileSync(path.join(__dirname, "..", ".env"), "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}
loadEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set (check .env). Aborting.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, ssl: "require" });

const rows = JSON.parse(
  readFileSync(path.join(__dirname, "foods_seed.json"), "utf8"),
);
console.log(`Loaded ${rows.length} seed foods.`);

async function main() {
  // Ensure schema (matches supabase/schema.sql).
  await sql`
    create table if not exists foods (
      id          bigint generated always as identity primary key,
      name        text        not null,
      serving     text        not null,
      calories    real        not null,
      protein     real        not null,
      carbs       real        not null,
      fat         real        not null,
      source      text        not null default 'seed',
      reviewed    boolean     not null default false,
      created_at  timestamptz not null default now()
    )`;
  await sql`create unique index if not exists idx_foods_name_lower on foods (lower(name))`;

  const before = (await sql`select count(*)::int as n from foods`)[0].n;

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((r) => ({
      name: r.name,
      serving: r.serving,
      calories: r.calories,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
      source: r.source || "seed",
      reviewed: (r.source || "seed") !== "gemini", // seed = trusted; gemini needs review
    }));
    await sql`
      insert into foods ${sql(batch, "name", "serving", "calories", "protein", "carbs", "fat", "source", "reviewed")}
      on conflict do nothing`;
    inserted += batch.length;
    process.stdout.write(`\r  upserted ${Math.min(inserted, rows.length)}/${rows.length}`);
  }

  const after = (await sql`select count(*)::int as n from foods`)[0].n;
  const bySource = await sql`select source, count(*)::int as n from foods group by source order by source`;
  console.log(`\nDone. foods: ${before} -> ${after} (new: ${after - before}).`);
  for (const s of bySource) console.log(`  ${s.source}: ${s.n}`);
  await sql.end();
}

main().catch(async (e) => {
  console.error("\nSeed failed:", e.message);
  await sql.end();
  process.exit(1);
});
