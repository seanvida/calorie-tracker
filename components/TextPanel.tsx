import Spinner from "./Spinner";

interface TextPanelProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

/** Free-text meal description → AI nutrition lookup. */
export default function TextPanel({ value, onChange, onSubmit, loading }: TextPanelProps) {
  const canSubmit = value.trim().length > 0 && !loading;

  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) onSubmit();
        }}
        rows={3}
        maxLength={1000}
        placeholder="Describe what you ate — e.g. “two rotis with dal and a bowl of curd”"
        className="w-full resize-none rounded-2xl border border-line bg-surface p-3.5 text-sm text-ink shadow-card outline-none transition focus:border-matcha placeholder:text-ink-3"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-3">AI estimates calories &amp; macros</span>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="rounded-xl bg-matcha px-4 py-2 text-sm font-semibold text-paper transition hover:bg-matcha-deep active:scale-95 disabled:opacity-50"
        >
          {loading ? <Spinner label="Looking up…" /> : "Look up nutrition"}
        </button>
      </div>
    </div>
  );
}
