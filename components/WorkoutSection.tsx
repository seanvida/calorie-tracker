"use client";

import { useState } from "react";
import type { NewWorkoutEntry, WorkoutEntry } from "@/lib/types";
import type { WorkoutEstimate } from "@/lib/gemini";
import Spinner from "./Spinner";
import ErrorNote from "./ErrorNote";

interface WorkoutSectionProps {
  workouts: WorkoutEntry[];
  burned: number;
  onAdd: (w: Omit<NewWorkoutEntry, "day">) => Promise<boolean>;
  onDelete: (id: number) => void;
}

/** Day-view workout log: describe a workout → AI estimates calories → edit → save. */
export default function WorkoutSection({ workouts, burned, onAdd, onDelete }: WorkoutSectionProps) {
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [est, setEst] = useState<WorkoutEstimate | null>(null);

  async function estimate() {
    const description = desc.trim();
    if (!description) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workouts/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn’t estimate this workout.");
      setEst(data as WorkoutEstimate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!est) return;
    setSaving(true);
    const ok = await onAdd({
      activity: est.activity.trim() || "Workout",
      durationMin: est.durationMin > 0 ? est.durationMin : null,
      calories: Math.max(0, Math.round(est.calories)),
      notes: desc.trim() || null,
    });
    setSaving(false);
    if (ok) {
      setEst(null);
      setDesc("");
    }
  }

  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-paper-2/40 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Workouts</h2>
        {burned > 0 && (
          <span className="nums text-sm font-semibold text-matcha-deep">🔥 {burned} kcal burned</span>
        )}
      </div>

      {/* Logged workouts */}
      {workouts.length > 0 && (
        <div className="space-y-2">
          {workouts.map((w) => (
            <div key={w.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{w.activity}</p>
                <p className="nums text-xs text-ink-3">
                  {w.durationMin ? `${w.durationMin} min · ` : ""}
                  {w.calories} kcal
                </p>
              </div>
              <button
                onClick={() => onDelete(w.id)}
                aria-label={`Remove ${w.activity}`}
                className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-3 transition hover:bg-paper-2 hover:text-over"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Describe → estimate */}
      {!est && (
        <div className="space-y-2">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Describe your workout — e.g. ran 5k, 45 min cycling, 30 min strength…"
            rows={2}
            className="w-full resize-none rounded-2xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-matcha"
          />
          <button
            onClick={estimate}
            disabled={loading || !desc.trim()}
            className="w-full rounded-xl bg-matcha px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-matcha-deep active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? <Spinner label="Estimating…" /> : "Estimate calories"}
          </button>
        </div>
      )}

      {error && <ErrorNote message={error} onDismiss={() => setError(null)} />}

      {/* Editable estimate → save */}
      {est && (
        <div className="animate-scale-in space-y-3 rounded-2xl border border-matcha/30 bg-matcha-tint p-3">
          {est.note && <p className="rounded-lg bg-surface/70 px-2.5 py-2 text-[11px] leading-relaxed text-ink-3">{est.note}</p>}
          <input
            type="text"
            value={est.activity}
            onChange={(e) => setEst({ ...est, activity: e.target.value })}
            placeholder="Activity"
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm font-semibold text-ink outline-none transition focus:border-matcha"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Minutes</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={est.durationMin || ""}
                onChange={(e) => setEst({ ...est, durationMin: num(e.target.value) })}
                className="nums w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none transition focus:border-matcha"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Calories</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={est.calories}
                onChange={(e) => setEst({ ...est, calories: num(e.target.value) })}
                className="nums w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none transition focus:border-matcha"
              />
            </label>
          </div>
          <div className="flex items-center gap-3 pt-0.5">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-matcha px-4 py-2 text-sm font-semibold text-paper transition hover:bg-matcha-deep active:scale-95 disabled:opacity-50"
            >
              {saving ? <Spinner label="Adding…" /> : "Add workout"}
            </button>
            <button
              onClick={() => setEst(null)}
              disabled={saving}
              className="text-sm font-semibold text-ink-2 transition hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
