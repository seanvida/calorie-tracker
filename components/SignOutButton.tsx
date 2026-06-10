"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Signs the user out and returns them to the login screen. */
export default function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      await createClient().auth.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <button
      onClick={signOut}
      disabled={loading}
      className="w-full rounded-2xl border border-line px-4 py-3 text-sm font-semibold text-ink-2 transition hover:bg-paper-2 disabled:opacity-50"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
