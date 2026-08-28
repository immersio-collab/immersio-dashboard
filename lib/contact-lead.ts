/**
 * lib/contact-lead.ts — Maps an immersio.ma contact-form submission onto a
 * row of the `leads` table.
 *
 * Website submissions are not a separate kind of record: they are leads whose
 * `canal` is "Site web", so they land in the existing pipeline (statut,
 * relances, devis, notes) with no parallel UI to maintain. This mirrors
 * lib/meta-lead-mapper.ts, which does the same job for Meta leads.
 *
 * The site sends already-localised French labels (see its /api/contact route);
 * nothing here translates slugs, so the CRM vocabulary does not depend on the
 * visitor's language.
 */

import type { TablesInsert } from "@/types/supabase";

/** Shape posted by immersio.ma. Every field arrives as a string. */
export interface ContactSubmission {
  name?: string;
  email?: string;
  whatsapp?: string;
  spaceType?: string;
  city?: string;
  surface?: string;
  message?: string;
}

/**
 * Rejects submissions that could not be worked as leads.
 *
 * Deliberately the same rule as the site's own form validation (name +
 * whatsapp): anything the visitor could actually submit must be accepted here,
 * or a real prospect is dropped between the two services.
 */
export function validateContactSubmission(payload: unknown): string[] {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return ["Le corps de la requête doit être un objet JSON."];
  }

  const p = payload as ContactSubmission;
  if (!p.name?.trim()) errors.push("Le champ 'name' est obligatoire.");
  if (!p.whatsapp?.trim()) errors.push("Le champ 'whatsapp' est obligatoire.");

  return errors;
}

/**
 * Builds the lead id for a website submission.
 *
 * Meta leads carry Meta's own id prefixed with "l:"; a form submission has no
 * external identifier, so one is minted here. The "web:" prefix keeps the two
 * origins distinguishable at a glance in the database.
 */
function buildLeadId(now: Date): string {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8);
  return `web:${stamp}-${random}`;
}

/**
 * Maps a validated submission onto an insertable `leads` row.
 *
 * Empty strings are normalised to null: Supabase rejects "" on the timestamptz
 * columns, and a null reads as "never filled in" everywhere else in the app.
 */
export function mapContactToLead(
  submission: ContactSubmission,
  now: Date = new Date()
): TablesInsert<"leads"> {
  const clean = (v?: string): string | null => {
    const t = v?.trim();
    return t ? t : null;
  };

  return {
    leadId: buildLeadId(now),
    nom: clean(submission.name),
    telephone: clean(submission.whatsapp),
    email: clean(submission.email),
    canal: "Site web",
    ville: clean(submission.city),
    typeDeBien: clean(submission.spaceType),
    surface: clean(submission.surface),
    notes: clean(submission.message),
    dateFormulaire: now.toISOString(),
    statut: "Nouveau",
    doublon: "",
    archive: "FALSE",
  };
}
