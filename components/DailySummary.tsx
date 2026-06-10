"use client";

import { useState } from "react";
import type { DailyTotals } from "@/lib/types";
import { calorieState, macroTargets, type ProgressState } from "@/lib/nutrition";
import MacroBars from "./MacroBars";

interface DailySummaryProps {
  totals: DailyTotals;
  goal: number;
  onGoalChange: (goal: number) => void;
}

const STATE_STYLES: Record<ProgressState, { bar: string; chip: string; label: (n: number) => string }> = {
  good: {
    bar: "bg-good",
    chip: "bg-matcha-soft text-matcha-deep",
    label: (n) => `${n} kcal left`,
  },
  warn: {
    bar: "bg-warn",
    chip: "bg-[#F7E8CF] text-[#8A6516]",
    label: (n) => `${n} kcal left`,
  },
  over: {
    bar: "bg-over",
    chip: "bg-[#F6DDD4] text-[#8E3318]",
    label: (n) => `${n} kcal over`,
  },
};

/** The hero card: calories vs goal with a traffic-light bar, plus macros. */
export default function DailySummary({ totals, goal, onGoalChange }: DailySummaryProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(goal));

  const consumed = Math.round(totals.calories);
  const state = calorieState(consumed, goal);
  const style = STATE_STYLES[state];
  const remaining = Math.abs(goal - consumed);
  const pct = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;

  function commit() {
    const n = Math.max(0, Math.round(Number(draft)));
    if (Number.isFinite(n) && n > 0) onGoalChange(n);
    else setDraft(String(goal));
    setEditing(false);
  }

  return (
    <section className="animate-fade-up rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            Eaten today
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="nums font-display text-5xl font-semibold leading-none text-ink sm:text-6xl">
              {consumed.toLocaleString()}
            </span>
            <span className="nums whitespace-nowrap text-sm font-medium text-ink-3">
              / {goal.toLocaleString()} kcal
            </span>
          </div>
        </div>

        <span className={`nums shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${style.chip}`}>
          {style.label(remaining)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-paper-2">
        <div
          className={`h-full rounded-full ${style.bar} transition-[width] duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Goal control */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-ink-3">Daily goal</span>
        {editing ? (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setDraft(String(goal));
                  setEditing(false);
                }
              }}
              className="nums w-20 rounded-lg border border-line-2 bg-paper px-2 py-1 text-right text-sm font-semibold text-ink outline-none focus:border-matcha"
            />
            <span className="text-xs text-ink-3">kcal</span>
          </span>
        ) : (
          <button
            onClick={() => {
              setDraft(String(goal));
              setEditing(true);
            }}
            className="nums inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-ink transition hover:bg-paper-2"
          >
            {goal.toLocaleString()} kcal
            <svg className="h-3.5 w-3.5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>

      <div className="my-5 h-px bg-line" />

      <MacroBars
        protein={totals.protein}
        carbs={totals.carbs}
        fat={totals.fat}
        targets={macroTargets(goal)}
      />
    </section>
  );
}
