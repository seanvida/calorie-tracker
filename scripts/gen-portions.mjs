// Backfill gram-based portions into scripts/foods_seed.json.
//
// The existing seed stores per-serving macros with a gram weight embedded in the
// serving label (e.g. "1 cup cooked (~150g)"). This derives per-100g values +
// a portions dropdown from that weight, so the catalogue supports gram-based
// logging without any new download. Rows whose serving has no gram weight
// (e.g. "250ml" liquids) are left as-is (they keep the legacy single serving).
//
//   node scripts/gen-portions.mjs
//
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, "foods_seed.json");

const r1 = (v) => Math.round((v || 0) * 10) / 10;

function parseGrams(serving) {
  const m = String(serving || "").match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (!m) return null;
  const g = parseFloat(m[1]);
  return Number.isFinite(g) && g > 0 ? g : null;
}

function toPer100(row, grams) {
  const f = 100 / grams;
  return {
    kcal100: Math.round((row.calories || 0) * f),
    protein100: r1((row.protein || 0) * f),
    carbs100: r1((row.carbs || 0) * f),
    fat100: r1((row.fat || 0) * f),
  };
}

function buildPortions(label, grams) {
  const out = [];
  const seen = new Set();
  const add = (g, l) => {
    const gg = Math.round(g);
    if (gg <= 0 || seen.has(gg)) return;
    seen.add(gg);
    out.push({ label: l, grams: gg });
  };
  add(grams, label);
  add(100, "100 g");
  for (const g of [30, 50, 150, 200, 250]) add(g, `${g} g`);
  return out;
}

const rows = JSON.parse(readFileSync(FILE, "utf8"));
let upgraded = 0;
for (const row of rows) {
  const grams = parseGrams(row.serving);
  if (!grams) continue;
  Object.assign(row, toPer100(row, grams));
  row.portions = buildPortions(row.serving, grams);
  row.default_grams = grams;
  upgraded++;
}

writeFileSync(FILE, JSON.stringify(rows));
console.log(`Upgraded ${upgraded}/${rows.length} foods with gram-based portions.`);
console.log("sample:", JSON.stringify(rows.find((r) => r.portions), null, 0));
