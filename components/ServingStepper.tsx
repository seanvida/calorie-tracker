interface ServingStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  max?: number;
}

/** Compact − / value / + control for the serving multiplier (0.25 steps). */
export default function ServingStepper({
  value,
  onChange,
  min = 0.25,
  step = 0.25,
  max = 50,
}: ServingStepperProps) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, Math.round(next * 4) / 4)));
  const label = Number.isInteger(value) ? `${value}` : String(Math.round(value * 100) / 100);

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-0.5">
      <button
        type="button"
        onClick={() => set(value - step)}
        disabled={value <= min}
        aria-label="Fewer servings"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-2 transition hover:bg-paper-2 disabled:opacity-30"
      >
        −
      </button>
      <span className="nums min-w-[3ch] text-center text-sm font-semibold text-ink">
        {label}
      </span>
      <button
        type="button"
        onClick={() => set(value + step)}
        disabled={value >= max}
        aria-label="More servings"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-2 transition hover:bg-paper-2 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
