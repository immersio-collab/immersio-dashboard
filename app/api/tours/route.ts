import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie } from "@/lib/session";
import { getTours, createTour, ToursError } from "@/lib/tours";
import { revalidateTours } from "@/lib/revalidate";
import type { TourInsert } from "@/types";

/**
 * GET /api/tours
 * Returns all virtual tours.
 */
export async function GET(_req: NextRequest) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const tours = await getTours();
    return NextResponse.json({ data: tours }, { status: 200 });
  } catch (err) {
    if (err instanceof ToursError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error("[GET /api/tours] Unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}

/**
 * POST /api/tours
 * Creates a new virtual tour.
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

    const tourData = body as TourInsert;
    if (!tourData.slug || !tourData.property_name) {
      return NextResponse.json(
        { error: "Le slug et le nom du bien sont obligatoires." },
        { status: 400 }
      );
    }

    const created = await createTour(tourData);

    // Publish the new tour on immersio.ma right away. Awaited rather than
    // detached: Vercel may freeze the function once the response is sent.
    await revalidateTours([created.slug]);

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    if (err instanceof ToursError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error("[POST /api/tours] Unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}
