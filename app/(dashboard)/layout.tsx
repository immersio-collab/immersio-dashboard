import { SidebarNav } from "@/components/sidebar-nav";

/**
 * Dashboard route-group layout.
 *
 * Security: access control lives in `middleware.ts` — every /dashboard route
 * is protected there. This layout only provides the UI shell.
 *
 * Architecture:
 * - This file stays a Server Component (no "use client" directive).
 * - The sidebar/header interactivity (active link, mobile drawer) is
 *   delegated to the `SidebarNav` Client Component, keeping the split clean.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarNav>{children}</SidebarNav>;
}
