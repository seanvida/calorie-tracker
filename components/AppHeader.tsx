"use client";

import { useEffect, useState } from "react";

/** Sticky brand header: wordmark + live date and clock. */
export default function AppHeader() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateLabel = now
    ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "";
  const timeLabel = now
    ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-xl font-semibold tracking-tight text-ink">
            Calorie Tracker
          </span>
        </div>

        <div className="text-right leading-tight">
          <div className="text-[13px] font-semibold text-ink">{dateLabel}</div>
          <div className="nums text-[12px] tabular-nums text-ink-3" suppressHydrationWarning>
            {timeLabel}
          </div>
        </div>
      </div>
    </header>
  );
}

/** Small thali (plate) mark drawn in SVG. */
function Logo() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-matcha text-paper shadow-sm">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="0.9" fill="currentColor" />
      </svg>
    </span>
  );
}
