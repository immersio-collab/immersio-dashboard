import { SidebarNav } from "@/components/sidebar-nav";
import { getLeads, getLeadAlerts, isRappelDue, isRappelToday, hasActiveRappel } from "@/lib/leads";

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

  const activeRappels = leads
    .filter((l) => hasActiveRappel(l))
    .map((l) => ({
      leadId: l.leadId,
      nom: l.nom || "Prospect sans nom",
      rappelDate: l.rappelDate || "",
      rappelNote: l.rappelNote || "",
      isDue: isRappelDue(l),
      isToday: isRappelToday(l),
    }))
    .sort((a, b) => {
      // Due first, then soonest date
      if (a.isDue && !b.isDue) return -1;
      if (!a.isDue && b.isDue) return 1;
      return (a.rappelDate || "").localeCompare(b.rappelDate || "");
    });

  return (
    <SidebarNav 
      nouveauxCount={nouveauxCount} 
      retardCount={retardCount}
      activeRappels={activeRappels}
    >
      {children}
    </SidebarNav>
  );
}
