import type { LogEntry, MealCategory } from "@/lib/types";
import FoodEntryCard from "./FoodEntryCard";

interface MealSectionProps {
  meal: MealCategory;
  entries: LogEntry[];
  onDelete: (id: number) => void;
  onUpdateQty: (id: number, qty: number) => void;
  deletingId: number | null;
  updatingId: number | null;
  onAddHere: (meal: MealCategory) => void;
}

// Distinct, legible glyphs per meal (rendered at 14px stroke).
const ICONS: Record<MealCategory, string> = {
  // Sunrise: sun + rays + horizon
  Breakfast: "M12 4V2m0 2a5 5 0 015 5m-5-5a5 5 0 00-5 5m-1 0H4m16 0h-2M5.6 5.6l1 1m11.8-1l-1 1M3 14h18M6 18h12",
  // Fork + knife
  Lunch: "M7 3v8m0 0v10m0-10c-1.5 0-2-1-2-3V3m2 8c1.5 0 2-1 2-3V3M16 3c-1.5 1-2.5 3-2.5 5.5S15 12 16 12v9",
  // Crescent moon
  Dinner: "M20 13.5A8 8 0 119.5 4a6.2 6.2 0 0010.5 9.5z",
  // Apple
  Snack: "M12 7c-1.5-2-5-2.5-6.5 0-1.6 2.7-.2 8 2.5 10 1.3 1 2.7 1 4 0 2.7-2 4.1-7.3 2.5-10C13 4.5 9.5 5 12 7zm0 0V4c0-1 .7-2 2-2",
};

/** One meal group (Breakfast / Lunch / Dinner / Snack) with its entries. */
export default function MealSection({
  meal,
  entries,
  onDelete,
  onUpdateQty,
  deletingId,
  updatingId,
  onAddHere,
}: MealSectionProps) {
  const kcal = entries.reduce((s, e) => s + e.calories * e.qty, 0);

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-matcha-soft text-matcha-deep">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[meal]} />
            </svg>
          </span>
          <h3 className="font-display text-base font-semibold text-ink">{meal}</h3>
          <span className="nums text-xs text-ink-3">
            {entries.length > 0 ? `${Math.round(kcal)} kcal` : ""}
          </span>
        </div>
        <button
          onClick={() => onAddHere(meal)}
          className="rounded-full px-2.5 py-1 text-xs font-semibold text-matcha transition hover:bg-matcha-soft"
        >
          + Add
        </button>
      </div>

      {entries.length === 0 ? (
        <button
          onClick={() => onAddHere(meal)}
          className="w-full rounded-2xl border border-dashed border-line-2 bg-surface/40 px-4 py-3 text-left text-xs text-ink-3 transition hover:border-matcha/40 hover:text-ink-2"
        >
          Nothing logged for {meal.toLowerCase()} yet — tap to add something.
        </button>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <FoodEntryCard
              key={e.id}
              entry={e}
              onDelete={onDelete}
              onUpdateQty={onUpdateQty}
              deleting={deletingId === e.id}
              updating={updatingId === e.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
