"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FOODS } from "@/lib/foods";
import {
  MEALS,
  type CatalogFood,
  type DailyTotals,
  type DisplayFood,
  type LogEntry,
  type MealCategory,
  type PendingItem,
} from "@/lib/types";
import type { NutritionItem, NutritionResult } from "@/lib/gemini";
import { DEFAULT_GOAL, mealForHour, resolveMacroTargets } from "@/lib/nutrition";
import { todayKey } from "@/lib/date";
import { compressImage } from "@/lib/image";
import type { Profile } from "@/lib/types";
import AppHeader from "@/components/AppHeader";
import DailySummary from "@/components/DailySummary";
import MealSection from "@/components/MealSection";
import MealPicker from "@/components/MealPicker";
import SearchBar from "@/components/SearchBar";
import FoodList from "@/components/FoodList";
import FoodCard from "@/components/FoodCard";
import TextPanel from "@/components/TextPanel";
import PhotoPanel from "@/components/PhotoPanel";
import PendingPanel from "@/components/PendingPanel";
import ErrorNote from "@/components/ErrorNote";
import BottomNav, { type View } from "@/components/BottomNav";
import DateNav from "@/components/DateNav";
import HistoryView from "@/components/HistoryView";
import TrendsView from "@/components/TrendsView";
import ProfileView from "@/components/ProfileView";
import Onboarding from "@/components/Onboarding";

const DEFAULT_PROFILE: Profile = {
  name: null,
  calorieGoal: DEFAULT_GOAL,
  proteinTarget: null,
  carbsTarget: null,
  fatTarget: null,
  heightCm: null,
  weightKg: null,
  age: null,
  sex: null,
  activity: null,
  // If the profile can't load, don't trap the user in onboarding they can't save.
  onboarded: true,
};

type Mode = "quick" | "describe" | "photo";
const MODES: { id: Mode; label: string }[] = [
  { id: "quick", label: "Quick add" },
  { id: "describe", label: "Describe" },
  { id: "photo", label: "Photo" },
];

interface LogPayload {
  foodName: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function Home() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Which tab + which day we're viewing.
  const [view, setView] = useState<View>("day");
  const [selectedDate, setSelectedDate] = useState(todayKey());

  // Profile (from Supabase) drives the daily goal + macro targets.
  const [profile, setProfile] = useState<Profile | null>(null);
  const goal = profile?.calorieGoal ?? DEFAULT_GOAL;
  const targets = resolveMacroTargets(goal, {
    protein: profile?.proteinTarget,
    carbs: profile?.carbsTarget,
    fat: profile?.fatTarget,
  });

  // Add-food UI.
  const [mode, setMode] = useState<Mode>("quick");
  const [mealTarget, setMealTarget] = useState<MealCategory>("Snack");
  const [query, setQuery] = useState("");
  const [goalNudgeDismissed, setGoalNudgeDismissed] = useState(false);

  // Catalogue search (server-side): hits Supabase first, Gemini on a miss.
  const [results, setResults] = useState<CatalogFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [resultSource, setResultSource] = useState<"local" | "gemini" | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Review-before-commit: every add path stages items here; nothing saves until
  // the user presses "Add meal" in the PendingPanel.
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // AI lookup state (shared by describe + photo).
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const addRef = useRef<HTMLDivElement>(null);
  const day = selectedDate;

  // Load the profile + default the add target to the current meal (client-only).
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => d.profile && setProfile(d.profile))
      .catch(() => setProfile(DEFAULT_PROFILE));
    setMealTarget(mealForHour(new Date().getHours()));
  }, []);

  // Load the selected day's log (re-runs when you navigate days).
  useEffect(() => {
    setLoading(true);
    fetch(`/api/log?date=${day}`)
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [day]);

  /** Edit the goal from the hero; persists to the profile in Supabase. */
  function updateGoal(next: number) {
    const updated: Profile = { ...(profile ?? DEFAULT_PROFILE), calorieGoal: next };
    setProfile(updated);
    fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    })
      .then((r) => r.json())
      .then((d) => d.profile && setProfile(d.profile))
      .catch(() => {});
  }

  const totals = useMemo<DailyTotals>(
    () =>
      entries.reduce<DailyTotals>(
        (acc, e) => ({
          calories: acc.calories + e.calories * e.qty,
          protein: acc.protein + e.protein * e.qty,
          carbs: acc.carbs + e.carbs * e.qty,
          fat: acc.fat + e.fat * e.qty,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [entries],
  );

  const byMeal = useMemo(() => {
    const groups: Record<MealCategory, LogEntry[]> = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Snack: [],
    };
    for (const e of entries) groups[e.meal]?.push(e);
    return groups;
  }, [entries]);

  // Debounced catalogue search. Empty query → browse the curated list (no fetch);
  // otherwise hit /api/foods (Supabase first, Gemini fallback that caches misses).
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setResultSource(null);
      setSearchError(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    setSearchError(null);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed.");
        setResults(data.foods ?? []);
        setResultSource(data.source ?? "local");
      } catch (e) {
        setResults([]);
        setResultSource(null);
        setSearchError(friendlyError(e));
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const resultCount = query.trim() ? results.length : FOODS.length;

  /** Persist one food to the DB and append the created entry to state. */
  async function logFood(payload: LogPayload): Promise<boolean> {
    const res = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, meal: mealTarget, day }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.entry) {
      setEntries((prev) => [...prev, data.entry]);
      return true;
    }
    return false;
  }

  /** Quick-add / search: stage a catalogue food into the review panel. */
  function addCatalogToPending(food: DisplayFood) {
    setPending((prev) => [...prev, toPending(food, "catalog")]);
    setAiNote(null);
  }

  async function deleteEntry(id: number) {
    setDeletingId(id);
    const prev = entries;
    setEntries((cur) => cur.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/log/${id}`, { method: "DELETE" });
      if (!res.ok) setEntries(prev);
    } catch {
      setEntries(prev);
    } finally {
      setDeletingId(null);
    }
  }

  /** Change an entry's serving count, persisting it (optimistic + rollback). */
  async function updateQty(id: number, qty: number) {
    if (qty < 1) return;
    setUpdatingId(id);
    const prev = entries;
    setEntries((cur) => cur.map((e) => (e.id === id ? { ...e, qty } : e)));
    try {
      const res = await fetch(`/api/log/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty }),
      });
      if (!res.ok) setEntries(prev); // rollback on failure
    } catch {
      setEntries(prev);
    } finally {
      setUpdatingId(null);
    }
  }

  // ---- AI flows: lookups stage editable items into `pending` ----
  function showItems(result: NutritionResult): boolean {
    if (!result.items || result.items.length === 0) {
      setAiError(result.note || "No foods were identified. Try rephrasing.");
      return false;
    }
    setPending(result.items.map((it) => toPending(it, "ai")));
    setAiNote(result.note || null);
    return true;
  }

  async function runTextLookup() {
    const text = description.trim();
    if (!text) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/nutrition/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed.");
      showItems(data as NutritionResult);
    } catch (e) {
      setAiError(friendlyError(e));
    } finally {
      setAiLoading(false);
    }
  }

  async function runImageLookup() {
    if (!imageFile) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const form = new FormData();
      form.append("image", imageFile);
      const res = await fetch("/api/nutrition/image", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      showItems(data as NutritionResult);
    } catch (e) {
      setAiError(friendlyError(e));
    } finally {
      setAiLoading(false);
    }
  }

  // ---- Review panel: edit, remove, and finally commit ----
  function updatePending(key: string, patch: Partial<PendingItem>) {
    setPending((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function removePending(key: string) {
    setPending((prev) => prev.filter((it) => it.key !== key));
  }

  function clearPending() {
    setPending([]);
    setAiNote(null);
    setAiError(null);
  }

  /** The only path that writes to the log — runs when "Add meal" is pressed. */
  async function commitPending() {
    if (pending.length === 0) return;
    setAdding(true);
    setAiError(null);
    try {
      let failures = 0;
      for (const it of pending) {
        const label =
          it.servings === 1 ? it.serving : `${fmtServings(it.servings)}× ${it.serving}`;
        const ok = await logFood({
          foodName: it.name.trim() || "Food",
          serving: label,
          calories: it.calories,
          protein: it.protein,
          carbs: it.carbs,
          fat: it.fat,
        });
        if (!ok) failures++;
      }
      if (failures > 0) {
        setAiError(`Saved ${pending.length - failures} of ${pending.length}; some items failed.`);
      } else {
        setPending([]);
        setAiNote(null);
        setDescription("");
        clearImage();
        setQuery("");
      }
    } finally {
      setAdding(false);
    }
  }

  async function selectImage(file: File) {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    const compressed = await compressImage(file);
    setImageFile(compressed);
    setImagePreview(URL.createObjectURL(compressed));
    setAiError(null);
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setAiError(null);
  }

  /** "+ Add" from a meal section: aim the add tool at that meal and scroll to it. */
  function addToMeal(meal: MealCategory) {
    setMealTarget(meal);
    addRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToAdd() {
    addRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const isToday = selectedDate === todayKey();
  const showGoalNudge = goal === DEFAULT_GOAL && !goalNudgeDismissed && profile?.onboarded;

  return (
    <div className="min-h-screen pb-24">
      <AppHeader />

      <main className="mx-auto max-w-2xl px-4 pb-10 pt-5 sm:px-5">
        {view === "history" && (
          <div className="space-y-5">
            <h1 className="font-display text-xl font-semibold text-ink">History</h1>
            <HistoryView
              goal={goal}
              onOpenDay={(d) => {
                setSelectedDate(d);
                setView("day");
              }}
            />
          </div>
        )}

        {view === "trends" && (
          <div className="space-y-5">
            <h1 className="font-display text-xl font-semibold text-ink">Trends</h1>
            <TrendsView goal={goal} />
          </div>
        )}

        {view === "profile" && (
          <div className="space-y-5">
            <h1 className="font-display text-xl font-semibold text-ink">Profile</h1>
            {profile ? (
              <ProfileView profile={profile} onSaved={setProfile} />
            ) : (
              <div className="h-64 animate-pulse rounded-2xl bg-surface/60" />
            )}
          </div>
        )}

      {view === "day" && (
        <div className="space-y-7">
        <DateNav date={selectedDate} onChange={setSelectedDate} />
        <DailySummary totals={totals} goal={goal} onGoalChange={updateGoal} targets={targets} />

        {showGoalNudge && (
          <div className="flex items-center gap-3 rounded-2xl border border-matcha/30 bg-matcha-tint px-4 py-3">
            <span className="text-lg">🎯</span>
            <p className="flex-1 text-sm text-matcha-deep">
              You’re on the default <span className="nums font-semibold">2,000</span> kcal goal.{" "}
              <button onClick={() => setView("profile")} className="font-semibold underline underline-offset-2">
                Set your own goal
              </button>
            </p>
            <button onClick={() => setGoalNudgeDismissed(true)} aria-label="Dismiss" className="text-matcha-deep/60 transition hover:text-matcha-deep">✕</button>
          </div>
        )}

        {/* Meal-grouped log */}
        <div className="space-y-6">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl border border-line bg-surface/60" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="animate-fade-up rounded-3xl border border-dashed border-line-2 bg-surface/50 p-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-matcha-tint text-2xl">🍽️</div>
              <p className="font-display text-lg font-semibold text-ink">
                {isToday ? "Let’s log your first meal" : "Nothing logged on this day"}
              </p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-ink-3">
                {isToday
                  ? "Search a food, describe your meal, or snap a photo — it only takes a few seconds."
                  : "Add something below, or jump back to today."}
              </p>
              <button onClick={scrollToAdd} className="mt-4 rounded-xl bg-matcha px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-matcha-deep active:scale-95">
                Add {isToday ? "your first meal" : "a meal"}
              </button>
            </div>
          ) : (
            MEALS.map((meal, i) => (
              <div key={meal} className="animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
                <MealSection
                  meal={meal}
                  entries={byMeal[meal]}
                  onDelete={deleteEntry}
                  onUpdateQty={updateQty}
                  deletingId={deletingId}
                  updatingId={updatingId}
                  onAddHere={addToMeal}
                />
              </div>
            ))
          )}
        </div>

        {/* Add food */}
        <section ref={addRef} className="scroll-mt-20 space-y-4 rounded-3xl border border-line bg-paper-2/40 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Add food</h2>
          </div>

          <MealPicker value={mealTarget} onChange={setMealTarget} />

          {/* Mode tabs */}
          <div className="inline-flex w-full rounded-2xl border border-line bg-surface p-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => switchMode(m.id)}
                aria-pressed={mode === m.id}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  mode === m.id ? "bg-matcha text-paper shadow-sm" : "text-ink-2 hover:bg-paper-2"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "quick" && (
            <div className="space-y-3">
              <SearchBar value={query} onChange={setQuery} resultCount={resultCount} />
              <div className="max-h-[56vh] overflow-y-auto rounded-2xl border border-line bg-surface/40 p-3 [scrollbar-color:#DED3C0_transparent] [scrollbar-width:thin]">
                {!query.trim() ? (
                  // Empty query: browse the curated Indian core, grouped by category.
                  <FoodList foods={FOODS} onAdd={addCatalogToPending} />
                ) : searching ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-3">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-2 border-t-matcha" />
                    Searching the catalogue…
                  </div>
                ) : searchError ? (
                  <p className="rounded-2xl border border-dashed border-line-2 bg-surface/50 p-6 text-center text-sm text-ink-3">
                    {searchError}
                  </p>
                ) : results.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-line-2 bg-surface/50 p-6 text-center text-sm text-ink-3">
                    No food found for “{query.trim()}”. Try the Describe tab for a full meal.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {resultSource === "gemini" && (
                      <p className="rounded-xl bg-matcha-tint px-3 py-2 text-xs text-matcha-deep">
                        ✦ Estimated by AI and added to the catalogue.
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {results.map((food) => (
                        <FoodCard key={food.id} food={food} onAdd={addCatalogToPending} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === "describe" && (
            <div className="space-y-4">
              <TextPanel value={description} onChange={setDescription} onSubmit={runTextLookup} loading={aiLoading} />
            </div>
          )}

          {mode === "photo" && (
            <div className="space-y-4">
              <PhotoPanel
                previewUrl={imagePreview}
                fileName={imageFile?.name ?? null}
                onSelectFile={selectImage}
                onSubmit={runImageLookup}
                onClear={clearImage}
                loading={aiLoading}
              />
            </div>
          )}

          {aiError && <ErrorNote message={aiError} onDismiss={() => setAiError(null)} />}

          {/* Review-before-commit: shared by quick-add, describe, and photo. */}
          <PendingPanel
            items={pending}
            note={aiNote}
            onChangeItem={updatePending}
            onRemoveItem={removePending}
            onCommit={commitPending}
            onClear={clearPending}
            adding={adding}
          />
        </section>
        </div>
      )}
      </main>

      <BottomNav view={view} onChange={setView} />

      {/* First-run welcome — only for a brand-new (not-yet-onboarded) profile. */}
      {profile && !profile.onboarded && (
        <Onboarding profile={profile} onDone={setProfile} />
      )}
    </div>
  );
}

let keySeq = 0;
function genKey(): string {
  return `p${Date.now().toString(36)}-${keySeq++}`;
}

/** Build a review item from a catalogue food or an AI-identified item. */
function toPending(
  food: DisplayFood | NutritionItem,
  source: PendingItem["source"],
): PendingItem {
  return {
    key: genKey(),
    name: food.name,
    serving: food.serving || "1 serving",
    servings: 1,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    source,
  };
}

/** Format a serving multiplier compactly: 1, 1.5, 2 … */
function fmtServings(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  if (!msg || /failed to fetch|networkerror/i.test(msg)) {
    return "Couldn’t reach the server. Check your connection and try again.";
  }
  return msg;
}
