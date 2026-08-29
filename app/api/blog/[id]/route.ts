import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie } from "@/lib/session";
import { getPostById, updatePost, archivePost, BlogError } from "@/lib/blog";
import { revalidateBlog } from "@/lib/revalidate";
import type { BlogPostUpdate } from "@/types";

/** PATCH /api/blog/[id] */
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

    // Read before writing: renaming a slug invalidates two URLs on the site,
    // and the old one is unrecoverable once the UPDATE lands. Changing a slug
    // also drops whatever ranking the old URL held — the UI warns about it.
    const existing = await getPostById(id);
    if (!existing) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }

    const updated = await updatePost(id, body as BlogPostUpdate);
    await revalidateBlog([existing.slug, updated.slug]);

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    if (err instanceof BlogError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error(`[PATCH /api/blog/${id}] Unexpected error:`, err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}

/** DELETE /api/blog/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = params;

  try {
    const existing = await getPostById(id);

    await archivePost(id);

    if (existing) await revalidateBlog([existing.slug]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof BlogError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error(`[DELETE /api/blog/${id}] Unexpected error:`, err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}
