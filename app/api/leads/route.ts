import { NextResponse, type NextRequest } from "next/server";

import { hasSessionCookie } from "@/lib/session";
import { getLeads, createLead, LeadsError } from "@/lib/leads";

/**
 * GET /api/leads
 *
 * Returns all non-archived leads fetched from the Apps Script back-end.
 *
 * Auth: requires a valid signed session cookie (`immersio_session`).
 *       Returns 401 if missing or expired.
 *
 * Errors:
 *   401 — no valid session
 *   502 — Apps Script responded with an error (bad gateway)
 *   500 — unexpected server-side failure
 */
export async function GET(_req: NextRequest) {
  // ── 1. Auth guard ──────────────────────────────────────────────────────────
  if (!(await hasSessionCookie())) {
    return NextResponse.json(
      { error: "Non authentifié." },
      { status: 401 }
    );
  }

  // ── 2. Fetch leads from Apps Script ────────────────────────────────────────
  try {
    const leads = await getLeads();
    return NextResponse.json({ data: leads }, { status: 200 });
  } catch (err) {
    if (err instanceof LeadsError) {
      // Apps Script returned a non-2xx response.
      return NextResponse.json(
        { error: "Le service externe a retourné une erreur.", detail: err.message },
        { status: 502 }
      );
    }
    // Network failure or unexpected runtime error.
    console.error("[GET /api/leads] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur serveur inattendue." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads
 *
 * Creates a new lead.
 *
 * Auth: requires a valid signed session cookie.
 *
 * Errors:
 *   400 — invalid or empty body
 *   401 — no valid session
 *   502 — Apps Script responded with an error (bad gateway)
 *   500 — unexpected server-side failure
 */
export async function POST(req: NextRequest) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json(
      { error: "Non authentifié." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: "Le corps de la requête doit être un objet JSON non vide." },
        { status: 400 }
      );
    }

    const result = await createLead(body);

    // Check for an explicit error reported by the Apps Script
    if (result && result.result === "error") {
      return NextResponse.json(
        { error: result.message || "Le service externe a signalé une erreur." },
        { status: 502 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof LeadsError) {
      return NextResponse.json(
        { error: "Le service externe a retourné une erreur.", detail: err.message },
        { status: 502 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/leads] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur serveur inattendue.", detail: message },
      { status: 500 }
    );
  }
}
