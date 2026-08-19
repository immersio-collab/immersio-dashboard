/**
 * POST /api/leads/webhook
 *
 * Receives a new Meta lead payload from the Google Apps Script trigger
 * and inserts it into the Supabase `leads` table.
 *
 * Authentication: The request must include a header `X-Webhook-Secret`
 * matching the WEBHOOK_SECRET environment variable. This prevents
 * unauthorised insertions.
 *
 * Anti-doublon: If a lead with the same `leadId` (meta:{id}) already
 * exists in Supabase, the endpoint returns 200 OK (idempotent) instead
 * of inserting a duplicate.
 *
 * Flow:
 *   Apps Script → POST /api/leads/webhook → validate → map → upsert → 201
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import {
  mapMetaLeadToSupabase,
  validateMetaPayload,
  type MetaLeadPayload,
} from "@/lib/meta-lead-mapper";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWebhookSecret(): string {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "[webhook] WEBHOOK_SECRET is not defined in environment variables."
    );
  }
  return secret;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // ── 1. Auth: verify webhook secret ───────────────────────────────────────
  const providedSecret = req.headers.get("x-webhook-secret");

  if (!providedSecret || providedSecret !== getWebhookSecret()) {
    return NextResponse.json(
      { error: "Accès non autorisé. Secret webhook invalide." },
      { status: 401 }
    );
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Le corps de la requête doit être du JSON valide." },
      { status: 400 }
    );
  }

  // ── 3. Support batch (array) or single lead ──────────────────────────────
  const payloads: unknown[] = Array.isArray(body) ? body : [body];
  const results: Array<{ id: string; status: "created" | "exists" | "error"; error?: string }> = [];

  for (const payload of payloads) {
    // ── 3a. Validate ───────────────────────────────────────────────────────
    const validationErrors = validateMetaPayload(payload);
    if (validationErrors.length > 0) {
      results.push({
        id: (payload as any)?.id || "unknown",
        status: "error",
        error: validationErrors.join("; "),
      });
      continue;
    }

    const metaLead = payload as MetaLeadPayload;
    const leadData = mapMetaLeadToSupabase(metaLead);

    try {
      const supabase = getSupabaseClient();

      // ── 3b. Check for existing lead (anti-doublon) ─────────────────────
      const { data: existing } = await supabase
        .from("leads")
        .select("leadId")
        .eq("leadId", leadData.leadId!)
        .maybeSingle();

      if (existing) {
        results.push({ id: metaLead.id, status: "exists" });
        continue;
      }

      // ── 3c. Sanitise date fields (Supabase timestamptz rejects "") ─────
      const dateFields = [
        "dateFormulaire", "date1erContact", "dateDeEchange",
        "relance1Auto", "relance2Auto", "relance3Auto", "rappelDate",
      ];
      const sanitised: Record<string, unknown> = { ...leadData };
      for (const field of dateFields) {
        if (sanitised[field] === "") sanitised[field] = null;
      }

      // ── 3c.1 Check for duplicates by phone ──────────────────────────────
      if (leadData.telephone) {
        const { data: existingDupe } = await supabase
          .from("leads")
          .select("leadId")
          .eq("telephone", leadData.telephone)
          .limit(1);
        
        if (existingDupe && existingDupe.length > 0) {
          sanitised.doublon = "⚠ Doublon";
        }
      }

      // ── 3d. Insert new lead ────────────────────────────────────────────
      const { error: insertError } = await supabase
        .from("leads")
        .insert(sanitised as any);

      if (insertError) {
        console.error(`[webhook] Insert error for ${metaLead.id}:`, insertError);
        results.push({
          id: metaLead.id,
          status: "error",
          error: insertError.message,
        });
        continue;
      }

      results.push({ id: metaLead.id, status: "created" });
    } catch (err) {
      console.error(`[webhook] Unexpected error for ${metaLead.id}:`, err);
      results.push({
        id: metaLead.id,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── 4. Response ──────────────────────────────────────────────────────────
  const created = results.filter((r) => r.status === "created").length;
  const existing = results.filter((r) => r.status === "exists").length;
  const errors = results.filter((r) => r.status === "error").length;

  const httpStatus = errors > 0 && created === 0 && existing === 0 ? 400 : 201;

  return NextResponse.json(
    {
      message: `${created} créé(s), ${existing} déjà existant(s), ${errors} erreur(s).`,
      results,
    },
    { status: httpStatus }
  );
}
