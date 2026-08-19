/**
 * lib/leads.ts — Server-only data access layer for the Leads feature.
 *
 * All functions in this file run exclusively on the server (Node.js runtime).
 * They communicate with the Supabase PostgreSQL database.
 */

import { getSupabaseClient } from "@/lib/supabase";
import type { Lead } from "@/types";

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
    .neq("archive", "TRUE"); // Handle different truthy values just in case

  if (error) {
    throw new LeadsError(`Supabase error: ${error.message}`);
  }

  return (data || []) as Lead[];
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
  const { error } = await supabase
    .from("leads")
    .update({ archive: "Oui" }) // Soft delete marker used previously
    .eq("leadId", leadId);

  if (error) {
    throw new LeadsError(`Supabase error: ${error.message}`);
  }
}

export async function createLead(fields: Partial<Lead>): Promise<any> {
  const supabase = getSupabaseClient();
  
  if (fields.dateFormulaire) {
    calculateRelanceDates(fields.dateFormulaire, {}, fields);
  }

  const sanitizedFields = sanitizeFieldsForDb(fields);
  
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
