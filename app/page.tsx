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
} from "@/lib/types";
import type { NutritionItem, NutritionResult } from "@/lib/gemini";
import { DEFAULT_GOAL, mealForHour } from "@/lib/nutrition";
import AppHeader from "@/components/AppHeader";
import DailySummary from "@/components/DailySummary";
import MealSection from "@/components/MealSection";
import MealPicker from "@/components/MealPicker";
import SearchBar from "@/components/SearchBar";
import FoodList from "@/components/FoodList";
import FoodCard from "@/components/FoodCard";
import TextPanel from "@/components/TextPanel";
import PhotoPanel from "@/components/PhotoPanel";
import AiResultPanel from "@/components/AiResultPanel";
import ErrorNote from "@/components/ErrorNote";

function todayKey(): string {
  return new Date().toLocaleDateString("en-CA");
}

const GOAL_KEY = "calorie-tracker.goal";

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
  const [goal, setGoal] = useState(DEFAULT_GOAL);

  // Add-food UI.
  const [mode, setMode] = useState<Mode>("quick");
  const [mealTarget, setMealTarget] = useState<MealCategory>("Snack");
  const [query, setQuery] = useState("");
  const [busyName, setBusyName] = useState<string | null>(null);

  // Catalogue search (server-side): hits Supabase first, Gemini on a miss.
  const [results, setResults] = useState<CatalogFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [resultSource, setResultSource] = useState<"local" | "gemini" | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // AI lookup state (shared by describe + photo).
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<NutritionResult | null>(null);
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set());
  const [aiAdding, setAiAdding] = useState(false);

  const addRef = useRef<HTMLDivElement>(null);
  const day = todayKey();

  // Restore goal + default the add target to the current meal (client-only).
  useEffect(() => {
    const saved = Number(localStorage.getItem(GOAL_KEY));
    if (Number.isFinite(saved) && saved > 0) setGoal(saved);
    setMealTarget(mealForHour(new Date().getHours()));
  }, []);

  // Load today's log on mount — restores state across refreshes.
  useEffect(() => {
    fetch(`/api/log?date=${day}`)
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [day]);

  function updateGoal(next: number) {
    setGoal(next);
    localStorage.setItem(GOAL_KEY, String(next));
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

  async function addFood(food: DisplayFood) {
    setBusyName(food.name);
    try {
      await logFood({
        foodName: food.name,
        serving: food.serving,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      });
    } finally {
      setBusyName(null);
    }
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

  // ---- AI flows ----
  function resetAi() {
    setAiResult(null);
    setAiSelected(new Set());
    setAiError(null);
  }

  function showResult(result: NutritionResult) {
    setAiResult(result);
    setAiSelected(new Set(result.items.map((_, i) => i)));
  }

  async function runTextLookup() {
    const text = description.trim();
    if (!text) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await fetch("/api/nutrition/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed.");
      showResult(data as NutritionResult);
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
    setAiResult(null);
    try {
      const form = new FormData();
      form.append("image", imageFile);
      const res = await fetch("/api/nutrition/image", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      showResult(data as NutritionResult);
    } catch (e) {
      setAiError(friendlyError(e));
    } finally {
      setAiLoading(false);
    }
  }

  function toggleSelected(index: number) {
    setAiSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function addSelected() {
    if (!aiResult) return;
    const chosen = aiResult.items.filter((_, i) => aiSelected.has(i));
    if (chosen.length === 0) return;
    setAiAdding(true);
    setAiError(null);
    try {
      let failures = 0;
      for (const item of chosen) {
        const ok = await logFood(toPayload(item));
        if (!ok) failures++;
      }
      if (failures > 0) {
        setAiError(`Saved ${chosen.length - failures} of ${chosen.length}; some items failed.`);
      }
      resetAi();
      setDescription("");
      clearImage();
    } finally {
      setAiAdding(false);
    }
  }

  function selectImage(file: File) {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    resetAi();
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    resetAi();
  }

  /** "+ Add" from a meal section: aim the add tool at that meal and scroll to it. */
  function addToMeal(meal: MealCategory) {
    setMealTarget(meal);
    addRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-2xl space-y-7 px-4 pb-16 pt-5 sm:px-5">
        <DailySummary totals={totals} goal={goal} onGoalChange={updateGoal} />

        {/* Meal-grouped log */}
        <div className="space-y-6">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl border border-line bg-surface/60" />
              ))}
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
                  <FoodList foods={FOODS} onAdd={addFood} busyName={busyName} />
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
                        <FoodCard
                          key={food.id}
                          food={food}
                          onAdd={addFood}
                          busy={busyName === food.name}
                        />
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
              {aiError && <ErrorNote message={aiError} onDismiss={() => setAiError(null)} />}
              {aiResult && (
                <AiResultPanel
                  result={aiResult}
                  selected={aiSelected}
                  onToggle={toggleSelected}
                  onAdd={addSelected}
                  onDiscard={resetAi}
                  adding={aiAdding}
                />
              )}
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
              {aiError && <ErrorNote message={aiError} onDismiss={() => setAiError(null)} />}
              {aiResult && (
                <AiResultPanel
                  result={aiResult}
                  selected={aiSelected}
                  onToggle={toggleSelected}
                  onAdd={addSelected}
                  onDiscard={resetAi}
                  adding={aiAdding}
                />
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="mx-auto max-w-2xl px-5 pb-10 text-center text-xs text-ink-3">
        Calorie Tracker · thousands of foods · AI by Gemini · saved to your account
      </footer>
    </div>
  );
}

function toPayload(item: NutritionItem): LogPayload {
  return {
    foodName: item.name,
    serving: item.serving,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
  };
}

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  if (!msg || /failed to fetch|networkerror/i.test(msg)) {
    return "Couldn’t reach the server. Check your connection and try again.";
  }
  return msg;
}
