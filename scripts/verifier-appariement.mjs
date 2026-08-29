/**
 * scripts/verifier-appariement.mjs — Contrôle que le regroupement par langue
 * et la publication programmée se comportent comme prévu sur les vraies
 * données. Lecture seule.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const today = new Date().toISOString().slice(0, 10);

/** Réplique lib/pairing.ts pour vérifier le résultat hors du navigateur. */
function pairByTopic(rows) {
  const pairs = [];
  const byTopic = new Map();
  for (const row of rows) {
    const topicId = (row.linked_topic_id ?? "").trim();
    const side = row.language === "French" ? "fr" : "en";
    if (!topicId) {
      pairs.push({ key: row.id, topicId: "", fr: null, en: null, [side]: row });
      continue;
    }
    const existing = byTopic.get(topicId);
    if (existing && existing[side] === null) {
      existing[side] = row;
      continue;
    }
    if (existing) {
      pairs.push({ key: row.id, topicId, fr: null, en: null, [side]: row });
      continue;
    }
    const pair = { key: topicId, topicId, fr: null, en: null };
    pair[side] = row;
    byTopic.set(topicId, pair);
    pairs.push(pair);
  }
  return pairs;
}

function state(status, date) {
  if (status !== "Published") return "brouillon";
  if (!date) return "publie";
  return date.slice(0, 10) > today ? "programme" : "publie";
}

for (const [table, label, dateCol] of [
  ["portfolio_projects", "PORTFOLIO", "published_at"],
  ["blog_posts", "BLOG", "published_date"],
]) {
  const { data, error } = await sb
    .from(table)
    .select(`id, slug, language, linked_topic_id, name, status, ${dateCol}, archived`);
  if (error) throw error;

  const rows = data.filter((r) => !r.archived);
  const pairs = pairByTopic(rows);
  const complets = pairs.filter((p) => p.fr && p.en);
  const orphelins = pairs.filter((p) => !p.fr || !p.en);

  console.log(`\n═══ ${label} ═══`);
  console.log(`${rows.length} lignes → ${pairs.length} entrées affichées`);
  console.log(`  ${complets.length} avec les deux langues, ${orphelins.length} avec une seule`);

  const etats = pairs.reduce((m, p) => {
    const main = p.fr ?? p.en;
    const st = state(main.status, main[dateCol]);
    m[st] = (m[st] || 0) + 1;
    return m;
  }, {});
  console.log("  états :", JSON.stringify(etats));

  if (orphelins.length) {
    console.log("  sans traduction :");
    for (const p of orphelins) {
      const main = p.fr ?? p.en;
      console.log(`    ${main.language === "French" ? "fr" : "en"}/${main.slug} — ${main.name}`);
    }
  }

  // Une collision (deux lignes de même langue sous le même sujet) est un
  // défaut de données : elle doit rester visible, jamais masquée.
  const collisions = pairs.filter((p) => p.topicId && p.key !== p.topicId);
  if (collisions.length) {
    console.log(`  ⚠ ${collisions.length} collision(s) de langue sous un même sujet lié`);
    for (const c of collisions) {
      const main = c.fr ?? c.en;
      console.log(`    ${main.slug} (sujet ${c.topicId})`);
    }
  }
}
process.exit(0);
