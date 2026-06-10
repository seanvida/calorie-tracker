// Generate a curated food seed JSON from USDA SR Legacy + the app's Indian core.
// Output: /tmp/usda/foods_seed.json  -> [{ name, serving, calories, protein, carbs, fat, source }]
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const DIR = "/tmp/usda/FoodData_Central_sr_legacy_food_csv_2018-04";
const FOODS_TS = "/Users/rohitkhurana/Documents/Claude/Calorie Tracker/lib/foods.ts";

// Minimal RFC-4180-ish CSV line parser (handles quoted fields w/ commas).
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { q = false; }
      } else cur += ch;
    } else {
      if (ch === '"') q = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

async function eachLine(file, fn) {
  const rl = createInterface({ input: createReadStream(`${DIR}/${file}`), crlfDelay: Infinity });
  let first = true;
  for await (const line of rl) {
    if (first) { first = false; continue; } // skip header
    if (line.trim()) fn(line);
  }
}

// 1. Nutrients per 100g, keyed by fdc_id. IDs: 1008 kcal, 1003 protein, 1004 fat, 1005 carbs.
const WANT = new Set(["1008", "1003", "1004", "1005"]);
const nut = new Map(); // fdc -> {kcal,protein,fat,carbs}
console.log("parsing food_nutrient.csv (large)...");
await eachLine("food_nutrient.csv", (line) => {
  // first 4 cols are plain numbers: id,fdc_id,nutrient_id,amount
  const c = line.split(",");
  const fdc = c[1]?.replace(/"/g, "");
  const nid = c[2]?.replace(/"/g, "");
  if (!WANT.has(nid)) return;
  const amt = parseFloat(c[3]?.replace(/"/g, ""));
  if (!Number.isFinite(amt)) return;
  let o = nut.get(fdc);
  if (!o) { o = {}; nut.set(fdc, o); }
  if (nid === "1008") o.kcal = amt;
  else if (nid === "1003") o.protein = amt;
  else if (nid === "1004") o.fat = amt;
  else if (nid === "1005") o.carbs = amt;
});
console.log(`  nutrient rows for ${nut.size} foods`);

// 2. measure units
const units = new Map();
await eachLine("measure_unit.csv", (line) => {
  const [id, name] = parseCsvLine(line);
  units.set(id, name);
});

// 3. first portion per fdc (seq_num == 1 preferred, else first seen)
const portion = new Map(); // fdc -> {amount, unitId, desc, modifier, gram, seq}
await eachLine("food_portion.csv", (line) => {
  const c = parseCsvLine(line);
  const fdc = c[1], seq = c[2], amount = c[3], unitId = c[4], desc = c[5], modifier = c[6], gram = parseFloat(c[7]);
  if (!Number.isFinite(gram) || gram <= 0) return;
  const prev = portion.get(fdc);
  const seqN = parseInt(seq, 10) || 99;
  if (!prev || seqN < prev.seq) portion.set(fdc, { amount, unitId, desc, modifier, gram, seq: seqN });
});

function servingLabel(fdc, p) {
  if (!p) return { label: "100 g", factor: 1 };
  const unit = units.get(p.unitId);
  const unitName = unit && unit !== "undetermined" ? unit : "";
  const amtNum = parseFloat(p.amount);
  const amtStr = Number.isFinite(amtNum) && amtNum !== 1 ? `${+amtNum.toFixed(2)} ` : "";
  const words = (p.desc || p.modifier || "").trim();
  let base = `${amtStr}${unitName}${unitName && words ? ", " : (unitName ? "" : "")}${unitName ? "" : ""}${words}`.trim();
  if (!base) base = unitName || "serving";
  const gram = Math.round(p.gram);
  return { label: `${base} (~${gram}g)`, factor: p.gram / 100 };
}

// 4. food.csv -> rows
const rows = [];
const seen = new Set(); // lower(name)
await eachLine("food.csv", (line) => {
  const c = parseCsvLine(line);
  const fdc = c[0];
  const desc = (c[2] || "").trim();
  if (!desc) return;
  const n = nut.get(fdc);
  if (!n || !Number.isFinite(n.kcal)) return; // need energy
  const p = portion.get(fdc);
  const { label, factor } = servingLabel(fdc, p);
  const cal = Math.round((n.kcal || 0) * factor);
  if (cal <= 0) return;
  const r1 = (v) => Math.round(((v || 0) * factor) * 10) / 10;
  const name = desc;
  const key = name.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  rows.push({ name, serving: label, calories: cal, protein: r1(n.protein), carbs: r1(n.carbs), fat: r1(n.fat), source: "seed" });
});
console.log(`  USDA usable foods: ${rows.length}`);

// 5. Indian core from lib/foods.ts (curated, India-relevant) — these win on name collisions.
const ts = readFileSync(FOODS_TS, "utf8");
const re = /name:\s*"([^"]+)"[^}]*?serving:\s*"([^"]+)"[^}]*?calories:\s*([\d.]+)[^}]*?protein:\s*([\d.]+)[^}]*?carbs:\s*([\d.]+)[^}]*?fat:\s*([\d.]+)/g;
const indian = [];
let m;
while ((m = re.exec(ts))) {
  indian.push({ name: m[1], serving: m[2], calories: +m[3], protein: +m[4], carbs: +m[5], fat: +m[6], source: "seed" });
}
console.log(`  Indian core foods: ${indian.length}`);

// Merge: Indian core first (priority), then USDA minus name collisions.
const final = [];
const finalSeen = new Set();
for (const r of [...indian, ...rows]) {
  const k = r.name.toLowerCase();
  if (finalSeen.has(k)) continue;
  finalSeen.add(k);
  final.push(r);
}
writeFileSync("/tmp/usda/foods_seed.json", JSON.stringify(final));
console.log(`TOTAL seed rows: ${final.length}`);
console.log("sample:", JSON.stringify(final.slice(0, 2), null, 0));
console.log("sample mid:", JSON.stringify(final.slice(2000, 2002), null, 0));
