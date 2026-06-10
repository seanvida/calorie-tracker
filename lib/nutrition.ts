import type { MealCategory } from "./types";

/** Default daily calorie goal until the user sets their own. */
export const DEFAULT_GOAL = 2000;

/** Sensible split of a calorie goal into macro gram targets. */
export interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
}

/** 30% protein / 45% carbs / 25% fat, converted to grams (4/4/9 kcal per g). */
export function macroTargets(goal: number): MacroTargets {
  return {
    protein: Math.round((goal * 0.3) / 4),
    carbs: Math.round((goal * 0.45) / 4),
    fat: Math.round((goal * 0.25) / 9),
  };
}

export type ProgressState = "good" | "warn" | "over";

/** Traffic-light state for calories consumed vs. goal. */
export function calorieState(consumed: number, goal: number): ProgressState {
  if (goal <= 0) return "good";
  const pct = consumed / goal;
  if (pct > 1) return "over";
  if (pct >= 0.9) return "warn";
  return "good";
}

/** A flagged-as-suspicious nutrition value, surfaced for AI-sourced estimates. */
export interface NutritionFlag {
  field: "calories" | "protein" | "carbs" | "fat" | "general";
  message: string;
}

/**
 * Cheap plausibility check for a single food's nutrition. Used to flag dodgy
 * AI estimates before they're logged — the values stay fully editable.
 */
export function validateNutrition(n: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): NutritionFlag[] {
  const flags: NutritionFlag[] = [];
  const { calories, protein, carbs, fat } = n;

  const entries = { calories, protein, carbs, fat } as const;
  for (const field of ["calories", "protein", "carbs", "fat"] as const) {
    const v = entries[field];
    if (!Number.isFinite(v) || v < 0) {
      flags.push({ field, message: `${field} isn't a valid number` });
    }
  }
  if (flags.length) return flags;

  if (calories <= 0) flags.push({ field: "calories", message: "Calories is zero" });
  if (calories > 1500) flags.push({ field: "calories", message: "Unusually high for one item" });
  if (protein > 200) flags.push({ field: "protein", message: "Very high protein" });
  if (carbs > 300) flags.push({ field: "carbs", message: "Very high carbs" });
  if (fat > 200) flags.push({ field: "fat", message: "Very high fat" });

  // Macros should roughly reconcile with calories (4/4/9 kcal per gram).
  const fromMacros = protein * 4 + carbs * 4 + fat * 9;
  if (calories > 0 && fromMacros > 0) {
    const diff = Math.abs(fromMacros - calories);
    if (diff > Math.max(150, calories * 0.4)) {
      flags.push({
        field: "general",
        message: `Calories (${Math.round(calories)}) don't match the macros (~${Math.round(fromMacros)} kcal)`,
      });
    }
  }
  return flags;
}

/** The meal most likely being eaten at a given hour (0–23). */
export function mealForHour(hour: number): MealCategory {
  if (hour >= 4 && hour < 11) return "Breakfast";
  if (hour >= 11 && hour < 16) return "Lunch";
  if (hour >= 16 && hour < 21) return "Dinner";
  return "Snack";
}
