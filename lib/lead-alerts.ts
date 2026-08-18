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
export function parseSheetDate(value: string): Date | null {
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
// Public API
// ---------------------------------------------------------------------------

/**
 * Computes all active alerts for a single lead.
 *
 * Rules:
 *  1. relance-en-retard   — A relance date is past AND no subsequent contact.
 *                           Only the earliest overdue relance is reported.
 *  2. doublon-non-resolu  — doublon === "⚠ Doublon"
 *  3. jamais-contacte     — date1erContact empty AND dateFormulaire > 48 h ago
 *
 * @pure — no side effects, no async, no external state.
 */
export function getLeadAlerts(lead: Lead): LeadAlert[] {
  const alerts: LeadAlert[] = [];

  // ── 1. Relance en retard ─────────────────────────────────────────────────
  // Si le statut est "Gagné", aucune relance n'est considérée en retard
  const isGagne =
    lead.statut?.toLowerCase() === "gagné" ||
    lead.statut?.toLowerCase() === "gagne";

  if (!isGagne) {
    const relanceDates: Array<{
      label: string;
      value: string;
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

  // ── 2. Doublon non résolu ────────────────────────────────────────────────
  if (lead.doublon === "⚠ Doublon") {
    alerts.push({
      kind: "doublon-non-resolu",
      message: "Ce lead a été marqué comme doublon et n'a pas encore été résolu.",
    });
  }

  // ── 3. Jamais contacté ───────────────────────────────────────────────────
  const dateFormulaire = parseSheetDate(lead.dateFormulaire);
  const contact1 = parseSheetDate(lead.date1erContact);
  const contactDernier = parseSheetDate(lead.dateDeEchange);

  // Un lead est considéré comme déjà contacté s'il a une date de contact,
  // ou si un appel/WhatsApp a été enregistré, ou si son statut n'est plus "Nouveau" (ex: Contacté, Intéressé, Gagné, etc.)
  const isStatutAdvanced =
    Boolean(lead.statut) &&
    lead.statut.toLowerCase() !== "nouveau" &&
    lead.statut.toLowerCase() !== "en pause";

  const hasRecordedContact =
    contact1 !== null ||
    contactDernier !== null ||
    lead.appelTelephonique === "Oui" ||
    lead.contacteSurWhatsapp === "Oui" ||
    isStatutAdvanced;

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
