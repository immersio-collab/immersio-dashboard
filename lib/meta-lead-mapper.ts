/**
 * lib/meta-lead-mapper.ts — Maps raw Meta Ads lead data from the Google Sheet
 * to the Supabase `leads` table format.
 *
 * The Google Sheet "immersio leads" (Sheet1) receives leads automatically from
 * Meta (Facebook / Instagram) forms. Each row has these columns:
 *   id | created_time | ad_id | ad_name | adset_id | adset_name |
 *   campaign_id | campaign_name | form_id | form_name | is_organic |
 *   platform | first_name | phone_number | city | email | lead_status
 *
 * Values in the sheet use prefixes:
 *   id → "l:27859475160341124"  (used as-is for leadId)
 *   phone_number → "p:+212642390467"  (strip "p:" prefix)
 *   ad_id → "ag:..."  adset_id → "as:..."  campaign_id → "c:..."
 *   form_id → "f:..."  (all kept for traceability)
 *
 * This module converts that raw payload into a Partial<Lead> ready for
 * insertion into Supabase, including:
 *   - Platform → canal mapping (ig → Instagram, fb → Facebook)
 *   - Automatic relance date calculation (+1d, +3d, +7d)
 *   - Telephone normalisation (strip p: prefix, format +212)
 *   - leadId used directly from the sheet (already prefixed l:)
 */

import type { Lead, LeadCanal } from "@/types/lead";

// ---------------------------------------------------------------------------
// Incoming payload shape (what the Apps Script sends via webhook)
// ---------------------------------------------------------------------------

export interface MetaLeadPayload {
  /** Lead ID from the sheet (already prefixed, e.g. "l:27859475160341124"). */
  id: string;
  /** ISO-8601 timestamp when the form was submitted. */
  created_time: string;
  /** Meta Ad ID (prefixed "ag:", kept for traceability). */
  ad_id?: string;
  /** Meta Ad name (e.g. "AD1", "AD2"). */
  ad_name?: string;
  /** Meta Adset ID (prefixed "as:"). */
  adset_id?: string;
  /** Meta Adset name (e.g. "New Leads ad set"). */
  adset_name?: string;
  /** Meta Campaign ID (prefixed "c:"). */
  campaign_id?: string;
  /** Meta Campaign name (e.g. "immersio", "New Leads", "for cabinet"). */
  campaign_name?: string;
  /** Meta Form ID (prefixed "f:"). */
  form_id?: string;
  /** Meta Form name (e.g. "FORMULAIRE 2"). */
  form_name?: string;
  /** "true" | "false" — whether the lead is organic. */
  is_organic?: string;
  /** "ig" | "fb" | "an" | other — the platform the lead came from. */
  platform?: string;
  /** First name of the lead. */
  first_name?: string;
  /** Phone number (prefixed "p:", e.g. "p:+212642390467"). */
  phone_number?: string;
  /** City of the lead. */
  city?: string;
  /** Email of the lead. */
  email?: string;
  /** Lead status from Meta (e.g. "CREATED"). */
  lead_status?: string;
}

// ---------------------------------------------------------------------------
// Platform → Canal mapping
// ---------------------------------------------------------------------------

function platformToCanal(platform?: string, isOrganic?: string): LeadCanal {
  if (isOrganic === "true") return "Site web";

  switch (platform?.toLowerCase()) {
    case "ig":
    case "instagram":
      return "Instagram";
    case "fb":
    case "facebook":
      return "Facebook";
    default:
      return "Facebook"; // Default for Meta leads
  }
}

// ---------------------------------------------------------------------------
// Telephone normalisation
// ---------------------------------------------------------------------------

/**
 * Normalises a phone number to a consistent format.
 * - Strips the "p:" prefix used in the Google Sheet
 * - Removes spaces, dashes, parentheses
 * - Ensures the +212 prefix for Moroccan numbers
 */
export function normalisePhone(raw?: string): string {
  if (!raw) return "";
  // Strip the "p:" prefix from the sheet format
  let value = raw.trim();
  if (value.toLowerCase().startsWith("p:")) {
    value = value.slice(2);
  }
  // Remove all non-digit characters except leading +
  let cleaned = value.replace(/[^\d+]/g, "");
  // If it starts with +, keep as-is
  if (cleaned.startsWith("+")) return cleaned;
  // If it starts with 00, replace with +
  if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
  // If it starts with 0 and has 10 digits (Moroccan local), add +212
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return "+212" + cleaned.slice(1);
  }
  // If it already starts with 212 (no +), add +
  if (cleaned.startsWith("212")) return "+" + cleaned;
  return cleaned;
}

// ---------------------------------------------------------------------------
// Relance date calculation
// ---------------------------------------------------------------------------

function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

// ---------------------------------------------------------------------------
// Main mapper
// ---------------------------------------------------------------------------

/**
 * Maps a raw Meta lead payload to a Partial<Lead> suitable for Supabase insert.
 *
 * The returned object includes:
 * - `leadId` used directly from the sheet (already has "l:" prefix)
 * - `statut` set to "Nouveau"
 * - Relance dates calculated from `created_time`
 * - Phone number cleaned ("p:" prefix stripped)
 * - All CRM fields initialised to sensible defaults
 */
export function mapMetaLeadToSupabase(raw: MetaLeadPayload): Partial<Lead> {
  const createdDate = new Date(raw.created_time);
  const isValidDate = !isNaN(createdDate.getTime());
  const dateFormulaire = isValidDate ? createdDate.toISOString() : new Date().toISOString();
  const baseDate = isValidDate ? createdDate : new Date();

  return {
    // Use the id directly — it already has the "l:" prefix from the sheet
    leadId: raw.id.trim(),
    nom: raw.first_name?.trim() || "",
    telephone: normalisePhone(raw.phone_number),
    email: raw.email?.trim() || undefined,
    canal: platformToCanal(raw.platform, raw.is_organic),
    ville: raw.city?.trim() || "",
    typeDeBien: "",
    surface: "",
    dateFormulaire,
    doublon: "",
    date1erContact: "",
    appelTelephonique: "",
    statut: "Nouveau",
    contacteSurWhatsapp: "",
    devisEnvoye: "",
    demoEnvoye: "",
    prixProposeMAD: "",
    dateDeEchange: "",
    relance1Auto: addDays(baseDate, 1),
    relance2Auto: addDays(baseDate, 3),
    relance3Auto: addDays(baseDate, 7),
    relance1Fait: false,
    relance2Fait: false,
    relance3Fait: false,
    notes: "",
    archive: "Non",
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates the incoming Meta lead payload.
 * Returns an array of error messages (empty if valid).
 */
export function validateMetaPayload(payload: unknown): string[] {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object") {
    return ["Le payload doit être un objet JSON."];
  }

  const p = payload as Record<string, unknown>;

  if (!p.id || typeof p.id !== "string" || p.id.trim().length === 0) {
    errors.push("Le champ 'id' est requis.");
  }

  if (!p.created_time || typeof p.created_time !== "string") {
    errors.push("Le champ 'created_time' est requis.");
  } else if (isNaN(new Date(p.created_time as string).getTime())) {
    errors.push("Le champ 'created_time' n'est pas une date valide.");
  }

  return errors;
}
