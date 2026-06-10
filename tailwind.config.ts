import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      colors: {
        // Warm paper canvas + surfaces
        paper: "#FBF8F2",
        "paper-2": "#F4EEE3",
        surface: "#FFFFFF",
        // Ink (text)
        ink: "#211E19",
        "ink-2": "#5B554C",
        "ink-3": "#928B7E",
        // Warm hairlines
        line: "#EBE3D5",
        "line-2": "#DED3C0",
        // Brand: deep matcha
        matcha: {
          DEFAULT: "#3E6F48",
          deep: "#2F5638",
          soft: "#EAF1E9",
          tint: "#F3F7F1",
        },
        // Macro accents (warm, food-like)
        protein: "#3E6F48", // green
        carbs: "#C98A2B", // honey
        fat: "#C16A4C", // clay
        // Progress states
        good: "#4E8A5A",
        warn: "#CF9A33",
        over: "#C2492E",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
        "3xl": "28px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(33,30,25,0.04), 0 8px 24px -16px rgba(33,30,25,0.18)",
        lift: "0 2px 6px rgba(33,30,25,0.06), 0 18px 40px -20px rgba(33,30,25,0.28)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        grow: {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
