/**
 * lib/lead-alerts.ts — Pure alert computation for leads.
 *
 * This module has NO server-side dependencies (no process.env, no fetch,
 * no next/headers). It is safe to import from both Server Components and
 * Client Components.
 *
 * Extracted from lib/leads.ts so that the leads table (a Client Component)
 * can compute alert badges in the browser without triggering server-only
 * import errors.
 *
 * lib/leads.ts re-exports `getLeadAlerts` from here for backward compatibility:
 * existing server-side callers that import from "@/lib/leads" continue to work.
 */

import type { Lead, LeadAlert } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 48 h threshold for the "jamais contacté" alert. */
export const NEVER_CONTACTED_THRESHOLD_MS = 48 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Parses a sheet date string. Returns null when empty or unparseable. */
export function parseSheetDate(value: string | null | undefined): Date | null {
  if (!value || value.trim() === "") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Returns true when the given date is strictly in the past. */
function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Returns true when a contact was recorded after `relanceDate`.
 * Uses date1erContact and dateDeEchange as proxies for "contact happened".
 */
function isContactedAfter(lead: Lead, relanceDate: Date): boolean {
  const premier = parseSheetDate(lead.date1erContact);
  const dernier = parseSheetDate(lead.dateDeEchange);
  return (
    (premier !== null && premier.getTime() > relanceDate.getTime()) ||
    (dernier !== null && dernier.getTime() > relanceDate.getTime())
  );
}

// ---------------------------------------------------------------------------
// Rappel / Rendez-vous helpers
// ---------------------------------------------------------------------------

export type RappelStatus = "due" | "today" | "upcoming" | "done" | null;

/** Returns true if rappelDate is set and not marked as fait. */
export function hasActiveRappel(lead: Lead): boolean {
  if (!lead.rappelDate || lead.rappelFait) return false;
  const d = parseSheetDate(lead.rappelDate);
  return d !== null;
}

/** Returns true if rappel is due (date/time in the past and not completed). */
export function isRappelDue(lead: Lead): boolean {
  if (!lead.rappelDate || lead.rappelFait) return false;
  const d = parseSheetDate(lead.rappelDate);
  if (!d) return false;
  return isPast(d);
}

/** Returns true if rappel is scheduled for today (calendar day) and not completed. */
export function isRappelToday(lead: Lead): boolean {
  if (!lead.rappelDate || lead.rappelFait) return false;
  const d = parseSheetDate(lead.rappelDate);
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Computes granular status for a lead's reminder/appointment. */
export function getRappelStatus(lead: Lead): RappelStatus {
  if (!lead.rappelDate) return null;
  if (lead.rappelFait) return "done";
  if (isRappelDue(lead)) return "due";
  if (isRappelToday(lead)) return "today";
  return "upcoming";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Computes all active alerts for a single lead.
 *
 * Rules:
 *  1. rappel-du           — A scheduled rendezvous / reminder date is reached/passed and not marked done.
 *  2. relance-en-retard   — A relance date is past AND no subsequent contact.
 *                           Only the earliest overdue relance is reported.
 *  3. doublon-non-resolu  — doublon === "⚠ Doublon"
 *  4. jamais-contacte     — date1erContact empty AND dateFormulaire > 48 h ago
 *
 * @pure — no side effects, no async, no external state.
 */
export function getLeadAlerts(lead: Lead): LeadAlert[] {
  const alerts: LeadAlert[] = [];

  // ── 0. Rappel / Rendez-vous échu ou du jour ──────────────────────────────
  if (isRappelDue(lead)) {
    const d = parseSheetDate(lead.rappelDate || "");
    const dateFormatted = d ? d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "";
    const motif = lead.rappelNote ? ` : "${lead.rappelNote}"` : "";
    alerts.push({
      kind: "rappel-du",
      message: `Rendez-vous / Rappel prévu le ${dateFormatted}${motif}`,
    });
  }

  // ── 1. Jamais contacté (Calcul de l'état) ────────────────────────────────
  const dateFormulaire = parseSheetDate(lead.dateFormulaire);
  const contact1 = parseSheetDate(lead.date1erContact);
  const contactDernier = parseSheetDate(lead.dateDeEchange);

  const isStatutAdvanced =
    Boolean(lead.statut) &&
    (lead.statut ?? "").toLowerCase() !== "nouveau" &&
    (lead.statut ?? "").toLowerCase() !== "en pause";

  const hasRecordedContact =
    contact1 !== null ||
    contactDernier !== null ||
    lead.appelTelephonique === "Oui" ||
    lead.contacteSurWhatsapp === "Oui" ||
    isStatutAdvanced;

  // ── 2. Relance en retard ─────────────────────────────────────────────────
  // Si le statut est "Gagné", "Perdu" ou "En pause", aucune relance n'est considérée en retard
  const isInactiveStatus =
    lead.statut?.toLowerCase() === "gagné" ||
    lead.statut?.toLowerCase() === "gagne" ||
    lead.statut?.toLowerCase() === "perdu" ||
    lead.statut?.toLowerCase() === "en pause";

  // Ne montrer l'alerte de relance que si le lead a déjà été contacté au moins une fois
  if (hasRecordedContact && !isInactiveStatus) {
    const relanceDates: Array<{
      label: string;
      value: string | null;
      fait?: boolean;
    }> = [
      { label: "Relance 1", value: lead.relance1Auto, fait: Boolean(lead.relance1Fait) },
      { label: "Relance 2", value: lead.relance2Auto, fait: Boolean(lead.relance2Fait) },
      { label: "Relance 3", value: lead.relance3Auto, fait: Boolean(lead.relance3Fait) },
    ];

    for (const { label, value, fait } of relanceDates) {
      if (fait) continue;
      const date = parseSheetDate(value);
      if (date !== null && isPast(date) && !isContactedAfter(lead, date)) {
        alerts.push({
          kind: "relance-en-retard",
          message: `${label} échue le ${date.toLocaleDateString("fr-FR")} sans contact enregistré.`,
        });
        break; // only the earliest overdue relance
      }
    }
  }

  // ── 3. Doublon non résolu ────────────────────────────────────────────────
  if (lead.doublon === "⚠ Doublon") {
    alerts.push({
      kind: "doublon-non-resolu",
      message: "Ce lead a été marqué comme doublon et n'a pas encore été résolu.",
    });
  }

  // ── 4. Jamais contacté ───────────────────────────────────────────────────

  if (
    !hasRecordedContact &&
    dateFormulaire !== null &&
    Date.now() - dateFormulaire.getTime() > NEVER_CONTACTED_THRESHOLD_MS
  ) {
    const heures = Math.floor(
      (Date.now() - dateFormulaire.getTime()) / (1000 * 60 * 60)
    );
    alerts.push({
      kind: "jamais-contacte",
      message: `Formulaire soumis il y a ${heures}h sans aucun contact enregistré.`,
    });
  }

  return alerts;
}
