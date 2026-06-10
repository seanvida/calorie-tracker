import { useEffect, useState } from "react";
import type { DaySummary } from "@/lib/types";
import { calorieState } from "@/lib/nutrition";
import { addDays, dayOfMonth, formatDayShort } from "@/lib/date";

interface TrendsViewProps {
  goal: number;
}

const STATE_BG: Record<string, string> = {
  good: "bg-good",
  warn: "bg-warn",
  over: "bg-over",
};

/** Calories vs goal + macro breakdown over the last 30 days. */
export default function TrendsView({ goal }: TrendsViewProps) {
  const [days, setDays] = useState<DaySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/summary")
      .then((r) => r.json())
      .then((d) => {
        // Fill the full from..to range so the axis is continuous (gaps = 0).
        const byDay = new Map<string, DaySummary>((d.days ?? []).map((x: DaySummary) => [x.day, x]));
        const out: DaySummary[] = [];
        for (let day = d.from; day <= d.to; day = addDays(day, 1)) {
          out.push(byDay.get(day) ?? { day, calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 });
        }
        setDays(out);
      })
      .catch(() => setError("Couldn’t load trends."));
  }, []);

  if (error) return <p className="rounded-2xl border border-dashed border-line-2 bg-surface/50 p-6 text-center text-sm text-ink-3">{error}</p>;
  if (!days) return <ChartSkeleton />;

  const logged = days.filter((d) => d.entries > 0);
  if (logged.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-2 bg-surface/50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-matcha-tint text-xl">📈</div>
        <p className="text-sm font-semibold text-ink">Charts appear once you’ve logged a few days</p>
        <p className="mt-1 text-sm text-ink-3">Keep logging your meals and you’ll see calories vs. goal and macro trends here.</p>
      </div>
    );
  }

  const avg = Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length);
  const maxCal = Math.max(goal, ...days.map((d) => d.calories)) * 1.1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Days logged" value={`${logged.length}`} />
        <Stat label="Avg calories" value={`${avg}`} sub={`goal ${goal}`} />
      </div>

      {/* Calories vs goal */}
      <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Calories vs goal</h3>
          <span className="text-[11px] text-ink-3">last {days.length} days</span>
        </header>
        <div className="relative h-40">
          {/* goal line */}
          <div
            className="absolute inset-x-0 border-t border-dashed border-matcha/60"
            style={{ bottom: `${(goal / maxCal) * 100}%` }}
          >
            <span className="absolute -top-4 right-0 text-[10px] font-semibold text-matcha">goal</span>
          </div>
          <div className="flex h-full items-end gap-[3px]">
            {days.map((d) => (
              <div
                key={d.day}
                title={`${formatDayShort(d.day)} · ${d.calories} kcal`}
                className={`flex-1 rounded-t-sm ${d.entries ? STATE_BG[calorieState(d.calories, goal)] : "bg-line"}`}
                style={{ height: `${Math.max(d.entries ? 3 : 1, (d.calories / maxCal) * 100)}%` }}
              />
            ))}
          </div>
        </div>
        <Axis days={days} />
      </section>

      {/* Macro breakdown (stacked by kcal contribution) */}
      <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Macro breakdown</h3>
          <Legend />
        </header>
        <div className="flex h-40 items-end gap-[3px]">
          {days.map((d) => {
            const p = d.protein * 4, c = d.carbs * 4, f = d.fat * 9;
            const tot = p + c + f;
            const h = (d.calories / maxCal) * 100;
            return (
              <div key={d.day} title={`${formatDayShort(d.day)} · P${d.protein} C${d.carbs} F${d.fat}`} className="flex flex-1 flex-col-reverse" style={{ height: `${Math.max(d.entries ? 3 : 0, h)}%` }}>
                {tot > 0 && <>
                  <div className="bg-protein" style={{ height: `${(p / tot) * 100}%` }} />
                  <div className="bg-carbs" style={{ height: `${(c / tot) * 100}%` }} />
                  <div className="rounded-t-sm bg-fat" style={{ height: `${(f / tot) * 100}%` }} />
                </>}
              </div>
            );
          })}
        </div>
        <Axis days={days} />
      </section>
    </div>
  );
}

function Axis({ days }: { days: DaySummary[] }) {
  const step = Math.ceil(days.length / 6);
  return (
    <div className="flex gap-[3px] text-[9px] text-ink-3">
      {days.map((d, i) => (
        <span key={d.day} className="flex-1 text-center">{i % step === 0 ? dayOfMonth(d.day) : ""}</span>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-2 text-[10px] text-ink-3">
      <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-protein" />P</span>
      <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-carbs" />C</span>
      <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-fat" />F</span>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <p className="text-[11px] text-ink-3">{label}</p>
      <p className="nums font-display text-2xl font-semibold text-ink">{value}</p>
      {sub && <p className="nums text-[11px] text-ink-3">{sub}</p>}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="space-y-3"><div className="h-20 animate-pulse rounded-2xl bg-surface/60" /><div className="h-48 animate-pulse rounded-2xl bg-surface/60" /><div className="h-48 animate-pulse rounded-2xl bg-surface/60" /></div>;
}
