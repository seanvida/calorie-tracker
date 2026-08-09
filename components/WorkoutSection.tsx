"use client";

import { useMemo, useState } from "react";
import type { NewWorkoutEntry, WorkoutEntry } from "@/lib/types";
import { ACTIVITIES, INTENSITIES, caloriesBurned } from "@/lib/workouts";
import Spinner from "./Spinner";

interface WorkoutSectionProps {
  workouts: WorkoutEntry[];
  burned: number;
  /** Body weight (kg) from the profile; needed to compute calories. */
  weightKg: number | null;
  onAdd: (w: Omit<NewWorkoutEntry, "day">) => Promise<boolean>;
  onDelete: (id: number) => void;
  onSaveWeight: (kg: number) => void;
}

/** Day-view workout log: pick an activity + minutes → MET-based calories (no AI). */
export default function WorkoutSection({
  workouts,
  burned,
  weightKg,
  onAdd,
  onDelete,
  onSaveWeight,
}: WorkoutSectionProps) {
  const [activityId, setActivityId] = useState(ACTIVITIES[0].id);
  const [intensityId, setIntensityId] = useState("moderate");
  const [minutes, setMinutes] = useState("30");
  const [caloriesEdit, setCaloriesEdit] = useState<number | null>(null); // manual override
  const [saving, setSaving] = useState(false);
  const [weightDraft, setWeightDraft] = useState("");

  const activity = ACTIVITIES.find((a) => a.id === activityId) ?? ACTIVITIES[0];
  const intensity = INTENSITIES.find((i) => i.id === intensityId) ?? INTENSITIES[1];
  const mins = Number(minutes) || 0;

  // Auto-computed calories; a manual edit (caloriesEdit) takes precedence until
  // the inputs change again.
  const computed = useMemo(
    () => caloriesBurned(activity.met * intensity.factor, weightKg ?? 0, mins),
    [activity.met, intensity.factor, weightKg, mins],
  );
  const calories = caloriesEdit ?? computed;

  function pick<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setCaloriesEdit(null); // recompute when any input changes
    };
  }

  async function save() {
    if (!weightKg || mins <= 0 || calories <= 0) return;
    setSaving(true);
    const ok = await onAdd({
      activity: `${activity.name} (${intensity.label})`,
      durationMin: mins,
      calories: Math.round(calories),
      notes: null,
    });
    setSaving(false);
    if (ok) {
      setMinutes("30");
      setCaloriesEdit(null);
    }
  }

  function submitWeight() {
    const kg = Math.round(Number(weightDraft));
    if (Number.isFinite(kg) && kg >= 20 && kg <= 400) onSaveWeight(kg);
  }

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

      {weightKg == null ? (
        // Need body weight to estimate calories — collect it once (saved to profile).
        <div className="space-y-2 rounded-2xl border border-line bg-surface p-3">
          <p className="text-sm text-ink-2">Set your weight to estimate calories burned.</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={20}
              max={400}
              value={weightDraft}
              onChange={(e) => setWeightDraft(e.target.value)}
              placeholder="Weight"
              className="nums w-28 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none transition focus:border-matcha"
            />
            <span className="text-xs text-ink-3">kg</span>
            <button
              onClick={submitWeight}
              disabled={!weightDraft}
              className="ml-auto rounded-xl bg-matcha px-4 py-2 text-sm font-semibold text-paper transition hover:bg-matcha-deep active:scale-95 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Activity</span>
              <select
                value={activityId}
                onChange={(e) => pick(setActivityId)(e.target.value)}
                className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink outline-none transition focus:border-matcha"
              >
                {ACTIVITIES.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Intensity</span>
              <select
                value={intensityId}
                onChange={(e) => pick(setIntensityId)(e.target.value)}
                className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink outline-none transition focus:border-matcha"
              >
                {INTENSITIES.map((i) => (
                  <option key={i.id} value={i.id}>{i.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Minutes</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={minutes}
                onChange={(e) => pick(setMinutes)(e.target.value)}
                className="nums rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink outline-none transition focus:border-matcha"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Calories</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={calories || ""}
                onChange={(e) => setCaloriesEdit(e.target.value === "" ? 0 : Number(e.target.value))}
                className="nums rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink outline-none transition focus:border-matcha"
              />
            </label>
          </div>

          <button
            onClick={save}
            disabled={saving || mins <= 0 || calories <= 0}
            className="w-full rounded-xl bg-matcha px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-matcha-deep active:scale-[0.99] disabled:opacity-50"
          >
            {saving ? <Spinner label="Adding…" /> : `Add workout · ${Math.round(calories)} kcal`}
          </button>
          <p className="px-1 text-[11px] text-ink-3">
            Estimated from {activity.name.toLowerCase()} × {weightKg} kg × {mins} min. Edit calories if you know better.
          </p>
        </div>
      )}
    </section>
  );
}
