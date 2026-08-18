import { NextResponse, type NextRequest } from "next/server";

import { hasSessionCookie } from "@/lib/session";
import { updateLead, LeadsError } from "@/lib/leads";
import type { Lead } from "@/types";

/**
 * PATCH /api/leads/[id]
 *
 * Partially updates the fields of a single lead.
 *
 * Request body (JSON):
 *   Partial<Lead> — only the fields to update.
 *   The `leadId` field in the body is ignored; the URL segment is authoritative.
 *
 * Auth: requires a valid signed session cookie (`immersio_session`).
 *
 * Errors:
 *   400 — request body is not valid JSON or is empty
 *   401 — no valid session
 *   502 — Apps Script responded with an error
 *   500 — unexpected server-side failure
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // ── 1. Auth guard ──────────────────────────────────────────────────────────
  if (!(await hasSessionCookie())) {
    return NextResponse.json(
      { error: "Non authentifié." },
      { status: 401 }
    );
  }

  const leadId = params.id;

  // ── 2. Parse + validate request body ──────────────────────────────────────
  let fields: Partial<Lead>;
  try {
    const body: unknown = await req.json();
    if (
      body === null ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).length === 0
    ) {
      return NextResponse.json(
        { error: "Le corps de la requête doit être un objet JSON non vide." },
        { status: 400 }
      );
    }
    // Strip `leadId` from body — the URL segment is the authoritative ID.
    const { leadId: _ignored, ...rest } = body as Record<string, unknown>;
    fields = rest as Partial<Lead>;
  } catch {
    return NextResponse.json(
      { error: "Corps de la requête invalide (JSON attendu)." },
      { status: 400 }
    );
  }

  // ── 3. Call lib/leads.ts ──────────────────────────────────────────────────
  try {
    await updateLead(leadId, fields);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof LeadsError) {
      return NextResponse.json(
        { error: "Le service externe a retourné une erreur.", detail: err.message },
        { status: 502 }
      );
    }
    console.error(`[PATCH /api/leads/${leadId}] Unexpected error:`, err);
    return NextResponse.json(
      { error: "Erreur serveur inattendue." },
      { status: 500 }
    );
  }
}
