import type { DisplayFood, SavedFood } from "@/lib/types";

interface SavedFoodsSectionProps {
  foods: SavedFood[];
  onAdd: (food: DisplayFood) => void;
  onDelete: (id: number) => void;
}

/** Your saved custom foods — shown above the browse list when the search is empty. */
export default function SavedFoodsSection({ foods, onAdd, onDelete }: SavedFoodsSectionProps) {
  if (foods.length === 0) return null;
  return (
    <div className="mb-3 space-y-2">
      <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-3">★ Saved foods</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {foods.map((food) => (
          <div
            key={food.id}
            className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface p-3 shadow-card"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{food.name}</p>
              <p className="truncate text-xs text-ink-3">{food.serving}</p>
              <div className="nums mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-3">
                <span className="font-semibold text-ink">{food.calories} kcal</span>
                <span className="text-protein">P {food.protein}</span>
                <span className="text-carbs">C {food.carbs}</span>
                <span className="text-fat">F {food.fat}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => onAdd(food)}
                className="rounded-xl bg-matcha px-3 py-2 text-sm font-semibold text-paper transition hover:bg-matcha-deep active:scale-95"
              >
                + Add
              </button>
              <button
                onClick={() => onDelete(food.id)}
                aria-label={`Remove ${food.name} from saved`}
                className="rounded-lg px-2 py-2 text-xs font-semibold text-ink-3 transition hover:bg-paper-2 hover:text-over"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
