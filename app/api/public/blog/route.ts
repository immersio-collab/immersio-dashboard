/**
 * GET /api/public/blog
 *
 * Drop-in replacement for the Google Apps Script endpoint immersio.ma read.
 * The three actions, their query parameters and their response shapes are
 * reproduced exactly — the site changed only its base URL.
 *
 *   ?action=posts&lang=French   → BlogPost[]        (blog index)
 *   ?action=post&slug=<slug>    → BlogPost | null   (article page)
 *   ?action=slugs               → BlogSlugEntry[]   (sitemap, static params)
 *
 * Unauthenticated by design: this serves content already public on
 * immersio.ma. Only posts with status "Published" are ever returned.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getPublishedPosts, getPostBySlug, getAllSlugs, BlogError } from "@/lib/blog";
import type { BlogLanguage } from "@/types";

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

function parseLanguage(raw: string | null): BlogLanguage | null {
  if (raw === "French" || raw === "English") return raw;
  return null;
}

export async function GET(req: NextRequest) {
  const headers = corsHeaders(req);
  const params = new URL(req.url).searchParams;
  const action = params.get("action");

  try {
    switch (action) {
      case "posts": {
        const language = parseLanguage(params.get("lang"));
        if (!language) {
          return NextResponse.json(
            { error: "Le paramètre 'lang' doit valoir 'French' ou 'English'." },
            { status: 400, headers }
          );
        }
        return NextResponse.json(await getPublishedPosts(language), { status: 200, headers });
      }

      case "post": {
        const slug = params.get("slug");
        if (!slug) {
          return NextResponse.json(
            { error: "Le paramètre 'slug' est obligatoire." },
            { status: 400, headers }
          );
        }
        // The Apps Script answered 200 with a null body for an unknown slug,
        // and the site turns a null into notFound(). Kept identical: a 404 here
        // would make getPostBySlug bail before it ever reads the body.
        return NextResponse.json(await getPostBySlug(slug), { status: 200, headers });
      }

      case "slugs":
        return NextResponse.json(await getAllSlugs(), { status: 200, headers });

      default:
        return NextResponse.json(
          { error: "Le paramètre 'action' doit valoir 'posts', 'post' ou 'slugs'." },
          { status: 400, headers }
        );
    }
  } catch (err) {
    if (err instanceof BlogError) {
      console.error(`[GET /api/public/blog?action=${action}] Blog error:`, err.message);
    } else {
      console.error(`[GET /api/public/blog?action=${action}] Unexpected error:`, err);
    }
    // Never surface the underlying message: it can carry schema details, and
    // the site treats any non-OK response as "no data" regardless.
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500, headers });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: { ...corsHeaders(req), "Access-Control-Max-Age": "86400" },
  });
}
