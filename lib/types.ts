// Shared domain types for the calorie tracker.

/** Macro nutrients, in grams, for one serving. */
export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

/** An item from the static food catalog (lib/foods.ts). */
export interface Food extends Macros {
  id: string;
  name: string;
  category: FoodCategory;
  /** Calories for one serving. */
  calories: number;
  /** Human-readable serving size, e.g. "1 roti (~40g)". */
  serving: string;
}

export type FoodCategory =
  | "Grains & Breads"
  | "Dals & Legumes"
  | "Sabzis & Paneer"
  | "Non-Veg"
  | "Snacks & Street Food"
  | "Dairy"
  | "Fruits"
  | "Eggs";

/** Which meal an entry belongs to. */
export type MealCategory = "Breakfast" | "Lunch" | "Dinner" | "Snack";

export const MEALS: MealCategory[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

/** A logged food entry as stored in SQLite and returned by the API. */
export interface LogEntry extends Macros {
  id: number;
  foodName: string;
  serving: string;
  calories: number;
  qty: number;
  meal: MealCategory;
  /** Day the entry belongs to, formatted YYYY-MM-DD. */
  day: string;
  createdAt: string;
}

/** Payload sent to POST /api/log to record a food. */
export interface NewLogEntry {
  foodName: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  qty?: number;
  meal: MealCategory;
  day: string;
}

/** Aggregated totals for a day, used by the header summary. */
export interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
