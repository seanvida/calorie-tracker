import type { DisplayFood, Food } from "@/lib/types";
import FoodCard from "./FoodCard";

interface FoodListProps {
  foods: Food[];
  onAdd: (food: DisplayFood) => void;
  busyName?: string | null;
}

/** Groups the (already filtered) foods by category and renders cards. */
export default function FoodList({ foods, onAdd, busyName }: FoodListProps) {
  if (foods.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line-2 bg-surface/50 p-6 text-center text-sm text-ink-3">
        No foods match your search.
      </p>
    );
  }

  const categories = Array.from(new Set(foods.map((f) => f.category)));

  return (
    <div className="space-y-5">
      {categories.map((category) => (
        <section key={category}>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            {category}
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {foods
              .filter((f) => f.category === category)
              .map((food) => (
                <FoodCard key={food.id} food={food} onAdd={onAdd} busy={busyName === food.name} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
