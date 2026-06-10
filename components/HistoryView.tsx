import { useEffect, useState } from "react";
import type { DaySummary } from "@/lib/types";
import { calorieState } from "@/lib/nutrition";
import { formatDayLong, todayKey, addDays } from "@/lib/date";

interface HistoryViewProps {
  goal: number;
  onOpenDay: (day: string) => void;
}

const STATE_BG: Record<string, string> = { good: "bg-good", warn: "bg-warn", over: "bg-over" };

/** List of past days with their daily totals; tap a day to open it. */
export default function HistoryView({ goal, onOpenDay }: HistoryViewProps) {
  const [days, setDays] = useState<DaySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/summary")
      .then((r) => r.json())
      .then((d) => setDays((d.days ?? []).filter((x: DaySummary) => x.entries > 0)))
      .catch(() => setError("Couldn’t load history."));
  }, []);

  if (error) return <p className="rounded-2xl border border-dashed border-line-2 bg-surface/50 p-6 text-center text-sm text-ink-3">{error}</p>;
  if (!days) return <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface/60" />)}</div>;
  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-2 bg-surface/50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-matcha-tint text-xl">🗓️</div>
        <p className="text-sm font-semibold text-ink">No past days logged yet</p>
        <p className="mt-1 text-sm text-ink-3">Your history builds as you go — log a meal today to get started.</p>
      </div>
    );
  }

  const today = todayKey();
  const label = (day: string) => (day === today ? "Today" : day === addDays(today, -1) ? "Yesterday" : formatDayLong(day));

  return (
    <div className="space-y-2">
      {days.map((d) => {
        const pct = Math.min(100, Math.round((d.calories / goal) * 100));
        return (
          <button
            key={d.day}
            onClick={() => onOpenDay(d.day)}
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-line-2 hover:shadow-card active:scale-[0.99]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{label(d.day)}</p>
              <p className="nums mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-ink-3">
                <span className="text-protein">P {d.protein}</span>
                <span className="text-carbs">C {d.carbs}</span>
                <span className="text-fat">F {d.fat}</span>
                <span>· {d.entries} item{d.entries > 1 ? "s" : ""}</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2">
                <div className={`h-full rounded-full ${STATE_BG[calorieState(d.calories, goal)]}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="nums font-display text-lg font-semibold text-ink">{d.calories}</p>
              <p className="nums text-[10px] text-ink-3">/ {goal}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
