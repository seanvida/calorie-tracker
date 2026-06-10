import { useState } from "react";
import type { Profile } from "@/lib/types";
import { macroTargets, resolveMacroTargets, suggestGoal } from "@/lib/nutrition";

interface ProfileViewProps {
  profile: Profile;
  onSaved: (p: Profile) => void;
}

const ACTIVITIES = [
  { label: "Sedentary", value: 1.2 },
  { label: "Light", value: 1.375 },
  { label: "Moderate", value: 1.55 },
  { label: "Active", value: 1.725 },
  { label: "Very active", value: 1.9 },
];

const numOrNull = (s: string): number | null => (s.trim() === "" ? null : Number(s));

/** Editable single-user profile: name, goal, macro targets, and body stats. */
export default function ProfileView({ profile, onSaved }: ProfileViewProps) {
  const [form, setForm] = useState<Profile>(profile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const derived = resolveMacroTargets(form.calorieGoal || 2000, {
    protein: form.proteinTarget,
    carbs: form.carbsTarget,
    fat: form.fatTarget,
  });
  const suggestion = suggestGoal(form);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn’t save.");
      onSaved(data.profile);
      setForm(data.profile);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Section title="You">
        <Field label="Name (optional)">
          <input type="text" value={form.name ?? ""} onChange={(e) => set("name", e.target.value || null)} placeholder="Your name" className={inputCls} />
        </Field>
      </Section>

      <Section title="Daily goal">
        <Field label="Calorie goal (kcal)">
          <input type="number" inputMode="numeric" value={form.calorieGoal} onChange={(e) => set("calorieGoal", Number(e.target.value))} className={inputCls} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Protein (g)"><input type="number" inputMode="numeric" value={form.proteinTarget ?? ""} placeholder={`${macroTargets(form.calorieGoal || 2000).protein}`} onChange={(e) => set("proteinTarget", numOrNull(e.target.value))} className={inputCls} /></Field>
          <Field label="Carbs (g)"><input type="number" inputMode="numeric" value={form.carbsTarget ?? ""} placeholder={`${macroTargets(form.calorieGoal || 2000).carbs}`} onChange={(e) => set("carbsTarget", numOrNull(e.target.value))} className={inputCls} /></Field>
          <Field label="Fat (g)"><input type="number" inputMode="numeric" value={form.fatTarget ?? ""} placeholder={`${macroTargets(form.calorieGoal || 2000).fat}`} onChange={(e) => set("fatTarget", numOrNull(e.target.value))} className={inputCls} /></Field>
        </div>
        <p className="text-[11px] text-ink-3">Targets in use: <span className="nums font-semibold text-ink-2">P {derived.protein} · C {derived.carbs} · F {derived.fat}</span> (blank = auto from goal)</p>
      </Section>

      <Section title="Suggest a goal (optional)">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Height (cm)"><input type="number" inputMode="numeric" value={form.heightCm ?? ""} onChange={(e) => set("heightCm", numOrNull(e.target.value))} className={inputCls} /></Field>
          <Field label="Weight (kg)"><input type="number" inputMode="decimal" value={form.weightKg ?? ""} onChange={(e) => set("weightKg", numOrNull(e.target.value))} className={inputCls} /></Field>
          <Field label="Age"><input type="number" inputMode="numeric" value={form.age ?? ""} onChange={(e) => set("age", numOrNull(e.target.value))} className={inputCls} /></Field>
          <Field label="Sex">
            <select value={form.sex ?? ""} onChange={(e) => set("sex", (e.target.value || null) as Profile["sex"])} className={inputCls}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>
        </div>
        <Field label="Activity">
          <select value={form.activity ?? ""} onChange={(e) => set("activity", numOrNull(e.target.value))} className={inputCls}>
            <option value="">—</option>
            {ACTIVITIES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </Field>
        <button
          type="button"
          disabled={suggestion == null}
          onClick={() => suggestion != null && set("calorieGoal", suggestion)}
          className="w-full rounded-xl border border-matcha/40 bg-matcha-tint px-4 py-2.5 text-sm font-semibold text-matcha-deep transition hover:bg-matcha-soft disabled:opacity-40"
        >
          {suggestion != null ? `Use suggested goal: ${suggestion} kcal` : "Fill stats above to suggest a goal"}
        </button>
      </Section>

      {error && <p className="rounded-xl bg-over/10 px-3 py-2 text-sm text-over">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="sticky bottom-20 w-full rounded-2xl bg-matcha px-4 py-3 text-sm font-semibold text-paper shadow-lift transition hover:bg-matcha-deep active:scale-[0.99] disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save profile"}
      </button>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-matcha";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}
