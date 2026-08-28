/**
 * POST /api/public/contact
 *
 * Receives a contact-form submission from immersio.ma and records it in the
 * `leads` table with canal "Site web".
 *
 * Authentication: the request must carry `X-Webhook-Secret` matching
 * WEBHOOK_SECRET — the same shared secret the Meta leads webhook uses, since
 * both are external sources writing leads into this dashboard. Without it the
 * endpoint would let anyone flood the pipeline with fabricated prospects.
 *
 * Flow:
 *   immersio.ma /api/contact → POST here → validate → map → flag dupes → 201
 */

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import {
  mapContactToLead,
  validateContactSubmission,
  type ContactSubmission,
} from "@/lib/contact-lead";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    console.error("[contact] WEBHOOK_SECRET is not defined.");
    return NextResponse.json({ error: "Configuration serveur manquante." }, { status: 500 });
  }

  if (req.headers.get("x-webhook-secret") !== expected) {
    return NextResponse.json(
      { error: "Accès non autorisé. Secret invalide." },
      { status: 401 }
    );
  }

  // ── 2. Parse ─────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Le corps de la requête doit être du JSON valide." },
      { status: 400 }
    );
  }

  // ── 3. Validate ──────────────────────────────────────────────────────────
  const errors = validateContactSubmission(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const lead = mapContactToLead(body as ContactSubmission);

  // ── 4. Insert ────────────────────────────────────────────────────────────
  try {
    const supabase = getSupabaseClient();

    // Same rule as the Meta webhook: a prospect who already exists under this
    // number is flagged, never dropped. Someone filling the form twice is a
    // signal worth seeing, not a submission worth losing.
    if (lead.telephone) {
      const { data: existing } = await supabase
        .from("leads")
        .select("leadId")
        .eq("telephone", lead.telephone)
        .limit(1);

      if (existing && existing.length > 0) {
        lead.doublon = "⚠ Doublon";
      }
    }

    const { error: insertError } = await supabase.from("leads").insert(lead);

    if (insertError) {
      console.error("[contact] Insert error:", insertError);
      return NextResponse.json(
        { error: "Enregistrement impossible." },
        { status: 502 }
      );
    }

    console.log(
      `[contact] Lead créé : ${lead.leadId}${lead.doublon ? " (doublon)" : ""}`
    );

    return NextResponse.json(
      { result: "success", leadId: lead.leadId, doublon: !!lead.doublon },
      { status: 201 }
    );
  } catch (err) {
    console.error("[contact] Unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}
