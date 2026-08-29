/**
 * lib/leads.ts — Server-only data access layer for the Leads feature.
 *
 * All functions in this file run exclusively on the server (Node.js runtime).
 * They communicate with the Supabase PostgreSQL database.
 */

import { getSupabaseClient } from "@/lib/supabase";
import type { Lead } from "@/types";
import { normalisePhone } from "@/lib/meta-lead-mapper";

export { 
  getLeadAlerts,
  isRappelDue,
  isRappelToday,
  hasActiveRappel,
  getRappelStatus,
  type RappelStatus
} from "@/lib/lead-alerts";

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class LeadsError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "LeadsError";
  }
}

// ---------------------------------------------------------------------------
// Public API — get / update / archive
// ---------------------------------------------------------------------------

export async function getLeads(): Promise<Lead[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .neq("archive", "Oui")
    .neq("archive", "TRUE") // Handle different truthy values just in case
    // Sans ORDER BY, PostgreSQL ne garantit aucun ordre : l'affichage pouvait
    // changer d'un rafraîchissement à l'autre. Plus récents d'abord.
    .order("dateFormulaire", { ascending: false, nullsFirst: false });

  if (error) {
    throw new LeadsError(`Supabase error: ${error.message}`);
  }

  return withLinkedDevis((data || []) as Lead[]);
}

/**
 * Complète les leads avec les informations de leur devis le plus récent.
 *
 * `devisEnvoye`, `prixProposeMAD` et `devisUrl` existaient en double : saisis
 * à la main sur le lead d'un côté, calculés par le module Devis de l'autre,
 * sans rien pour les synchroniser. Un devis de 18 000 MAD pouvait coexister
 * avec un lead affichant « Devis envoyé : Non » et un prix vide.
 *
 * Le devis lié fait désormais foi ; les valeurs stockées ne subsistent que
 * pour les leads sans devis rattaché — notamment ceux importés du Sheet.
 *
 * Ne lève jamais : un lead reste exploitable même si la table devis est
 * indisponible, ou si la colonne lead_id n'existe pas encore.
 */
async function withLinkedDevis(leads: Lead[]): Promise<Lead[]> {
  if (leads.length === 0) return leads;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("devis")
      .select("lead_id, total_ttc, pdf_url, archived, created_at")
      .not("lead_id", "is", null)
      .order("created_at", { ascending: false });

    if (error || !data) return leads;

    // Le premier rencontré par lead est le plus récent (requête triée).
    const latest = new Map<string, (typeof data)[number]>();
    for (const d of data) {
      if (d.archived || !d.lead_id) continue;
      if (!latest.has(d.lead_id)) latest.set(d.lead_id, d);
    }
    if (latest.size === 0) return leads;

    return leads.map((lead) => {
      const devis = latest.get(lead.leadId);
      if (!devis) return lead;
      return {
        ...lead,
        devisEnvoye: "Oui",
        prixProposeMAD: Number(devis.total_ttc || 0).toLocaleString("fr-FR"),
        // Un PDF téléversé à la main sur la fiche reste accessible si le devis
        // n'a pas encore été archivé côté Storage.
        devisUrl: devis.pdf_url ?? lead.devisUrl,
        devisDerive: true,
      };
    });
  } catch {
    return leads;
  }
}

/**
 * Sous-ensemble des leads nécessaire aux pastilles de l'en-tête.
 *
 * La barre latérale est rendue par le layout du dashboard, donc sur chaque
 * page : consulter le blog ou les devis rapatriait jusqu'ici la table des
 * leads entière (select *, puis une seconde requête pour les devis liés) pour
 * n'en tirer que trois compteurs. Seules les colonnes que la logique
 * d'alertes consulte sont demandées ici, et l'enrichissement est sauté.
 */
export async function getLeadsForBadges(): Promise<Lead[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "leadId, nom, statut, doublon, dateFormulaire, date1erContact, dateDeEchange, " +
        "appelTelephonique, contacteSurWhatsapp, " +
        "relance1Auto, relance2Auto, relance3Auto, " +
        "relance1Fait, relance2Fait, relance3Fait, " +
        "rappelDate, rappelNote, rappelFait"
    )
    .neq("archive", "Oui")
    .neq("archive", "TRUE");

  if (error) {
    throw new LeadsError(`Supabase error: ${error.message}`);
  }

  return (data || []) as unknown as Lead[];
}

function sanitizeFieldsForDb(fields: Partial<Lead>) {
  const sanitized: any = { ...fields };
  const dateFields = [
    "dateFormulaire",
    "date1erContact",
    "dateDeEchange",
    "relance1Auto",
    "relance2Auto",
    "relance3Auto",
    "rappelDate",
  ];
  for (const field of dateFields) {
    if (sanitized[field] === "") {
      sanitized[field] = null;
    }
  }
  return sanitized;
}

function calculateRelanceDates(baseDateStr: string, currentLead: Partial<Lead>, fieldsToUpdate: Partial<Lead>) {
  const baseDate = new Date(baseDateStr);
  if (isNaN(baseDate.getTime())) return;

  const addDays = (d: Date, days: number) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    return nd.toISOString();
  };

  const isR1Fait = fieldsToUpdate.relance1Fait !== undefined ? fieldsToUpdate.relance1Fait : currentLead.relance1Fait;
  const isR2Fait = fieldsToUpdate.relance2Fait !== undefined ? fieldsToUpdate.relance2Fait : currentLead.relance2Fait;
  const isR3Fait = fieldsToUpdate.relance3Fait !== undefined ? fieldsToUpdate.relance3Fait : currentLead.relance3Fait;

  if (!isR1Fait) {
    fieldsToUpdate.relance1Auto = addDays(baseDate, 1);
  }
  if (!isR2Fait) {
    fieldsToUpdate.relance2Auto = addDays(baseDate, 3);
  }
  if (!isR3Fait) {
    fieldsToUpdate.relance3Auto = addDays(baseDate, 7);
  }
}

export async function updateLead(
  leadId: string,
  fields: Partial<Lead>
): Promise<void> {
  const supabase = getSupabaseClient();

  // Fetch existing lead to check what needs shifting
  const { data: existingLead, error: fetchError } = await supabase
    .from("leads")
    .select("*")
    .eq("leadId", leadId)
    .single();

  if (fetchError) {
    throw new LeadsError(`Supabase error: ${fetchError.message}`);
  }

  // Frontend now handles the recalculation logic when dateDeEchange is manually changed,
  // and sends the updated relanceXAuto fields. We just save them.
  const sanitizedFields = sanitizeFieldsForDb(fields);
  if (sanitizedFields.telephone) {
    sanitizedFields.telephone = normalisePhone(sanitizedFields.telephone);
  }
  
  const { error } = await supabase
    .from("leads")
    .update(sanitizedFields)
    .eq("leadId", leadId);

  if (error) {
    throw new LeadsError(`Supabase error: ${error.message}`);
  }
}

export async function archiveLead(leadId: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  // 1. Fetch the phone number of the lead being archived
  const { data: leadToArchive } = await supabase
    .from("leads")
    .select("telephone")
    .eq("leadId", leadId)
    .single();

  // 2. Archive the lead
  const { error } = await supabase
    .from("leads")
    .update({ archive: "Oui" }) // Soft delete marker used previously
    .eq("leadId", leadId);

  if (error) {
    throw new LeadsError(`Supabase error: ${error.message}`);
  }

  // 3. Re-evaluate duplicate status for the remaining leads with the same phone
  if (leadToArchive?.telephone) {
    const { data: remainingLeads } = await supabase
      .from("leads")
      .select("leadId")
      .eq("telephone", leadToArchive.telephone)
      .neq("archive", "Oui");
      
    // If only one active lead remains with this phone, it's no longer a duplicate
    if (remainingLeads && remainingLeads.length <= 1) {
      // Clear the doublon flag for the remaining lead(s)
      for (const rl of remainingLeads) {
        await supabase
          .from("leads")
          .update({ doublon: null })
          .eq("leadId", rl.leadId);
      }
    }
  }
}

export async function createLead(fields: Partial<Lead>): Promise<any> {
  const supabase = getSupabaseClient();
  
  if (fields.dateFormulaire) {
    calculateRelanceDates(fields.dateFormulaire, {}, fields);
  }

  const sanitizedFields = sanitizeFieldsForDb(fields);
  if (sanitizedFields.telephone) {
    sanitizedFields.telephone = normalisePhone(sanitizedFields.telephone);
  }
  
  // Check for duplicates by phone
  let isDuplicate = false;
  
  if (sanitizedFields.telephone) {
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("leadId")
      .eq("telephone", sanitizedFields.telephone as string)
      .limit(1);
    
    if (existingLeads && existingLeads.length > 0) {
      isDuplicate = true;
      sanitizedFields.doublon = "⚠ Doublon";
    }
  }

  // Create a minimal new lead if no ID is provided, typically clients should pass leadId
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const leadToInsert = {
    ...sanitizedFields,
    leadId: sanitizedFields.leadId || `l:${Date.now()}${randomSuffix}`, 
    archive: "Non",
    relance1Fait: false,
    relance2Fait: false,
    relance3Fait: false,
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(leadToInsert)
    .select()
    .single();

  if (error) {
    throw new LeadsError(`Supabase error: ${error.message}`);
  }
  
  if (isDuplicate) {
    return { ...data, duplicate: true };
  }
  
  return data;
}
