import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie } from "@/lib/session";
import { getAllProjects, createProject, PortfolioError } from "@/lib/portfolio";
import { revalidatePortfolio } from "@/lib/revalidate";
import type { PortfolioProjectInsert } from "@/types";

/** GET /api/portfolio — every project, drafts included. */
export async function GET(_req: NextRequest) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  try {
    return NextResponse.json({ data: await getAllProjects() }, { status: 200 });
  } catch (err) {
    if (err instanceof PortfolioError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error("[GET /api/portfolio] Unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}

/** POST /api/portfolio */
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

    const input = body as PortfolioProjectInsert;
    if (!input.slug?.trim() || !input.name?.trim() || !input.language) {
      return NextResponse.json(
        { error: "Le slug, le nom et la langue sont obligatoires." },
        { status: 400 }
      );
    }

    const created = await createProject(input);
    await revalidatePortfolio([created.slug]);

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    if (err instanceof PortfolioError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error("[POST /api/portfolio] Unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}
