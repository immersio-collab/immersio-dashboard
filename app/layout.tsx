import type { Metadata } from "next";
import "./globals.css";

/**
 * Root layout for the entire application.
 * Wraps all route segments (auth, dashboard, api).
 */
export const metadata: Metadata = {
  title: "Immersio Dashboard",
  description: "Internal B2B dashboard for Immersio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
