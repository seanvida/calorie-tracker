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

/** The minimal shape needed to render + log a food (catalog item or search hit). */
export interface DisplayFood extends Macros {
  name: string;
  serving: string;
  calories: number;
}

/** A food from the searchable Supabase catalogue (`foods` table). */
export interface CatalogFood extends Macros {
  id: number;
  name: string;
  serving: string;
  calories: number;
  /** 'seed' = curated/USDA base; 'gemini' = added via AI fallback on a miss. */
  source: "seed" | "gemini";
}

/**
 * A food staged in the review-before-commit panel. Its calories/macros are the
 * *current totals* (already scaled by `servings`); nothing is saved until the
 * user presses "Add meal".
 */
export interface PendingItem extends Macros {
  key: string;
  name: string;
  serving: string;
  /** Serving multiplier the user adjusts in 0.5 steps (1, 1.5, 2, …). */
  servings: number;
  calories: number;
  /** 'catalog' = from the food list/search; 'ai' = a Gemini estimate (flagged). */
  source: "catalog" | "ai";
}

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
