import { useRef } from "react";
import Spinner from "./Spinner";

interface PhotoPanelProps {
  previewUrl: string | null;
  fileName: string | null;
  onSelectFile: (file: File) => void;
  onSubmit: () => void;
  onClear: () => void;
  loading: boolean;
}

/** Meal photo upload (with preview) → AI image analysis. */
export default function PhotoPanel({
  previewUrl,
  fileName,
  onSelectFile,
  onSubmit,
  onClear,
  loading,
}: PhotoPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelectFile(file);
          e.target.value = "";
        }}
      />

      {!previewUrl ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-2 bg-surface/50 p-8 text-ink-3 transition hover:border-matcha/50 hover:bg-matcha-tint hover:text-matcha"
        >
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V18a2 2 0 002 2h14a2 2 0 002-2v-1.5M16 8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="text-sm font-semibold">Take or upload a meal photo</span>
          <span className="text-xs text-ink-3">JPEG, PNG, WebP or HEIC · up to 8 MB</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-line bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Meal preview" className="max-h-72 w-full object-contain" />
            <button
              onClick={onClear}
              disabled={loading}
              className="absolute right-2 top-2 rounded-full bg-paper/90 px-3 py-1 text-xs font-semibold text-ink-2 shadow-sm backdrop-blur transition hover:bg-paper disabled:opacity-50"
            >
              Change photo
            </button>
          </div>
          {fileName && <p className="truncate text-xs text-ink-3">{fileName}</p>}
          <button
            onClick={onSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-matcha px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-matcha-deep active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? <Spinner label="Analyzing photo…" /> : "Analyze photo"}
          </button>
        </div>
      )}
    </div>
  );
}
