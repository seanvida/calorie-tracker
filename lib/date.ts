// Small date helpers shared across the day/history/trends views. All days are
// local-time "YYYY-MM-DD" keys (matching how entries are stored).

export function todayKey(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** Shift a YYYY-MM-DD key by n days (local time). */
export function addDays(day: string, n: number): string {
  const d = new Date(day + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}

/** e.g. "Tuesday, June 9". */
export function formatDayLong(day: string): string {
  return new Date(day + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** e.g. "Mon 9 Jun". */
export function formatDayShort(day: string): string {
  return new Date(day + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** e.g. "9" — just the day-of-month, for compact chart axes. */
export function dayOfMonth(day: string): string {
  return String(Number(day.slice(8, 10)));
}
