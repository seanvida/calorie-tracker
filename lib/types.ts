// Shared domain types for the calorie tracker.

/** Macro nutrients, in grams, for one serving. */
export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

/** Calories + macros expressed per 100 g — the basis for gram-based portions. */
export interface Per100 {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** A selectable portion for a food, e.g. { label: "1 cup (~150 g)", grams: 150 }. */
export interface Portion {
  label: string;
  grams: number;
}

/**
 * Optional gram-based fields carried by foods that have per-100g data. When
 * present, the UI offers a portion dropdown and recomputes macros from `per100`.
 * When absent, a food falls back to its single editable `serving` string.
 */
export interface GramBased {
  per100?: Per100;
  portions?: Portion[];
  /** Grams of the default/natural serving. */
  defaultGrams?: number;
}

/** An item from the static food catalog (lib/foods.ts). */
export interface Food extends Macros, GramBased {
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
export interface DisplayFood extends Macros, GramBased {
  name: string;
  serving: string;
  calories: number;
}

/** A food from the searchable Supabase catalogue (`foods` table). */
export interface CatalogFood extends Macros, GramBased {
  id: number;
  name: string;
  serving: string;
  calories: number;
  /** 'seed' = curated/USDA base; 'gemini' = added via AI fallback on a miss. */
  source: "seed" | "gemini";
}

/** A single custom food the user saved (per-user) to re-log quickly. */
export interface SavedFood extends Macros, GramBased {
  id: number;
  name: string;
  serving: string;
  /** Calories for one serving (at defaultGrams). */
  calories: number;
  createdAt: string;
}

/** Payload to save a food (POST /api/saved-foods) — one serving's values. */
export interface NewSavedFood extends Macros, GramBased {
  name: string;
  serving: string;
  calories: number;
}

/**
 * A food staged in the review-before-commit panel. Its calories/macros are the
 * *current totals* (already scaled by `servings`); nothing is saved until the
 * user presses "Add meal".
 */
export interface PendingItem extends Macros, GramBased {
  key: string;
  name: string;
  serving: string;
  /** Serving multiplier the user adjusts in 0.25 steps (1, 1.25, 1.5, …). */
  servings: number;
  calories: number;
  /** Currently selected portion weight in grams (only for gram-based foods). */
  grams?: number;
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

/** One day's rolled-up totals, for history + trends. */
export interface DaySummary extends DailyTotals {
  day: string; // YYYY-MM-DD
  entries: number;
  /** Calories burned from logged workouts that day. */
  burned?: number;
}

/** A logged workout (calories burned), as stored + returned by the API. */
export interface WorkoutEntry {
  id: number;
  activity: string;
  /** Optional duration in minutes. */
  durationMin: number | null;
  /** Calories burned. */
  calories: number;
  notes: string | null;
  day: string; // YYYY-MM-DD
  createdAt: string;
}

/** Payload to POST /api/workouts. */
export interface NewWorkoutEntry {
  activity: string;
  durationMin?: number | null;
  calories: number;
  notes?: string | null;
  day: string;
}

/** Single-user profile, persisted in Supabase. Drives the daily goal + macros. */
export interface Profile {
  name: string | null;
  calorieGoal: number;
  /** Explicit macro gram targets; null → derive from the calorie goal. */
  proteinTarget: number | null;
  carbsTarget: number | null;
  fatTarget: number | null;
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  sex: "male" | "female" | null;
  /** Activity multiplier (1.2 sedentary … 1.9 very active) for goal suggestion. */
  activity: number | null;
  /** Whether the first-run welcome flow has been completed or skipped. */
  onboarded: boolean;
}
