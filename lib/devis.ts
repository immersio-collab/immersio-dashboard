/**
 * lib/devis.ts — Server-only data access for quotations.
 *
 * Replaces the Google Sheet that immersio-devis.vercel.app appended to. The
 * quotation number is left to the database: the old Apps Script read the last
 * row and incremented it, which two concurrent submissions would have raced on.
 * A sequence default cannot collide.
 */

import { getSupabaseClient } from "@/lib/supabase";
import type { DevisRecord, DevisInsert, DevisUpdate } from "@/types";

export class DevisError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "DevisError";
  }
}

async function selectRows(filter: (q: any) => any): Promise<DevisRecord[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await filter(supabase.from("devis").select("*"));
  if (error) throw new DevisError(`Supabase error: ${error.message}`);
  return (data || []) as DevisRecord[];
}

/**
 * Every non-archived quotation, newest first.
 *
 * Le filtre `archived` est appliqué en JS et non dans la requête : ainsi le
 * code fonctionne aussi avant que la colonne n'existe en base (migration SQL
 * scripts/sql/2026-08-29_archivage_lead_links.sql).
 */
export async function getAllDevis(): Promise<DevisRecord[]> {
  const rows = await selectRows((q) => q.order("created_at", { ascending: false }));
  return rows.filter((r) => !(r as { archived?: boolean }).archived);
}

/** Devis liés à un lead (non archivés), plus récents d'abord. */
export async function getDevisByLead(leadId: string): Promise<DevisRecord[]> {
  const rows = await selectRows((q) =>
    q.eq("lead_id", leadId).order("created_at", { ascending: false })
  );
  return rows.filter((r) => !(r as { archived?: boolean }).archived);
}

export async function getDevisById(id: string): Promise<DevisRecord | null> {
  const rows = await selectRows((q) => q.eq("id", id).limit(1));
  return rows[0] ?? null;
}

/**
 * Creates a quotation.
 *
 * `devis_number` is deliberately not sent: the column's default draws from
 * devis_number_seq, so the number is allocated inside the insert and comes
 * back on the returned row.
 */
export async function createDevis(input: DevisInsert): Promise<DevisRecord> {
  const supabase = getSupabaseClient();
  const { devis_number: _ignored, ...payload } = input as DevisInsert & { devis_number?: string };

  const { data, error } = await supabase
    .from("devis")
    .insert({ ...payload, updated_at: new Date().toISOString() } as any)
    .select()
    .single();

  if (error) throw new DevisError(`Supabase error: ${error.message}`);
  return data as DevisRecord;
}

export async function updateDevis(id: string, input: DevisUpdate): Promise<DevisRecord> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("devis")
    .update({ ...input, updated_at: new Date().toISOString() } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new DevisError(`Supabase error: ${error.message}`);
  return data as DevisRecord;
}

/**
 * Archive un devis (soft-delete) : la ligne et son PDF restent en base, le
 * dashboard ne l'affiche plus. Décision du 29/08/2026 : « supprimer »
 * signifie archiver, partout.
 */
export async function archiveDevis(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("devis")
    .update({ archived: true, updated_at: new Date().toISOString() } as any)
    .eq("id", id);
  if (error) throw new DevisError(`Supabase error: ${error.message}`);
}

export interface DevisStats {
  total: number;
  chiffreAffaires: number;
  acceptes: number;
  enAttente: number;
  refuses: number;
  panierMoyen: number;
}

/**
 * The figures the Sheet computed in its "Statistiques" tab.
 *
 * Kept because the tab disappears with the Sheet, and they are the numbers the
 * quotation list is judged on.
 */
export function computeStats(rows: ReadonlyArray<DevisRecord>): DevisStats {
  const total = rows.length;
  const chiffreAffaires = rows.reduce((sum, d) => sum + Number(d.total_ttc || 0), 0);
  const by = (s: string) => rows.filter((d) => d.statut === s).length;
  return {
    total,
    chiffreAffaires,
    acceptes: by("Accepté"),
    enAttente: by("En attente"),
    refuses: by("Refusé"),
    panierMoyen: total > 0 ? chiffreAffaires / total : 0,
  };
}
