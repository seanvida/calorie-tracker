// Static workout catalogue + a deterministic calorie calculator (no AI).
// Calories burned = MET × body-weight(kg) × hours, with an intensity multiplier.
// MET values are moderate-intensity approximations from the Compendium of
// Physical Activities — good enough for everyday tracking, not lab-precise.

export interface Activity {
  id: string;
  name: string;
  /** Moderate-intensity MET. */
  met: number;
}

export interface Intensity {
  id: string;
  label: string;
  /** Scales the base MET. */
  factor: number;
}

export const ACTIVITIES: Activity[] = [
  { id: "running", name: "Running", met: 9.8 },
  { id: "walking", name: "Walking", met: 3.5 },
  { id: "cycling", name: "Cycling", met: 7.5 },
  { id: "weights", name: "Weight lifting", met: 5.0 },
  { id: "hiit", name: "HIIT", met: 8.0 },
  { id: "yoga", name: "Yoga", met: 3.0 },
  { id: "pilates", name: "Pilates", met: 3.0 },
  { id: "swimming", name: "Swimming", met: 7.0 },
  { id: "elliptical", name: "Elliptical", met: 5.0 },
  { id: "rowing", name: "Rowing", met: 7.0 },
  { id: "jump_rope", name: "Jump rope", met: 11.0 },
  { id: "dancing", name: "Dancing", met: 5.0 },
  { id: "hiking", name: "Hiking", met: 6.0 },
  { id: "stairs", name: "Stair climbing", met: 8.0 },
  { id: "sports", name: "Sports (general)", met: 7.0 },
];

export const INTENSITIES: Intensity[] = [
  { id: "light", label: "Light", factor: 0.8 },
  { id: "moderate", label: "Moderate", factor: 1.0 },
  { id: "vigorous", label: "Vigorous", factor: 1.25 },
];

/** Calories burned for `minutes` of an activity at MET `met`, given body weight. */
export function caloriesBurned(met: number, weightKg: number, minutes: number): number {
  if (!(met > 0) || !(weightKg > 0) || !(minutes > 0)) return 0;
  return Math.round(met * weightKg * (minutes / 60));
}
