/**
 * Migration ponctuelle : Google Apps Script → table Supabase `blog_posts`.
 *
 *   node scripts/migrate-blog-to-supabase.mjs [--dry]
 *
 * Prérequis : scripts/sql/blog_posts.sql exécuté dans Supabase.
 *
 * Idempotent : upsert sur `slug`, donc une seconde exécution corrige au lieu
 * de dupliquer. `updated_at` est initialisé à `published_date` et non à now(),
 * pour que le sitemap n'annonce pas à Google 60 articles modifiés le même jour.
 *
 * Les requêtes vers l'Apps Script sont séquentielles avec reprise : il renvoie
 * une page d'erreur HTML dès quelques appels concurrents.
 */

import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const root = path.resolve(import.meta.dirname, "..");

function readEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const dash = readEnv(path.join(root, ".env.local"));
const site = readEnv("C:/Users/ASUS/Desktop/React/immercio/immersio.ma/.env.local");
const SB = dash.NEXT_PUBLIC_SUPABASE_URL;
const KEY = dash.SUPABASE_SERVICE_ROLE_KEY;
const API = site.APPS_SCRIPT_URL;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      if (text.trimStart().startsWith("<")) throw new Error("réponse HTML (Apps Script surchargé)");
      return JSON.parse(text);
    } catch (err) {
      if (i === tries) throw err;
      await sleep(500 * i);
    }
  }
}

// ── 1. Table présente ? ─────────────────────────────────────────────────────
const probe = await fetch(`${SB}/rest/v1/blog_posts?select=slug&limit=1`, { headers: H });
if (probe.status === 404 || probe.status === 400) {
  console.error("❌ La table `blog_posts` est introuvable.");
  console.error("   Exécute scripts/sql/blog_posts.sql dans Supabase → SQL Editor, puis relance.");
  process.exit(1);
}

// ── 2. Lecture de la source ─────────────────────────────────────────────────
const slugs = await fetchJson(`${API}?action=slugs`);
console.log(`Source : ${slugs.length} articles publiés\n`);

const CACHE = path.join(import.meta.dirname, ".blog-rows.cache.json");
let rows = [];

if (fs.existsSync(CACHE) && !process.argv.includes("--refetch")) {
  rows = JSON.parse(fs.readFileSync(CACHE, "utf8"));
  console.log(`Cache : ${rows.length} articles relus depuis ${path.basename(CACHE)} (--refetch pour ignorer)
`);
}

if (rows.length !== slugs.length) {
rows = [];
for (const [i, s] of slugs.entries()) {
  const p = await fetchJson(`${API}?action=post&slug=${encodeURIComponent(s.slug)}`);
  const published = (p.publishedDate || "").trim() || null;

  rows.push({
    slug: p.slug,
    language: p.language,
    linked_topic_id: p.linkedTopicId || null,
    name: p.name,
    excerpt: p.excerpt || null,
    content_html: p.contentHtml || null,
    category: p.category || null,
    category_label: p.categoryLabel || null,
    cover_image: p.coverImage || null,
    image_alt: p.imageAlt || null,
    author_name: p.authorName || null,
    read_time: p.readTime || null,
    meta_title: p.metaTitle || null,
    meta_description: p.metaDescription || null,
    status: p.status || "Published",
    published_date: published,
    // Vraie date de modification, pas la date de migration.
    updated_at: published ? new Date(`${published}T12:00:00Z`).toISOString() : new Date().toISOString(),
  });
  process.stdout.write(`\r  lu ${i + 1}/${slugs.length}`);
}
console.log("\n");
fs.writeFileSync(CACHE, JSON.stringify(rows));
}

if (DRY) {
  console.log("— simulation, rien n'est écrit —");
  console.log(`${rows.length} lignes prêtes. Exemple :`);
  const { content_html, ...rest } = rows[0];
  console.log(JSON.stringify({ ...rest, content_html: `<${content_html?.length ?? 0} caractères>` }, null, 2));
  process.exit(0);
}

// ── 3. Écriture ─────────────────────────────────────────────────────────────
// Par lots : les 60 articles pèsent ~750 Ko de HTML, ce qui fait tomber la
// connexion en une seule requête (ECONNRESET). 5 par 5 passe confortablement.
const BATCH = 5;
let written = 0;

for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  let ok = false;

  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    try {
      const res = await fetch(`${SB}/rest/v1/blog_posts?on_conflict=slug`, {
        method: "POST",
        headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 400);
        if (attempt === 3) {
          console.error(`
❌ Lot ${i / BATCH + 1} refusé : HTTP ${res.status}
${detail}`);
          process.exit(1);
        }
        await sleep(800 * attempt);
        continue;
      }
      ok = true;
      written += chunk.length;
      process.stdout.write(`  écrit ${written}/${rows.length}`);
    } catch (err) {
      if (attempt === 3) {
        console.error(`
❌ Lot ${i / BATCH + 1} : ${err.message}`);
        process.exit(1);
      }
      await sleep(800 * attempt);
    }
  }
}
console.log(`
✅ ${written} articles écrits dans Supabase`);

// ── 4. Contrôle de parité ───────────────────────────────────────────────────
const all = await fetch(`${SB}/rest/v1/blog_posts?select=slug,language,linked_topic_id,updated_at`, { headers: H }).then((r) => r.json());
const srcSlugs = new Set(slugs.map((s) => s.slug));
const dbSlugs = new Set(all.map((r) => r.slug));
const missing = [...srcSlugs].filter((s) => !dbSlugs.has(s));
const extra = [...dbSlugs].filter((s) => !srcSlugs.has(s));

const paired = all.filter((r) => r.linked_topic_id && all.some((o) => o.linked_topic_id === r.linked_topic_id && o.language !== r.language));
const days = new Set(all.map((r) => String(r.updated_at).slice(0, 10)));

console.log(`\n${"═".repeat(58)}\nPARITÉ`);
console.log(`  Slugs source / base        : ${srcSlugs.size} / ${dbSlugs.size}`);
console.log(`  Manquants en base          : ${missing.length}${missing.length ? " → " + missing.join(", ") : ""}`);
console.log(`  En trop en base            : ${extra.length}${extra.length ? " → " + extra.join(", ") : ""}`);
console.log(`  Paires hreflang fr↔en      : ${paired.length}/${all.length}`);
console.log(`  Jours distincts updated_at : ${days.size} ${days.size > 5 ? "✅ historique réel" : "⚠ trop groupé"}`);
console.log("═".repeat(58));
console.log(missing.length === 0 && extra.length === 0 && paired.length === all.length ? "\n✅ MIGRATION CONFORME" : "\n❌ ÉCART DÉTECTÉ");
