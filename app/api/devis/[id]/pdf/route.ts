import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie } from "@/lib/session";
import { getSupabaseClient } from "@/lib/supabase";
import { getDevisById } from "@/lib/devis";

/**
 * POST /api/devis/[id]/pdf
 *
 * Archives the generated PDF in the `devis` Storage bucket and records its URL
 * on the quotation.
 *
 * The document is uploaded rather than regenerated on demand because the saved
 * row cannot reproduce it: it stores the computed tour price, not the base
 * price and coefficients it came from, and the rows imported from the Sheet
 * never had them at all. Archiving keeps the exact document that was sent.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = params;

  try {
    const devis = await getDevisById(id);
    if (!devis) {
      return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Le fichier dépasse 15 Mo." }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    // Keyed by quotation number so the archive stays readable in the bucket.
    const fileName = `generes/${devis.devis_number}.pdf`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("devis")
      .upload(fileName, buffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      console.error("[devis pdf] upload error:", uploadError);
      return NextResponse.json({ error: `Erreur stockage : ${uploadError.message}` }, { status: 502 });
    }

    const { data: publicUrl } = supabase.storage.from("devis").getPublicUrl(fileName);

    const { data, error } = await supabase
      .from("devis")
      .update({ pdf_url: publicUrl.publicUrl, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[devis pdf] update error:", error);
      return NextResponse.json({ error: "PDF stocké mais lien non enregistré." }, { status: 502 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error(`[POST /api/devis/${id}/pdf] Unexpected error:`, err);
    return NextResponse.json({ error: "Erreur serveur inattendue." }, { status: 500 });
  }
}
