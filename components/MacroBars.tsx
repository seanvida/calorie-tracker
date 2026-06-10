import type { MacroTargets } from "@/lib/nutrition";

interface MacroBarsProps {
  protein: number;
  carbs: number;
  fat: number;
  targets: MacroTargets;
}

const ROWS = [
  { key: "protein", label: "Protein", color: "bg-protein", text: "text-protein" },
  { key: "carbs", label: "Carbs", color: "bg-carbs", text: "text-carbs" },
  { key: "fat", label: "Fat", color: "bg-fat", text: "text-fat" },
] as const;

/** Three macro rows, each a labelled progress bar toward its gram target. */
export default function MacroBars({ protein, carbs, fat, targets }: MacroBarsProps) {
  const values = { protein, carbs, fat };

  return (
    <div className="grid grid-cols-3 gap-3">
      {ROWS.map((row) => {
        const value = Math.round(values[row.key]);
        const target = targets[row.key];
        const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
        return (
          <div key={row.key}>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-2">
                {row.label}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className={`nums text-lg font-semibold ${row.text}`}>{value}</span>
              <span className="nums text-[11px] text-ink-3">/ {target}g</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-2">
              <div
                className={`h-full rounded-full ${row.color} transition-[width] duration-700 ease-out`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
