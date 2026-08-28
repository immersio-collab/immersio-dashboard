import type { Metadata } from "next";
import { getAllDevis } from "@/lib/devis";
import { DevisTable } from "@/components/devis";

export const metadata: Metadata = {
  title: "Devis — Immersio Dashboard",
};

export const dynamic = "force-dynamic";

/**
 * Devis Page — Server Component.
 * Loads every quotation and hands them to the interactive table, which also
 * hosts the creation form and its live PDF preview.
 */
export default async function DevisPage() {
  const devis = await getAllDevis();

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      <DevisTable initialDevis={devis} />
    </div>
  );
}
