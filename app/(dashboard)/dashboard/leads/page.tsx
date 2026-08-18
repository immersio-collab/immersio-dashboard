import type { Metadata } from "next";

import { getLeads } from "@/lib/leads";
import { LeadsTable } from "@/components/leads-table";

export const metadata: Metadata = {
  title: "Leads — Immersio Dashboard",
};

export const dynamic = "force-dynamic";

/**
 * Leads page — async Server Component.
 *
 * Fetches all active leads server-side and passes them to `LeadsTable`
 * (Client Component) which owns all filtering, sorting, drawer and archive
 * interactions.
 *
 * `searchParams.id` — if the user arrived from an overview alert link
 * (/dashboard/leads?id=L-xxx), the drawer for that lead opens immediately.
 */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const leads = await getLeads();

  return (
    <div className="space-y-4">
      <LeadsTable
        initialLeads={leads}
        initialSelectedId={searchParams.id}
      />
    </div>
  );
}
