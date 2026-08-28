/**
 * GET /api/public/portfolio
 *
 * Replaces the Google Apps Script endpoint immersio.ma read. The three actions
 * keep their names and response shapes, with one deliberate change:
 * `portfolio_project` now requires `lang`.
 *
 *   ?action=portfolio&lang=French            → PortfolioProject[]
 *   ?action=portfolio_project&slug=X&lang=Y  → PortfolioProject | null
 *   ?action=portfolio_slugs                  → PortfolioSlugEntry[]
 *
 * The old endpoint took no language on the single-project lookup, and four
 * projects share a slug across languages — so /fr/portfolio/appartement-luxe-rabat
 * served the English record. `lang` is mandatory here so that cannot recur.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  getPublishedProjects,
  getProjectBySlug,
  getAllSlugs,
  PortfolioError,
} from "@/lib/portfolio";
import type { PortfolioLanguage } from "@/types";

export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  "https://immersio.ma",
  "https://www.immersio.ma",
]);

function corsHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function parseLanguage(raw: string | null): PortfolioLanguage | null {
  return raw === "French" || raw === "English" ? raw : null;
}

export async function GET(req: NextRequest) {
  const headers = corsHeaders(req);
  const params = new URL(req.url).searchParams;
  const action = params.get("action");

  try {
    switch (action) {
      case "portfolio": {
        const language = parseLanguage(params.get("lang"));
        if (!language) {
          return NextResponse.json(
            { error: "Le paramètre 'lang' doit valoir 'French' ou 'English'." },
            { status: 400, headers }
          );
        }
        return NextResponse.json(await getPublishedProjects(language), { status: 200, headers });
      }

      case "portfolio_project": {
        const slug = params.get("slug");
        const language = parseLanguage(params.get("lang"));
        if (!slug) {
          return NextResponse.json(
            { error: "Le paramètre 'slug' est obligatoire." },
            { status: 400, headers }
          );
        }
        if (!language) {
          return NextResponse.json(
            {
              error:
                "Le paramètre 'lang' est obligatoire : plusieurs projets partagent un slug entre le français et l'anglais.",
            },
            { status: 400, headers }
          );
        }
        // null on an unknown slug, as before: the site turns it into notFound().
        return NextResponse.json(await getProjectBySlug(slug, language), { status: 200, headers });
      }

      case "portfolio_slugs":
        return NextResponse.json(await getAllSlugs(), { status: 200, headers });

      default:
        return NextResponse.json(
          {
            error:
              "Le paramètre 'action' doit valoir 'portfolio', 'portfolio_project' ou 'portfolio_slugs'.",
          },
          { status: 400, headers }
        );
    }
  } catch (err) {
    if (err instanceof PortfolioError) {
      console.error(`[GET /api/public/portfolio?action=${action}] Portfolio error:`, err.message);
    } else {
      console.error(`[GET /api/public/portfolio?action=${action}] Unexpected error:`, err);
    }
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500, headers });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: { ...corsHeaders(req), "Access-Control-Max-Age": "86400" },
  });
}
