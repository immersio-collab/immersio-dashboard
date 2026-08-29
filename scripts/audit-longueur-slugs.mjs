/**
 * scripts/audit-longueur-slugs.mjs — Longueur des slugs publiés, blog et
 * portfolio. Lecture seule.
 *
 * Il n'existe pas de limite dure côté Google, mais une URL courte se lit, se
 * partage et se cite mieux. Ce script situe chaque slug par rapport aux
 * autres plutôt que par rapport à un seuil arbitraire.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SEUIL = 55;

for (const [table, label] of [
  ["blog_posts", "BLOG"],
  ["portfolio_projects", "PORTFOLIO"],
]) {
  const { data, error } = await sb.from(table).select("slug, language, status, archived");
  if (error) throw error;
  const rows = data.filter((r) => r.status === "Published" && !r.archived);
  const lens = rows.map((r) => r.slug.length).sort((a, b) => a - b);
  const med = lens[Math.floor(lens.length / 2)];
  const moy = Math.round(lens.reduce((a, b) => a + b, 0) / lens.length);

  console.log(`\n═══ ${label} — ${rows.length} slugs publiés ═══`);
  console.log(`  min ${lens[0]} · médiane ${med} · moyenne ${moy} · max ${lens[lens.length - 1]}`);

  const longs = rows
    .filter((r) => r.slug.length > SEUIL)
    .sort((a, b) => b.slug.length - a.slug.length);
  console.log(`  ${longs.length} slug(s) au-dessus de ${SEUIL} caractères :`);
  for (const r of longs) {
    console.log(`    [${String(r.slug.length).padStart(3)}] ${r.language === "French" ? "fr" : "en"}/${r.slug}`);
  }
}
process.exit(0);
