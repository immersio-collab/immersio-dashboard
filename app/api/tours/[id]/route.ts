import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie } from "@/lib/session";
import { updateTour, deleteTour, ToursError } from "@/lib/tours";
import type { TourUpdate } from "@/types";

/**
 * PATCH /api/tours/[id]
 * Updates fields of a single virtual tour.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const updated = await updateTour(id, body as TourUpdate);
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    if (err instanceof ToursError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error(`[PATCH /api/tours/${id}] Unexpected error:`, err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}

/**
 * DELETE /api/tours/[id]
 * Deletes a virtual tour.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = params;

  try {
    await deleteTour(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof ToursError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error(`[DELETE /api/tours/${id}] Unexpected error:`, err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}
