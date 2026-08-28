import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie } from "@/lib/session";
import { getProjectById, updateProject, deleteProject, PortfolioError } from "@/lib/portfolio";
import { revalidatePortfolio } from "@/lib/revalidate";
import type { PortfolioProjectUpdate } from "@/types";

/** PATCH /api/portfolio/[id] */
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

    // Read before writing: a slug rename invalidates two URLs, and the old
    // value is unrecoverable after the UPDATE.
    const existing = await getProjectById(id);
    if (!existing) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    const updated = await updateProject(id, body as PortfolioProjectUpdate);
    await revalidatePortfolio([existing.slug, updated.slug]);

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    if (err instanceof PortfolioError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error(`[PATCH /api/portfolio/${id}] Unexpected error:`, err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}

/** DELETE /api/portfolio/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const { id } = params;

  try {
    const existing = await getProjectById(id);
    await deleteProject(id);
    if (existing) await revalidatePortfolio([existing.slug]);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof PortfolioError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error(`[DELETE /api/portfolio/${id}] Unexpected error:`, err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}
