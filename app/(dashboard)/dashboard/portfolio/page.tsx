import type { Metadata } from "next";
import { getAllProjects } from "@/lib/portfolio";
import { PortfolioTable } from "@/components/portfolio";

export const metadata: Metadata = {
  title: "Portfolio — Immersio Dashboard",
};

export const dynamic = "force-dynamic";

/**
 * Portfolio Page — Server Component.
 * Loads every project, drafts included, and hands them to the interactive table.
 */
export default async function PortfolioPage() {
  const projects = await getAllProjects();

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      <PortfolioTable initialProjects={projects} />
    </div>
  );
}
