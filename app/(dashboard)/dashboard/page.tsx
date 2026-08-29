import Link from "next/link";
import type { Metadata } from "next";
import {
  Users,
  RefreshCw,
  Copy,
  Clock,
  CalendarClock,
  ReceiptText,
  FileText,
  FolderOpen,
  Globe,
} from "lucide-react";

import { getLeads, getLeadAlerts } from "@/lib/leads";
import { getModuleStats } from "@/lib/dashboard-stats";
import type { Lead, LeadAlert, LeadAlertKind } from "@/types";

export const metadata: Metadata = {
  title: "Vue d'ensemble — Immersio Dashboard",
};

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Alert priority order — determines sort order in the alert list
// ---------------------------------------------------------------------------

const ALERT_PRIORITY: Record<LeadAlertKind, number> = {
  "rappel-du": 0,          // highest priority (scheduled appointment/delivery)
  "relance-en-retard": 1,   // most urgent relance
  "jamais-contacte": 2,
  "doublon-non-resolu": 3,
};

// ---------------------------------------------------------------------------
// Sub-components (server-only, no "use client" needed)
// ---------------------------------------------------------------------------

/** One KPI counter card. */
function StatCard({
  label,
  value,
  icon: Icon,
  highlight,
  href,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  /** When true, the number is shown in accent color to draw attention. */
  highlight?: boolean;
  /** Rend la carte cliquable vers le module concerné. */
  href?: string;
  /** Ligne secondaire — un montant, un contexte. */
  sub?: string;
}) {
  const emphasise = highlight && typeof value === "number" && value > 0;
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
          {label}
        </span>
        <Icon size={15} className="text-text-subtle flex-shrink-0" aria-hidden="true" />
      </div>
      <div>
        <span
          className={[
            "text-3xl font-semibold tabular-nums",
            emphasise ? "text-accent" : "text-text",
          ].join(" ")}
        >
          {value}
        </span>
        {sub && <span className="block text-xs text-text-muted mt-1">{sub}</span>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="card p-5 flex flex-col gap-3 hover:border-accent/40 hover:bg-surface-muted/40 transition-colors"
      >
        {body}
      </Link>
    );
  }
  return <div className="card p-5 flex flex-col gap-3">{body}</div>;
}

/** Icon used per alert kind in the alert list. */
const ALERT_ICON: Record<LeadAlertKind, React.ElementType> = {
  "rappel-du": CalendarClock,
  "relance-en-retard": RefreshCw,
  "jamais-contacte": Clock,
  "doublon-non-resolu": Copy,
};

/** One row in the alert list. */
function AlertRow({
  lead,
  alert,
}: {
  lead: Lead;
  alert: LeadAlert;
}) {
  const Icon = ALERT_ICON[alert.kind];
  return (
    <Link
      href={`/dashboard/leads?id=${lead.leadId}`}
      className="flex items-start gap-4 px-4 py-3 border-b border-border last:border-b-0 hover:bg-surface-muted transition-colors group"
    >
      {/* Alert kind icon */}
      <Icon
        size={14}
        className="flex-shrink-0 mt-0.5 text-text-subtle group-hover:text-text transition-colors"
        aria-hidden="true"
      />

      {/* Lead identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium text-text truncate">
            {lead.nom || "—"}
          </span>
          {lead.ville && (
            <span className="text-xs text-text-subtle flex-shrink-0">
              {lead.ville}
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted mt-0.5 leading-snug">
          {alert.message}
        </p>
      </div>

      {/* Chevron hint */}
      <span
        className="text-text-subtle text-xs flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-hidden="true"
      >
        →
      </span>
    </Link>
  );
}


// ---------------------------------------------------------------------------
// Page — Server Component
// ---------------------------------------------------------------------------

/**
 * Dashboard overview page.
 *
 * Fetches leads directly via getLeads() (server-side — no API roundtrip).
 * Computes KPI counters and the alert list in-place, then renders static HTML.
 * No client-side JS is needed for the initial view.
 */
export default async function DashboardIndexPage() {
  // Les deux lectures sont indépendantes : les paralléliser évite d'ajouter
  // la latence des modules à celle des leads.
  const [leads, modules] = await Promise.all([getLeads(), getModuleStats()]);
  const mad = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} MAD`;
  const indispo = (name: string) => modules.indisponibles.includes(name);

  // ── Compute counters ───────────────────────────────────────────────────────
  let relancesEnRetard = 0;
  let doublonsNonResolus = 0;
  let jamaisContactes = 0;

  /** Pairs of (lead, firstAlert) for every lead that has at least one alert. */
  const alertedLeads: Array<{ lead: Lead; alerts: LeadAlert[] }> = [];

  for (const lead of leads) {
    const alerts = getLeadAlerts(lead);

    for (const a of alerts) {
      if (a.kind === "relance-en-retard") relancesEnRetard++;
      if (a.kind === "doublon-non-resolu") doublonsNonResolus++;
      if (a.kind === "jamais-contacte") jamaisContactes++;
    }

    if (alerts.length > 0) {
      alertedLeads.push({ lead, alerts });
    }
  }

  // Sort alerted leads: most urgent alert kind first, then alphabetically.
  alertedLeads.sort((a, b) => {
    const pa = Math.min(...a.alerts.map((al) => ALERT_PRIORITY[al.kind]));
    const pb = Math.min(...b.alerts.map((al) => ALERT_PRIORITY[al.kind]));
    if (pa !== pb) return pa - pb;
    return (a.lead.nom ?? "").localeCompare(b.lead.nom ?? "", "fr");
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-4xl">
      {/* ── KPI counters ── */}
      <section aria-label="Compteurs">
        <h2 className="text-sm font-medium text-text mb-3">Leads</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Leads actifs"
            value={leads.length}
            icon={Users}
            href="/dashboard/leads"
          />
          <StatCard
            label="Relances en retard"
            value={relancesEnRetard}
            icon={RefreshCw}
            highlight
            href="/dashboard/leads?filter=retard"
          />
          <StatCard
            label="Doublons non résolus"
            value={doublonsNonResolus}
            icon={Copy}
            highlight
          />
          <StatCard
            label="Jamais contactés"
            value={jamaisContactes}
            icon={Clock}
            highlight
            href="/dashboard/leads?filter=nouveaux"
          />
        </div>
      </section>

      {/* ── Les quatre autres modules ── */}
      <section aria-label="Autres modules">
        <h2 className="text-sm font-medium text-text mb-3">Le reste de l&apos;activité</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Devis en attente"
            value={indispo("devis") ? "—" : modules.devisEnAttente}
            icon={ReceiptText}
            highlight
            href="/dashboard/devis"
            sub={
              indispo("devis")
                ? "Module indisponible"
                : `${mad(modules.devisMontantEnAttente)} en jeu`
            }
          />
          <StatCard
            label="Brouillons blog"
            value={indispo("blog") ? "—" : modules.blogBrouillons}
            icon={FileText}
            href="/dashboard/blog"
            sub={indispo("blog") ? "Module indisponible" : "À publier"}
          />
          <StatCard
            label="Projets non publiés"
            value={indispo("portfolio") ? "—" : modules.portfolioBrouillons}
            icon={FolderOpen}
            href="/dashboard/portfolio"
            sub={indispo("portfolio") ? "Module indisponible" : "À publier"}
          />
          <StatCard
            label="Visites hors ligne"
            value={indispo("tours") ? "—" : modules.toursInactifs}
            icon={Globe}
            href="/dashboard/tours"
            sub={indispo("tours") ? "Module indisponible" : "Créées, non publiées"}
          />
        </div>
        {!indispo("devis") && modules.devisAcceptesMontant > 0 && (
          <p className="text-xs text-text-muted mt-3">
            Devis acceptés à ce jour :{" "}
            <span className="font-medium text-text tabular-nums">
              {mad(modules.devisAcceptesMontant)}
            </span>
          </p>
        )}
      </section>

      {/* ── Alert list ── */}
      <section aria-labelledby="alerts-heading">
        <div className="flex items-center justify-between mb-3">
          <h2
            id="alerts-heading"
            className="text-sm font-medium text-text"
          >
            Alertes du jour
          </h2>
          {alertedLeads.length > 0 && (
            <span className="text-xs text-text-muted tabular-nums">
              {alertedLeads.length} lead
              {alertedLeads.length > 1 ? "s" : ""} concerné
              {alertedLeads.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="card overflow-hidden">
          {alertedLeads.length === 0 ? (
            <p className="px-4 py-5 text-sm text-text-muted">
              Rien à signaler aujourd&apos;hui.
            </p>
          ) : (
            <ul role="list">
              {alertedLeads.map(({ lead, alerts }) =>
                // Show only the most urgent alert per lead to keep the list compact.
                alerts
                  .slice(0, 1)
                  .map((alert) => (
                    <li key={`${lead.leadId}-${alert.kind}`}>
                      <AlertRow lead={lead} alert={alert} />
                    </li>
                  ))
              )}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
