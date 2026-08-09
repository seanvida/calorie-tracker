// Gram-based portion helpers (pure, no I/O) — shared by the food catalogue, the
// AI flows, and the review panel so a food can be logged by portion or by weight.
//
// A food carries per-100g macros plus a list of selectable `portions`; totals are
// always per100 × grams/100 × servings. We only truthfully know a food's *own*
// serving weight, so the rest of the dropdown are honest weight options. (The
// full USDA re-import adds real named portions like "1 cup"/"1 medium".)

import type { Macros, Per100, Portion } from "./types";

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Extract a gram weight from a serving label like "1 cup (~150g)" or "oz (~28g)". */
export function parseGrams(serving: string): number | null {
  const m = serving.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (!m) return null;
  const g = parseFloat(m[1]);
  return Number.isFinite(g) && g > 0 ? g : null;
}

/** Convert per-serving macros (for `grams` grams) into per-100g values. */
export function toPer100(perServing: { calories: number } & Macros, grams: number): Per100 {
  const f = 100 / grams;
  return {
    calories: Math.round(perServing.calories * f),
    protein: r1(perServing.protein * f),
    carbs: r1(perServing.carbs * f),
    fat: r1(perServing.fat * f),
  };
}

/** Portion dropdown for a food whose natural serving is `label` at `grams`. */
export function buildPortions(label: string, grams: number): Portion[] {
  const out: Portion[] = [];
  const seen = new Set<number>();
  const add = (g: number, l: string) => {
    const gg = Math.round(g);
    if (gg <= 0 || seen.has(gg)) return;
    seen.add(gg);
    out.push({ label: l, grams: gg });
  };
  add(grams, label); // the food's natural serving (stays the default)
  add(100, "100 g");
  for (const g of [30, 50, 150, 200, 250]) add(g, `${g} g`);
  return out;
}

/** Totals for `grams` at `servings`, computed from per-100g values. */
export function scaleFromPer100(
  per100: Per100,
  grams: number,
  servings: number,
): { calories: number } & Macros {
  const f = (grams / 100) * servings;
  return {
    calories: Math.round(per100.calories * f),
    protein: r1(per100.protein * f),
    carbs: r1(per100.carbs * f),
    fat: r1(per100.fat * f),
  };
}
