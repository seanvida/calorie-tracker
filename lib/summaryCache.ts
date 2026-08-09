"use client";

// Shared stale-while-revalidate cache for GET /api/summary.
// History and Trends both read the same 30-day summary; without sharing, each
// tab switch remounts and refetches, which is the lag the user noticed. This
// serves the last result instantly (also across a reload via sessionStorage)
// and revalidates in the background. Invalidated whenever the log changes.

import { useEffect, useSyncExternalStore } from "react";
import type { DaySummary } from "@/lib/types";

export interface SummaryResponse {
  from: string;
  to: string;
  days: DaySummary[];
}

interface Snapshot {
  data: SummaryResponse | null;
  error: boolean;
}

const KEY = "thali.summary.v1";
const subs = new Set<() => void>();
let inflight: Promise<SummaryResponse | null> | null = null;

let snapshot: Snapshot = { data: null, error: false };

// Hydrate from sessionStorage on first import (client only).
if (typeof window !== "undefined") {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) snapshot = { data: JSON.parse(raw) as SummaryResponse, error: false };
  } catch {
    /* ignore */
  }
}

function emit() {
  subs.forEach((fn) => fn());
}

function setData(data: SummaryResponse) {
  snapshot = { data, error: false };
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / private-mode */
  }
  emit();
}

function setError() {
  // Only surface an error if we have nothing cached to show.
  snapshot = { data: snapshot.data, error: !snapshot.data };
  emit();
}

/** Fetch fresh summary; de-duped so concurrent callers share one request. */
export function refreshSummary(): Promise<SummaryResponse | null> {
  if (inflight) return inflight;
  inflight = fetch("/api/summary")
    .then((r) => r.json())
    .then((d) => {
      const data: SummaryResponse = { from: d.from, to: d.to, days: d.days ?? [] };
      setData(data);
      return data;
    })
    .catch(() => {
      setError();
      return null;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Seed the cache from an already-fetched payload (e.g. /api/bootstrap). */
export function seedSummary(data: SummaryResponse) {
  setData(data);
}

/** Drop the cache so the next read refetches (call after logging changes). */
export function invalidateSummary() {
  snapshot = { data: null, error: false };
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => subs.delete(fn);
}

const getSnapshot = () => snapshot;
const getServerSnapshot = (): Snapshot => ({ data: null, error: false });

/**
 * Read the shared summary, revalidating on mount. Returns cached data
 * immediately when available so History/Trends open without a spinner.
 */
export function useSummary(): Snapshot {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    refreshSummary();
  }, []);
  return snap;
}
