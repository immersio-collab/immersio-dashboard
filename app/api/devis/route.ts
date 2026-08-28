import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie } from "@/lib/session";
import { getAllDevis, createDevis, DevisError } from "@/lib/devis";
import type { DevisInsert } from "@/types";

/** GET /api/devis — every quotation, newest first. */
export async function GET(_req: NextRequest) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  try {
    return NextResponse.json({ data: await getAllDevis() }, { status: 200 });
  } catch (err) {
    if (err instanceof DevisError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error("[GET /api/devis] Unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}

/**
 * POST /api/devis
 * The quotation number is allocated by the database, never by the client.
 */
export async function POST(req: NextRequest) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  try {
    const body: unknown = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Le corps de la requête doit être un objet JSON valide." },
        { status: 400 }
      );
    }

    const input = body as DevisInsert;
    if (!input.client_nom?.trim()) {
      return NextResponse.json({ error: "Le nom du client est obligatoire." }, { status: 400 });
    }

    const created = await createDevis(input);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    if (err instanceof DevisError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error("[POST /api/devis] Unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}
