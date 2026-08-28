/**
 * Migration ponctuelle : Google Apps Script → table Supabase `portfolio_projects`.
 *
 *   node scripts/migrate-portfolio-to-supabase.mjs [--dry]
 *
 * Prérequis : scripts/sql/portfolio_projects.sql exécuté dans Supabase.
 *
 * Lit `action=portfolio&lang=` (le endpoint liste, qui est bilingue) plutôt que
 * `action=portfolio_project&slug=` : ce dernier ne prend pas de langue, et pour
 * les quatre projets qui partagent un slug il renvoie toujours la fiche
 * anglaise. Les versions françaises ne sont accessibles que par la liste.
 *
 * Reconstruit `linked_topic_id`, vide sur les 14 lignes du Sheet. L'appariement
 * se fait par position dans les deux listes, validé sur trois critères
 * indépendants (secteur, image de couverture, URL de la visite) — la migration
 * s'arrête si l'un d'eux ne concorde pas.
 *
 * Idempotent : upsert sur (slug, language).
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

/** L'Apps Script renvoie une page d'erreur HTML sous charge : on réessaie. */
async function fetchJson(url, tries = 6) {
  for (let i = 1; i <= tries; i++) {
    try {
      const text = await fetch(url).then((r) => r.text());
      if (text.trimStart().startsWith("<")) throw new Error("réponse HTML (Apps Script surchargé)");
      return JSON.parse(text);
    } catch (err) {
      if (i === tries) throw err;
      await sleep(1000 * i);
    }
  }
}

/** Kenitra / Kénitra désignent la même ville dans le Sheet. */
const CITY_FIXES = { Kenitra: "Kénitra" };

// ── 1. Table présente ? ─────────────────────────────────────────────────────
const probe = await fetch(`${SB}/rest/v1/portfolio_projects?select=slug&limit=1`, { headers: H });
if (probe.status === 404 || probe.status === 400) {
  console.error("❌ La table `portfolio_projects` est introuvable.");
  console.error("   Exécute scripts/sql/portfolio_projects.sql dans Supabase, puis relance.");
  process.exit(1);
}

// ── 2. Lecture des deux listes ──────────────────────────────────────────────
const fr = await fetchJson(`${API}?action=portfolio&lang=French`);
await sleep(1200);
const en = await fetchJson(`${API}?action=portfolio&lang=English`);
console.log(`Source : ${fr.length} projets français, ${en.length} anglais\n`);

if (fr.length !== en.length) {
  console.error(`❌ Les deux listes n'ont pas la même taille — appariement par position impossible.`);
  process.exit(1);
}

// ── 3. Appariement, validé avant d'écrire quoi que ce soit ──────────────────
const rows = [];
let pairingOk = true;

for (let i = 0; i < fr.length; i++) {
  const a = fr[i];
  const b = en[i];
  const checks = {
    secteur: a.sector === b.sector,
    image: a.coverImage === b.coverImage,
    visite: a.embedUrl === b.embedUrl,
  };
  const ok = Object.values(checks).every(Boolean);
  if (!ok) {
    pairingOk = false;
    console.error(`❌ paire ${i + 1} douteuse : fr ${a.slug} ↔ en ${b.slug} — ${JSON.stringify(checks)}`);
    continue;
  }

  // Identifiant stable et lisible, reconstruit puisque le Sheet ne le portait pas.
  const topicId = `pf-${a.sector}-${String(i + 1).padStart(2, "0")}`;
  console.log(`  ✅ ${topicId}  fr ${a.slug}  ↔  en ${b.slug}`);

  for (const p of [a, b]) {
    const published = (p.publishedAt || "").trim() || null;
    rows.push({
      slug: p.slug,
      language: p.language,
      linked_topic_id: topicId,
      name: p.name,
      description_html: p.descriptionHtml || null,
      city: CITY_FIXES[p.city] ?? (p.city || null),
      sector: p.sector || null,
      surface: p.surface || null,
      delivery_time: p.deliveryTime || null,
      cover_image: p.coverImage || null,
      embed_url: p.embedUrl || null,
      deliverables: Array.isArray(p.deliverables) ? p.deliverables : [],
      meta_title: p.metaTitle || null,
      meta_description: p.metaDescription || null,
      status: p.status || "Published",
      published_at: published,
      // Vraie date, pas la date de migration.
      updated_at: published
        ? new Date(`${published}T12:00:00Z`).toISOString()
        : new Date().toISOString(),
    });
  }
}

if (!pairingOk) {
  console.error("\n⛔ Appariement non fiable — rien n'a été écrit.");
  process.exit(1);
}

if (DRY) {
  console.log(`\n— simulation — ${rows.length} lignes prêtes. Exemple :`);
  const { description_html, ...rest } = rows[0];
  console.log(JSON.stringify({ ...rest, description_html: `<${description_html?.length ?? 0} car.>` }, null, 2));
  process.exit(0);
}

// ── 4. Écriture par lots ────────────────────────────────────────────────────
const BATCH = 5;
let written = 0;

for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  let ok = false;

  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    try {
      const res = await fetch(`${SB}/rest/v1/portfolio_projects?on_conflict=slug,language`, {
        method: "POST",
        headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 400);
        if (attempt === 3) {
          console.error(`\n❌ Lot ${i / BATCH + 1} refusé : HTTP ${res.status}\n${detail}`);
          process.exit(1);
        }
        await sleep(800 * attempt);
        continue;
      }
      ok = true;
      written += chunk.length;
      process.stdout.write(`\r  écrit ${written}/${rows.length}`);
    } catch (err) {
      if (attempt === 3) {
        console.error(`\n❌ Lot ${i / BATCH + 1} : ${err.message}`);
        process.exit(1);
      }
      await sleep(800 * attempt);
    }
  }
}
console.log(`\n✅ ${written} projets écrits\n`);

// ── 5. Contrôle de parité ───────────────────────────────────────────────────
const all = await fetch(
  `${SB}/rest/v1/portfolio_projects?select=slug,language,linked_topic_id,city,updated_at`,
  { headers: H }
).then((r) => r.json());

const key = (p) => `${p.slug}|${p.language}`;
const srcKeys = new Set([...fr, ...en].map(key));
const dbKeys = new Set(all.map(key));
const missing = [...srcKeys].filter((k) => !dbKeys.has(k));
const extra = [...dbKeys].filter((k) => !srcKeys.has(k));

const paired = all.filter(
  (r) => r.linked_topic_id && all.some((o) => o.linked_topic_id === r.linked_topic_id && o.language !== r.language)
);
const cities = [...new Set(all.map((r) => r.city))].sort();

console.log("═".repeat(60));
console.log("PARITÉ");
console.log(`  Couples (slug, langue) source / base : ${srcKeys.size} / ${dbKeys.size}`);
console.log(`  Manquants en base                    : ${missing.length}${missing.length ? " → " + missing.join(", ") : ""}`);
console.log(`  En trop en base                      : ${extra.length}${extra.length ? " → " + extra.join(", ") : ""}`);
console.log(`  Paires hreflang fr↔en                : ${paired.length}/${all.length}`);
console.log(`  Villes distinctes                    : ${cities.length} → ${cities.join(", ")}`);
console.log("═".repeat(60));
console.log(
  missing.length === 0 && extra.length === 0 && paired.length === all.length
    ? "\n✅ MIGRATION CONFORME — appariement fr↔en désormais correct sur tous les projets"
    : "\n❌ ÉCART DÉTECTÉ"
);
