import type { Food } from "@/lib/types";

interface FoodCardProps {
  food: Food;
  onAdd: (food: Food) => void;
  busy?: boolean;
}

export default function FoodCard({ food, onAdd, busy }: FoodCardProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card transition hover:border-line-2 hover:shadow-lift">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{food.name}</p>
        <p className="truncate text-xs text-ink-3">{food.serving}</p>
        <div className="nums mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-3">
          <span className="font-semibold text-ink">{food.calories} kcal</span>
          <span className="text-protein">P {food.protein}</span>
          <span className="text-carbs">C {food.carbs}</span>
          <span className="text-fat">F {food.fat}</span>
        </div>
      </div>
      <button
        onClick={() => onAdd(food)}
        disabled={busy}
        className="shrink-0 rounded-xl bg-matcha px-3.5 py-2 text-sm font-semibold text-paper transition hover:bg-matcha-deep active:scale-95 disabled:opacity-50"
      >
        + Add
      </button>
    </div>
  );
}
