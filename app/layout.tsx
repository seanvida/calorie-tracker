import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

// Display: Fraunces — an optical serif with warmth and editorial character,
// used for the wordmark and the big nutrition figures.
const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

// Body: Hanken Grotesk — a clean, friendly grotesque with great numerals.
const body = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Calorie Tracker — Indian Food Calorie & Macro Tracker",
  description:
    "A calm, beautiful calorie & macro tracker for everyday Indian food — log meals by hand, by description, or by photo.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
