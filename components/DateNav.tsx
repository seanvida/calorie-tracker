import { addDays, todayKey, formatDayLong } from "@/lib/date";

interface DateNavProps {
  date: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

/** Prev / next day, a native date picker, and a "Today" shortcut. */
export default function DateNav({ date, onChange }: DateNavProps) {
  const today = todayKey();
  const isToday = date === today;

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface p-1.5">
      <button
        onClick={() => onChange(addDays(date, -1))}
        aria-label="Previous day"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 transition hover:bg-paper-2"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <label className="relative flex flex-1 cursor-pointer items-center justify-center">
        <span className="text-sm font-semibold text-ink">
          {isToday ? "Today" : formatDayLong(date)}
        </span>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Pick a date"
        />
      </label>

      {!isToday ? (
        <button
          onClick={() => onChange(today)}
          className="h-10 rounded-xl px-3 text-xs font-semibold text-matcha transition hover:bg-matcha-tint"
        >
          Today
        </button>
      ) : (
        <button
          disabled
          aria-label="Next day"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-3 opacity-30"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
      {!isToday && (
        <button
          onClick={() => onChange(addDays(date, 1) > today ? today : addDays(date, 1))}
          aria-label="Next day"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 transition hover:bg-paper-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
