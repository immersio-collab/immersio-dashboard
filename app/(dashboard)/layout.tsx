import { SidebarNav } from "@/components/sidebar-nav";
import { getLeads, getLeadAlerts } from "@/lib/leads";

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
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const leads = await getLeads();
  
  const nouveauxCount = leads.filter((l) => l.statut === "Nouveau").length;
  const retardCount = leads.filter((l) => 
    getLeadAlerts(l).some((alert) => alert.kind === "relance-en-retard")
  ).length;

  return (
    <SidebarNav nouveauxCount={nouveauxCount} retardCount={retardCount}>
      {children}
    </SidebarNav>
  );
}
