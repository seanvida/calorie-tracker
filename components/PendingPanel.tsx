import type { PendingItem } from "@/lib/types";
import PendingItemCard from "./PendingItemCard";
import Spinner from "./Spinner";

interface PendingPanelProps {
  items: PendingItem[];
  note?: string | null;
  onChangeItem: (key: string, patch: Partial<PendingItem>) => void;
  onRemoveItem: (key: string) => void;
  onCommit: () => void;
  onClear: () => void;
  adding: boolean;
}

/**
 * Review-before-commit area. Every add path (quick-add, text, photo) funnels
 * here: the user edits each item — name, serving, 0.5-step servings, macros —
 * and nothing is saved until "Add meal".
 */
export default function PendingPanel({
  items,
  note,
  onChangeItem,
  onRemoveItem,
  onCommit,
  onClear,
  adding,
}: PendingPanelProps) {
  if (items.length === 0) return null;

  const totalCals = Math.round(items.reduce((s, it) => s + (it.calories || 0), 0));
  const removable = items.length > 1;

  return (
    <div className="animate-scale-in space-y-3 rounded-2xl border border-matcha/30 bg-matcha-tint p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">
          Review {items.length} item{items.length > 1 ? "s" : ""} before adding
        </p>
        <span className="nums text-xs text-ink-2">{totalCals} kcal total</span>
      </div>

      {note && (
        <p className="rounded-lg bg-surface/70 px-2.5 py-2 text-[11px] leading-relaxed text-ink-3">
          {note}
        </p>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <PendingItemCard
            key={item.key}
            item={item}
            onChange={(patch) => onChangeItem(item.key, patch)}
            onRemove={removable ? () => onRemoveItem(item.key) : undefined}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 pt-0.5">
        <button
          onClick={onCommit}
          disabled={adding}
          className="rounded-xl bg-matcha px-4 py-2 text-sm font-semibold text-paper transition hover:bg-matcha-deep active:scale-95 disabled:opacity-50"
        >
          {adding ? <Spinner label="Adding…" /> : `Add meal${items.length > 1 ? ` (${items.length})` : ""}`}
        </button>
        <button
          onClick={onClear}
          disabled={adding}
          className="text-sm font-semibold text-ink-2 transition hover:text-ink disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
