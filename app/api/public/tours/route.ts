import { NextResponse, type NextRequest } from "next/server";
import { getActiveTours, getTourBySlug, ToursError } from "@/lib/tours";
import type { Tour } from "@/types";

/**
 * Never cache: this endpoint is the source of truth for immersio.ma, and a
 * cached response at this layer would silently defeat the on-demand
 * revalidation the site relies on.
 */
export const dynamic = "force-dynamic";

/**
 * Origins allowed to call this endpoint from a browser.
 *
 * immersio.ma reads it server-side, where no Origin header is sent and CORS
 * never applies — this list exists only for future client-side callers such
 * as an embeddable widget. Anything else gets the data refused by the
 * browser rather than a blanket wildcard.
 */
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  "https://immersio.ma",
  "https://www.immersio.ma",
]);

function corsHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    // The response varies by Origin, so it must not be cached across them.
    Vary: "Origin",
  };

  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

/**
 * Public projection of a tour row.
 *
 * An explicit allowlist rather than returning the row as-is: a column added
 * to `tours` later (internal notes, client contact, pricing) must not leak
 * to the public internet just by existing.
 */
function toPublicTour(tour: Tour) {
  return {
    slug: tour.slug,
    property_name: tour.property_name,
    client_name: tour.client_name,
    sector: tour.sector,
    realsee_url: tour.realsee_url,
    active: tour.active,
    updated_at: tour.updated_at,
  };
}

/**
 * GET /api/public/tours
 * GET /api/public/tours?slug=villa-du-parc
 *
 * Unauthenticated read of published virtual tours. Consumed by
 * immersio.ma/visite/[slug]. Returns `{ tour }` when a slug is given and
 * `{ tours }` otherwise — an envelope kept deliberately identical to the
 * Google Apps Script endpoint it replaces, so the site needed no rewrite.
 */
export async function GET(req: NextRequest) {
  const headers = corsHeaders(req);

  try {
    const slug = new URL(req.url).searchParams.get("slug");

    if (slug !== null) {
      const tour = await getTourBySlug(slug);

      if (!tour) {
        return NextResponse.json(
          { error: "Tour not found", slug },
          { status: 404, headers }
        );
      }

      return NextResponse.json({ tour: toPublicTour(tour) }, { status: 200, headers });
    }

    const tours = await getActiveTours();
    return NextResponse.json(
      { tours: tours.map(toPublicTour) },
      { status: 200, headers }
    );
  } catch (err) {
    if (err instanceof ToursError) {
      console.error("[GET /api/public/tours] Tours error:", err.message);
    } else {
      console.error("[GET /api/public/tours] Unexpected error:", err);
    }
    // Never surface the underlying message publicly — it can carry Supabase
    // schema details. The specifics stay in the server logs above.
    return NextResponse.json(
      { error: "Erreur serveur inattendue." },
      { status: 500, headers }
    );
  }
}

/**
 * OPTIONS /api/public/tours
 * CORS preflight.
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: { ...corsHeaders(req), "Access-Control-Max-Age": "86400" },
  });
}
