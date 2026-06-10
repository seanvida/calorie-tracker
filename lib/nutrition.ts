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

/** The meal most likely being eaten at a given hour (0–23). */
export function mealForHour(hour: number): MealCategory {
  if (hour >= 4 && hour < 11) return "Breakfast";
  if (hour >= 11 && hour < 16) return "Lunch";
  if (hour >= 16 && hour < 21) return "Dinner";
  return "Snack";
}
