"use client";

import { useState } from "react";
import type { Profile } from "@/lib/types";
import { DEFAULT_GOAL } from "@/lib/nutrition";

interface OnboardingProps {
  profile: Profile;
  onDone: (p: Profile) => void;
}

/**
 * Lightweight, skippable first-run welcome. Three short steps: what the app is,
 * set name + goal, and the three ways to add food. Saving (or skipping) flips
 * `onboarded` on the profile so it never shows again.
 */
export default function Onboarding({ profile, onDone }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.name ?? "");
  const [goal, setGoal] = useState(profile.calorieGoal || DEFAULT_GOAL);
  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    const next: Profile = {
      ...profile,
      name: name.trim() || null,
      calorieGoal: Number(goal) > 0 ? Number(goal) : DEFAULT_GOAL,
      onboarded: true,
    };
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await res.json().catch(() => null);
      onDone(data?.profile ?? next);
    } catch {
      onDone(next); // never trap the user if the save fails
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-3 backdrop-blur-sm sm:items-center" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="animate-scale-in w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface shadow-lift">
        {/* progress dots */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-matcha" : "w-1.5 bg-line-2"}`} />
            ))}
          </div>
          {step < 2 && (
            <button onClick={finish} disabled={saving} className="text-xs font-semibold text-ink-3 transition hover:text-ink-2 disabled:opacity-50">
              Skip
            </button>
          )}
        </div>

        <div className="px-6 pb-6 pt-5">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-matcha-tint text-2xl">🍽️</div>
              <div className="space-y-1.5">
                <h2 className="font-display text-2xl font-semibold text-ink">Welcome to Calorie Tracker</h2>
                <p className="text-sm leading-relaxed text-ink-2">
                  Log everyday meals and watch your daily calories &amp; macros — built for Indian food, no fuss.
                </p>
              </div>
              <button onClick={() => setStep(1)} className={primaryBtn}>Get started</button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h2 className="font-display text-2xl font-semibold text-ink">Set your goal</h2>
                <p className="text-sm text-ink-2">Just two things to start. You can change these anytime in Profile.</p>
              </div>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-ink-2">Your name (optional)</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rohit" className={inputCls} />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-ink-2">Daily calorie goal</span>
                <input type="number" inputMode="numeric" value={goal} onChange={(e) => setGoal(Number(e.target.value))} className={`${inputCls} nums`} />
                <span className="text-[11px] text-ink-3">Macro targets default to a balanced 30 / 45 / 25 split — tweak later if you like.</span>
              </label>
              <button onClick={() => setStep(2)} className={primaryBtn}>Continue</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h2 className="font-display text-2xl font-semibold text-ink">Three ways to add food</h2>
                <p className="text-sm text-ink-2">Whatever's quickest in the moment:</p>
              </div>
              <ul className="space-y-2.5">
                <Way icon="🔍" title="Quick add" desc="Search thousands of foods and tap to add." />
                <Way icon="✍️" title="Describe it" desc="Type a meal in plain English; AI estimates it." />
                <Way icon="📷" title="Snap a photo" desc="Take a meal photo and let AI identify it." />
              </ul>
              <button onClick={finish} disabled={saving} className={primaryBtn}>{saving ? "Setting up…" : "Start tracking"}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const primaryBtn = "w-full rounded-2xl bg-matcha px-4 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-matcha-deep active:scale-[0.99] disabled:opacity-50";
const inputCls = "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-matcha";

function Way({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-line bg-paper-2/40 p-3">
      <span className="text-xl leading-none">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-ink-3">{desc}</p>
      </div>
    </li>
  );
}
