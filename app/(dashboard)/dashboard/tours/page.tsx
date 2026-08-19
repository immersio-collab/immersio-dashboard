import type { Metadata } from "next";
import { getTours } from "@/lib/tours";
import { ToursTable } from "@/components/tours";

export const metadata: Metadata = {
  title: "Tours Virtuels — Immersio Dashboard",
};

export const dynamic = "force-dynamic";

/**
 * Tours Page — Server Component.
 * Fetches all virtual tours from Supabase and passes them to the interactive ToursTable component.
 */
export default async function ToursPage() {
  const tours = await getTours();

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      <ToursTable initialTours={tours} />
    </div>
  );
}
