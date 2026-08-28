import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie } from "@/lib/session";
import { getAllPosts, createPost, BlogError } from "@/lib/blog";
import { revalidateBlog } from "@/lib/revalidate";
import type { BlogPostInsert } from "@/types";

/** GET /api/blog — every post, drafts included. */
export async function GET(_req: NextRequest) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    return NextResponse.json({ data: await getAllPosts() }, { status: 200 });
  } catch (err) {
    if (err instanceof BlogError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error("[GET /api/blog] Unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}

/** POST /api/blog — creates a post. */
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

    const input = body as BlogPostInsert;
    if (!input.slug?.trim() || !input.name?.trim() || !input.language) {
      return NextResponse.json(
        { error: "Le slug, le titre et la langue sont obligatoires." },
        { status: 400 }
      );
    }

    const created = await createPost(input);
    await revalidateBlog([created.slug]);

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    if (err instanceof BlogError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    console.error("[POST /api/blog] Unexpected error:", err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}
