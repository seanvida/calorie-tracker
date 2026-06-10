interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
}

export default function SearchBar({ value, onChange, resultCount }: SearchBarProps) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        width={18}
        height={18}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search 60+ foods — paneer, rice, egg…"
        className="w-full rounded-2xl border border-line bg-surface py-3 pl-11 pr-20 text-sm text-ink shadow-card outline-none transition focus:border-matcha placeholder:text-ink-3"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="nums absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-xs font-medium text-ink-3 transition hover:bg-paper-2 hover:text-ink-2"
          aria-label="Clear search"
        >
          Clear · {resultCount}
        </button>
      )}
    </div>
  );
}
