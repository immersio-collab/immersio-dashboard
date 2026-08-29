/**
 * scripts/migrate-slugs-en-2026-08-29.mjs — Traduit les slugs (et les noms
 * restés français) des projets portfolio en langue anglaise.
 *
 *   node scripts/migrate-slugs-en-2026-08-29.mjs           → dry-run
 *   node scripts/migrate-slugs-en-2026-08-29.mjs --apply   → applique + revalide
 *
 * Quatre projets partageaient leur slug entre les deux langues ; trois de ces
 * slugs étaient français. « fitness-club » est déjà anglais et ne bouge pas.
 *
 * Les noms « Appartement de Luxe » et « Villa Moderne Anfa » s'affichaient en
 * titre des pages anglaises alors que leur propre meta_title annonçait le nom
 * anglais — un oubli de la migration initiale, corrigé ici d'après ce que ce
 * meta_title indiquait déjà. « Showroom Mobilier Design » est conservé : la
 * version française l'emploie à l'identique, il se lit comme la raison sociale
 * du client et non comme une description traduisible.
 *
 * PRÉREQUIS : les redirections 301 des anciennes URL doivent être déployées
 * sur immersio.ma (next.config.ts) AVANT de lancer ce script — sinon les
 * adresses indexées répondent 404 entre les deux.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const log = (...a) => console.log(APPLY ? "[APPLY]" : "[DRY]  ", ...a);

/** slug actuel → { slug: nouveau slug, name?: nom anglais } */
const CHANGES = {
  "appartement-luxe-rabat": { slug: "luxury-apartment-rabat", name: "Luxury Apartment" },
  "showroom-mobilier-casa": { slug: "furniture-showroom-casablanca" },
  "villa-moderne-casablanca": { slug: "modern-villa-anfa", name: "Modern Villa Anfa" },
};

const { data, error } = await sb
  .from("portfolio_projects")
  .select("id, slug, language, name")
  .eq("language", "English")
  .in("slug", Object.keys(CHANGES));
if (error) throw error;

if (data.length !== Object.keys(CHANGES).length) {
  console.warn(
    `Attention : ${data.length} projet(s) trouvé(s) sur ${Object.keys(CHANGES).length} attendus — déjà migré ?`
  );
}

const touched = [];
for (const p of data) {
  const change = CHANGES[p.slug];
  const patch = { slug: change.slug, updated_at: new Date().toISOString() };
  if (change.name) patch.name = change.name;

  log(`en/${p.slug} → en/${change.slug}${change.name ? ` · nom « ${p.name} » → « ${change.name} »` : ""}`);
  touched.push(p.slug, change.slug);

  if (APPLY) {
    const { error: e } = await sb.from("portfolio_projects").update(patch).eq("id", p.id);
    if (e) throw e;
  }
}

if (APPLY && touched.length > 0) {
  const endpoint = process.env.SITE_REVALIDATE_URL;
  const secret = process.env.REVALIDATION_SECRET;
  if (endpoint && secret) {
    // L'ancien et le nouveau slug : l'URL qui disparaît et celle qui apparaît.
    const tags = ["portfolio", ...new Set(touched.map((s) => `portfolio-${s}`))];
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ tags }),
    });
    console.log(`revalidation → HTTP ${res.status} (${tags.length} tags)`);
  } else {
    console.warn("SITE_REVALIDATE_URL / REVALIDATION_SECRET absents — revalider manuellement.");
  }
}

console.log(APPLY ? "\nSlugs anglais migrés." : "\nDry-run — rien n'a été écrit. Relancer avec --apply.");
process.exit(0);
