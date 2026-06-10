export type View = "day" | "history" | "trends" | "profile";

interface BottomNavProps {
  view: View;
  onChange: (v: View) => void;
}

const TABS: { id: View; label: string; icon: string }[] = [
  { id: "day", label: "Today", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "history", label: "History", icon: "M3 4h18M3 4v16h18V4M3 9h18M8 4v16" },
  { id: "trends", label: "Trends", icon: "M3 17l6-6 4 4 8-8M21 7h-5m5 0v5" },
  { id: "profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
];

/** Fixed bottom tab bar (mobile-first; respects the iOS safe area). */
export default function BottomNav({ view, onChange }: BottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {TABS.map((t) => {
          const active = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              aria-pressed={active}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition ${
                active ? "text-matcha" : "text-ink-3 hover:text-ink-2"
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
              </svg>
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
