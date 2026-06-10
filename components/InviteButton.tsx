"use client";

import { useState } from "react";

const MESSAGE = "I'm tracking my meals on Calorie Tracker — give it a try:";

/**
 * One-tap invite: opens the device share sheet with the live app URL, falling
 * back to copy-to-clipboard when the Web Share API isn't available (most
 * desktops). No tokens — the invitee just opens the link and starts.
 */
export default function InviteButton() {
  const [copied, setCopied] = useState(false);

  async function invite() {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    // Prefer the native share sheet (mobile). It must run in this click handler.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Calorie Tracker", text: MESSAGE, url });
      } catch {
        /* user cancelled or share failed — do nothing (don't surprise-copy) */
      }
      return;
    }
    // Fallback: copy the link.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link to share:", url);
    }
  }

  return (
    <button
      onClick={invite}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-matcha/40 bg-matcha-tint px-4 py-3 text-sm font-semibold text-matcha-deep transition hover:bg-matcha-soft active:scale-[0.99]"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4M18 8a3 3 0 10-3-3 3 3 0 003 3zM6 15a3 3 0 103-3 3 3 0 00-3 3zM18 22a3 3 0 10-3-3 3 3 0 003 3z" />
      </svg>
      {copied ? "Link copied ✓" : "Invite someone"}
    </button>
  );
}
