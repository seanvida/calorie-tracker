import type { PendingItem } from "@/lib/types";
import { validateNutrition, type NutritionFlag } from "@/lib/nutrition";
import ServingStepper from "./ServingStepper";

interface PendingItemCardProps {
  item: PendingItem;
  onChange: (patch: Partial<PendingItem>) => void;
  onRemove?: () => void;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * One editable food awaiting confirmation. Calories/macros are the *totals* for
 * the chosen serving count and recompute live as the servings stepper changes.
 * AI-sourced items are sanity-checked and flagged (but stay fully editable).
 */
export default function PendingItemCard({ item, onChange, onRemove }: PendingItemCardProps) {
  const flags = item.source === "ai" ? validateNutrition(item) : [];
  const flagged = (field: NutritionFlag["field"]) => flags.some((f) => f.field === field);

  // Changing servings scales the totals by the ratio.
  function setServings(next: number) {
    const prev = item.servings || 1;
    if (next === prev) return;
    const f = next / prev;
    onChange({
      servings: next,
      calories: Math.round(item.calories * f),
      protein: r1(item.protein * f),
      carbs: r1(item.carbs * f),
      fat: r1(item.fat * f),
    });
  }

  const num = (v: string) => (v === "" ? 0 : Number(v));

  const macroField = (
    field: "calories" | "protein" | "carbs" | "fat",
    label: string,
    tone: string,
  ) => (
    <label className="flex flex-col gap-1">
      <span className={`text-[10px] font-semibold uppercase tracking-wide ${tone}`}>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={item[field]}
        onChange={(e) => onChange({ [field]: num(e.target.value) } as Partial<PendingItem>)}
        className={`nums w-full rounded-lg border bg-surface px-2 py-1.5 text-sm text-ink outline-none transition focus:border-matcha ${
          flagged(field) ? "border-warn ring-1 ring-warn/40" : "border-line"
        }`}
      />
    </label>
  );

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-3">
      <div className="flex items-start gap-2">
        <input
          type="text"
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Food name"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm font-semibold text-ink outline-none transition focus:border-matcha"
        />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove item"
            className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-3 transition hover:bg-paper-2 hover:text-over"
          >
            Remove
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={item.serving}
          onChange={(e) => onChange({ serving: e.target.value })}
          placeholder="Serving (e.g. 1 bowl)"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-2 outline-none transition focus:border-matcha"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ink-3">servings</span>
          <ServingStepper value={item.servings} onChange={setServings} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {macroField("calories", "kcal", "text-ink-2")}
        {macroField("protein", "P", "text-protein")}
        {macroField("carbs", "C", "text-carbs")}
        {macroField("fat", "F", "text-fat")}
      </div>

      {flags.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-warn/10 px-2.5 py-2 text-[11px] text-over">
          {flags.map((f, i) => (
            <li key={i} className="flex gap-1.5">
              <span aria-hidden>⚠</span>
              <span>{f.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
