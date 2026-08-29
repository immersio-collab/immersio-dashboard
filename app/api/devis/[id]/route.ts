import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie } from "@/lib/session";
import { getDevisById, updateDevis, archiveDevis, DevisError } from "@/lib/devis";
import type { DevisUpdate } from "@/types";

/** PATCH /api/devis/[id] — used for the status and any correction. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const { id } = params;

  try {
    const body: unknown = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Le corps de la requête doit être un objet JSON valide." },
        { status: 400 }
      );
    }

    const existing = await getDevisById(id);
    if (!existing) {
      return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
    }

    const updated = await updateDevis(id, body as DevisUpdate);
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    if (err instanceof DevisError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error(`[PATCH /api/devis/${id}] Unexpected error:`, err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}

/** DELETE /api/devis/[id] — archive (soft-delete) : le devis et son PDF restent en base. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const { id } = params;

  try {
    await archiveDevis(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof DevisError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error(`[DELETE /api/devis/${id}] Unexpected error:`, err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}
