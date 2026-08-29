/**
 * scripts/clean-descriptions-hdr.mjs — Retire les mentions « panoramas HDR »
 * et « vidéo » de la PROSE des descriptions portfolio (description_html).
 * Complément de migrate-vocabulaire-2026-08-29.mjs qui a nettoyé les listes
 * de livrables : la décision « Panoramas HDR et Vidéo disparaissent du site
 * partout » couvre aussi le texte éditorial.
 *
 *   node scripts/clean-descriptions-hdr.mjs           → dry-run
 *   node scripts/clean-descriptions-hdr.mjs --apply   → applique + revalide
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/** Remplacements chirurgicaux, phrase par phrase. */
const REPLACEMENTS = [
  {
    from: "Inclut des outils de mesure précis, des panoramas HDR haute résolution et une navigation fluide dans toutes les zones médicales.",
    to: "Inclut des outils de mesure précis et une navigation fluide dans toutes les zones médicales.",
  },
  {
    from: "Features include precise space measurement tools, high-resolution HDR panoramas, and seamless navigation across all medical zones.",
    to: "Features include precise space measurement tools and seamless navigation across all medical zones.",
  },
];

const { data: projs, error } = await sb
  .from("portfolio_projects")
  .select("id,slug,language,description_html");
if (error) throw error;

const touched = new Set();
for (const p of projs) {
  let html = p.description_html ?? "";
  let next = html;
  for (const r of REPLACEMENTS) next = next.split(r.from).join(r.to);
  if (next === html) {
    // Signale les mentions restantes non couvertes par un remplacement connu.
    if (/panoramas? hdr|hdr panoramas?/i.test(html)) {
      console.warn(`[reste] ${p.slug} (${p.language}) mentionne encore HDR — remplacement manuel requis.`);
    }
    continue;
  }
  console.log(`${APPLY ? "[APPLY]" : "[DRY]  "} ${p.language === "French" ? "fr" : "en"}/${p.slug}: mention HDR retirée de la description`);
  touched.add(p.slug);
  if (APPLY) {
    const { error: e } = await sb
      .from("portfolio_projects")
      .update({ description_html: next, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (e) throw e;
  }
}

if (APPLY && touched.size > 0) {
  const endpoint = process.env.SITE_REVALIDATE_URL;
  const secret = process.env.REVALIDATION_SECRET;
  if (endpoint && secret) {
    const tags = ["portfolio", ...[...touched].map((s) => `portfolio-${s}`)];
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ tags }),
    });
    console.log(`revalidation → HTTP ${res.status}`);
  }
}
console.log(APPLY ? "Terminé." : "Dry-run — relancer avec --apply.");
