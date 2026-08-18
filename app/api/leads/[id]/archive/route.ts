import { NextResponse, type NextRequest } from "next/server";

import { hasSessionCookie } from "@/lib/session";
import { archiveLead, LeadsError } from "@/lib/leads";

/**
 * POST /api/leads/[id]/archive
 *
 * Soft-deletes a lead by setting its "Archivé" column to "TRUE" in the sheet.
 * The row is preserved in Google Sheets but excluded from all future getLeads()
 * calls. Recoverable manually via the sheet if needed.
 *
 * No request body is required.
 *
 * Auth: requires a valid signed session cookie (`immersio_session`).
 *
 * Errors:
 *   401 — no valid session
 *   502 — Apps Script responded with an error
 *   500 — unexpected server-side failure
 */
export async function POST(
  _req: NextRequest,
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

  // ── 2. Call lib/leads.ts ──────────────────────────────────────────────────
  try {
    await archiveLead(leadId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof LeadsError) {
      return NextResponse.json(
        { error: "Le service externe a retourné une erreur.", detail: err.message },
        { status: 502 }
      );
    }
    console.error(`[POST /api/leads/${leadId}/archive] Unexpected error:`, err);
    return NextResponse.json(
      { error: "Erreur serveur inattendue." },
      { status: 500 }
    );
  }
}
