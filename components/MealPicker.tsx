import { MEALS, type MealCategory } from "@/lib/types";

interface MealPickerProps {
  value: MealCategory;
  onChange: (meal: MealCategory) => void;
}

/** Choose which meal newly-added foods are filed under. */
export default function MealPicker({ value, onChange }: MealPickerProps) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
        Add to
      </p>
      <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-line bg-surface p-1.5">
        {MEALS.map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            aria-pressed={value === m}
            className={`rounded-xl px-2 py-1.5 text-xs font-semibold transition ${
              value === m
                ? "bg-matcha text-paper shadow-sm"
                : "text-ink-2 hover:bg-paper-2"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
