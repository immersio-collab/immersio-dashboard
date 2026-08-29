import type { Metadata } from "next";
import "./globals.css";

/**
 * Root layout for the entire application.
 * Wraps all route segments (auth, dashboard, api).
 */
export const metadata: Metadata = {
  title: "Immersio Dashboard",
  description: "Espace de gestion Immersio.",
  // Outil interne : jamais indexé (double sécurité avec app/robots.ts).
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
