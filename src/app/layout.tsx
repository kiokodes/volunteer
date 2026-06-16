/**
 * app/layout.tsx
 *
 * Root layout — wraps every page in the app.
 * Loads Inter font from Google Fonts and applies global Tailwind base styles.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "NextGem Volunteer Platform",
  description:
    "Track your volunteer hours, earn badges, and make a difference with NextGem Foundation.",
  // PWA-friendly meta tags for mobile
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-surface-subtle text-ink font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
