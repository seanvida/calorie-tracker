import type { NutritionResult } from "@/lib/gemini";
import Spinner from "./Spinner";

interface AiResultPanelProps {
  result: NutritionResult;
  selected: Set<number>;
  onToggle: (index: number) => void;
  onAdd: () => void;
  onDiscard: () => void;
  adding: boolean;
}

/**
 * Shows the foods Gemini identified and lets the user confirm which ones to
 * log. Used by both the text and photo lookup flows.
 */
export default function AiResultPanel({
  result,
  selected,
  onToggle,
  onAdd,
  onDiscard,
  adding,
}: AiResultPanelProps) {
  const { items, note } = result;

  if (items.length === 0) {
    return (
      <div className="animate-scale-in space-y-3 rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm font-semibold text-ink">No foods were identified.</p>
        {note && <p className="text-xs leading-relaxed text-ink-3">{note}</p>}
        <button onClick={onDiscard} className="text-xs font-semibold text-ink-2 hover:text-ink">
          Try again
        </button>
      </div>
    );
  }

  const selectedCount = selected.size;

  return (
    <div className="animate-scale-in space-y-3 rounded-2xl border border-matcha/30 bg-matcha-tint p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">
          AI found {items.length} item{items.length > 1 ? "s" : ""} — confirm to add
        </p>
        <span className="nums text-xs text-ink-3">{selectedCount} selected</span>
      </div>

      <ul className="space-y-2">
        {items.map((item, i) => {
          const isSelected = selected.has(i);
          return (
            <li key={i}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-surface p-3 transition ${
                  isSelected ? "border-matcha/50 ring-1 ring-matcha/30" : "border-line"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(i)}
                  className="h-4 w-4 shrink-0 accent-matcha"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{item.name}</p>
                  {item.serving && <p className="truncate text-xs text-ink-3">{item.serving}</p>}
                  <div className="nums mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-ink-3">
                    <span className="font-semibold text-ink">{item.calories} kcal</span>
                    <span className="text-protein">P {item.protein}</span>
                    <span className="text-carbs">C {item.carbs}</span>
                    <span className="text-fat">F {item.fat}</span>
                  </div>
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      {note && <p className="text-xs leading-relaxed text-ink-3">{note}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onAdd}
          disabled={adding || selectedCount === 0}
          className="rounded-xl bg-matcha px-4 py-2 text-sm font-semibold text-paper transition hover:bg-matcha-deep active:scale-95 disabled:opacity-50"
        >
          {adding ? <Spinner label="Adding…" /> : `Add ${selectedCount} to log`}
        </button>
        <button
          onClick={onDiscard}
          disabled={adding}
          className="text-sm font-semibold text-ink-2 transition hover:text-ink disabled:opacity-50"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
