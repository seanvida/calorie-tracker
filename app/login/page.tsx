"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Sign-in screen. Single-button Google OAuth. */
export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setError("Couldn’t start sign-in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-matcha text-3xl">🍽️</div>
        <div className="space-y-1.5">
          <h1 className="font-display text-3xl font-semibold text-ink">Calorie Tracker</h1>
          <p className="text-sm text-ink-2">Your own calorie &amp; macro journal for everyday Indian food. Sign in to keep your meals private to you.</p>
        </div>
        <button
          onClick={signIn}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink shadow-card transition hover:shadow-lift active:scale-[0.99] disabled:opacity-60"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
          </svg>
          {loading ? "Opening Google…" : "Continue with Google"}
        </button>
        {error && <p className="text-sm text-over">{error}</p>}
        <p className="text-[11px] text-ink-3">We only use your Google account to sign you in. Your food log stays private to you.</p>
      </div>
    </div>
  );
}
