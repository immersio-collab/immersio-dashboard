import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie } from "@/lib/session";
import { getSupabaseClient } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const leadId = params.id;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés." }, { status: 400 });
    }

    // Maximum 15 Mo
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Le fichier dépasse la taille maximale (15 Mo)." }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const fileName = `${leadId}/devis_${Date.now()}.pdf`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("devis")
      .upload(fileName, fileBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[Upload devis error]", uploadError);
      return NextResponse.json({ error: `Erreur stockage: ${uploadError.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from("devis")
      .getPublicUrl(fileName);

    const devisUrl = publicUrlData.publicUrl;

    // Update lead record with devisUrl and set devisEnvoye to "Oui"
    const { error: dbError } = await supabase
      .from("leads")
      .update({
        devisUrl,
        devisEnvoye: "Oui",
      })
      .eq("leadId", leadId);

    if (dbError) {
      console.error("[DB devis update error]", dbError);
      return NextResponse.json({ error: `Erreur base de données: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ devisUrl, success: true });
  } catch (err: any) {
    console.error("[Upload devis unexpected error]", err);
    return NextResponse.json({ error: err.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const leadId = params.id;

  try {
    const supabase = getSupabaseClient();

    const { error: dbError } = await supabase
      .from("leads")
      .update({
        devisUrl: null,
      })
      .eq("leadId", leadId);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur serveur." }, { status: 500 });
  }
}
