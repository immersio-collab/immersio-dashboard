/**
 * lib/leads.ts — Server-only data access layer for the Leads feature.
 *
 * All functions in this file run exclusively on the server (Node.js runtime).
 * They communicate with the Supabase PostgreSQL database.
 */

import { getSupabaseClient } from "@/lib/supabase";
import type { Lead } from "@/types";

export { getLeadAlerts } from "@/lib/lead-alerts";

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

export async function updateLead(
  leadId: string,
  fields: Partial<Lead>
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("leads")
    .update(fields)
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
  
  // Create a minimal new lead if no ID is provided, typically clients should pass leadId
  const leadToInsert = {
    ...fields,
    leadId: fields.leadId || `L-${Date.now()}`, 
    archive: "Non"
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(leadToInsert)
    .select()
    .single();

  if (error) {
    throw new LeadsError(`Supabase error: ${error.message}`);
  }
  
  return data;
}
