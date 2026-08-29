/**
 * scripts/audit-meta-descriptions.mjs — Liste les contenus dont la
 * meta_description est absente ou hors du budget SERP (140–158 caractères).
 * Lecture seule.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const MIN = 120;
const MAX = 160;

for (const [table, label] of [
  ["blog_posts", "ARTICLES"],
  ["portfolio_projects", "PROJETS"],
]) {
  const { data, error } = await sb
    .from(table)
    .select("slug, language, name, meta_description, status, archived");
  if (error) throw error;

  const published = data.filter((r) => r.status === "Published" && !r.archived);
  const problems = published.filter((r) => {
    const d = (r.meta_description ?? "").trim();
    return d.length === 0 || d.length < MIN || d.length > MAX;
  });

  console.log(`\n=== ${label} — ${problems.length} / ${published.length} hors budget ===`);
  for (const r of problems) {
    const d = (r.meta_description ?? "").trim();
    const lang = r.language === "French" ? "fr" : "en";
    const flag = d.length === 0 ? "ABSENTE" : d.length > MAX ? "TROP LONGUE" : "TROP COURTE";
    console.log(`  [${String(d.length).padStart(3)}] ${flag.padEnd(11)} ${lang}/${r.slug}`);
    if (d) console.log(`        « ${d.slice(0, 120)}${d.length > 120 ? "…" : ""} »`);
  }
}
process.exit(0);
