import type { LogEntry } from "@/lib/types";

interface FoodEntryCardProps {
  entry: LogEntry;
  onDelete: (id: number) => void;
  onUpdateQty: (id: number, qty: number) => void;
  deleting: boolean;
  updating: boolean;
}

const MAX_QTY = 99;

/** A single logged food, shown as a card with an editable serving stepper. */
export default function FoodEntryCard({
  entry,
  onDelete,
  onUpdateQty,
  deleting,
  updating,
}: FoodEntryCardProps) {
  const q = entry.qty;
  const busy = deleting || updating;

  return (
    <div
      className={`group flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-card transition duration-200 ${
        deleting ? "opacity-40" : "hover:-translate-y-0.5 hover:border-line-2 hover:shadow-lift"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-ink">{entry.foodName}</p>
        <p className="truncate text-xs text-ink-3">{entry.serving}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Macro tone="protein" label="P" value={entry.protein * q} />
          <Macro tone="carbs" label="C" value={entry.carbs * q} />
          <Macro tone="fat" label="F" value={entry.fat * q} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="nums text-[15px] font-semibold text-ink">
          {Math.round(entry.calories * q)}
          <span className="ml-0.5 text-[10px] font-medium text-ink-3">kcal</span>
        </span>

        {/* Serving (quantity) stepper */}
        <div className="flex items-center gap-1 rounded-full border border-line bg-paper p-0.5">
          <StepButton
            label={`Decrease servings of ${entry.foodName}`}
            disabled={busy || q <= 1}
            onClick={() => onUpdateQty(entry.id, q - 1)}
          >
            <path strokeLinecap="round" d="M5 12h14" />
          </StepButton>
          <span className="nums w-7 text-center text-[13px] font-semibold tabular-nums text-ink" aria-live="polite">
            {q}
          </span>
          <StepButton
            label={`Increase servings of ${entry.foodName}`}
            disabled={busy || q >= MAX_QTY}
            onClick={() => onUpdateQty(entry.id, q + 1)}
          >
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </StepButton>
        </div>
      </div>

      <button
        onClick={() => onDelete(entry.id)}
        disabled={busy}
        className="flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-full text-ink-3 transition hover:bg-[#F6DDD4] hover:text-over disabled:opacity-40"
        aria-label={`Remove ${entry.foodName}`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function StepButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded-full text-ink-2 transition hover:bg-paper-2 hover:text-ink disabled:opacity-30"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        {children}
      </svg>
    </button>
  );
}

function Macro({ tone, label, value }: { tone: "protein" | "carbs" | "fat"; label: string; value: number }) {
  const dot = tone === "protein" ? "bg-protein" : tone === "carbs" ? "bg-carbs" : "bg-fat";
  return (
    <span className="nums inline-flex items-center gap-1 rounded-md bg-paper-2 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-2">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label} {Math.round(value)}g
    </span>
  );
}
