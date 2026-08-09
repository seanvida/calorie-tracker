// Instant shell shown while the server auth-gate + first data resolve, so a
// cold home-screen launch paints a branded skeleton instead of a blank screen.
export default function Loading() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-4 pb-24 pt-6">
      {/* Header wordmark placeholder */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-6 w-28 animate-pulse rounded-lg bg-surface/70" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-surface/70" />
      </div>

      {/* Daily summary ring/card placeholder */}
      <div className="mb-7 h-40 animate-pulse rounded-3xl bg-surface/70" />

      {/* Meal list placeholders */}
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl border border-line bg-surface/60" />
        ))}
      </div>
    </div>
  );
}
