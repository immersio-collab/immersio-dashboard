/**
 * Migration ponctuelle : export CSV du Google Sheet -> table Supabase `devis`.
 *
 *   node scripts/migrate-devis-to-supabase.mjs <chemin-du-csv> [--dry]
 *
 * Prérequis : scripts/sql/devis.sql exécuté dans Supabase.
 *
 * Les lignes sont importées telles quelles, y compris leurs défauts : deux
 * `#ERROR!` de formule Sheets (nettoyés en null), deux noms de client vides,
 * un doublon exact et la ligne d'exemple de devis_template.csv. Corriger ces
 * données ici reviendrait à réécrire un archivage ; elles se suppriment en un
 * clic depuis le dashboard.
 *
 * La séquence de numérotation est ensuite calée juste après le plus grand
 * numéro importé, pour qu'aucun nouveau devis ne réutilise un numéro existant.
 *
 * Idempotent : upsert sur devis_number.
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const csvPath = args.find((a) => !a.startsWith("--"));

if (!csvPath) {
  console.error("Usage : node scripts/migrate-devis-to-supabase.mjs <chemin-du-csv> [--dry]");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..");
const env = {};
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const H = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

/** CSV parser handling quoted fields and embedded newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

/** "#ERROR!" is a Sheets formula failure, not a value. */
const clean = (v) => {
  const t = String(v ?? "").trim();
  if (!t || t === "#ERROR!" || t === "#N/A") return null;
  return t;
};
const num = (v) => {
  const t = clean(v);
  if (t === null) return 0;
  const n = parseFloat(t.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** "19/05/2026 12:00" -> ISO. */
function parseTimestamp(v) {
  const t = clean(v);
  if (!t) return null;
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const [, d, mo, y, h, mi] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi)).toISOString();
}

const raw = fs.readFileSync(csvPath, "utf8");
const [header, ...lines] = parseCsv(raw);
const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
const get = (r, k) => r[idx[k]];

const rows = lines.map((r) => {
  const created = parseTimestamp(get(r, "timestamp")) ?? new Date().toISOString();
  return {
    devis_number: clean(get(r, "devis_number")),
    // La colonne est not null : deux lignes historiques ont un nom vide.
    client_nom: clean(get(r, "client_nom")) ?? "(sans nom)",
    client_tel: clean(get(r, "client_tel")),
    client_email: clean(get(r, "client_email")),
    client_ville: clean(get(r, "client_ville")),
    type_bien: clean(get(r, "type_bien")),
    superficie: clean(get(r, "superficie")),
    tour3d_price: num(get(r, "tour3d_price")),
    options_selected: clean(get(r, "options_selected")),
    options_total: num(get(r, "options_total")),
    hebergement_duree: clean(get(r, "hebergement_duree")),
    hebergement_price: num(get(r, "hebergement_price")),
    subtotal: num(get(r, "subtotal")),
    remise_pct: num(get(r, "remise_pct")),
    remise_amt: num(get(r, "remise_amt")),
    total_ttc: num(get(r, "total_ttc")),
    notes: clean(get(r, "notes")),
    validite_jours: clean(get(r, "validite_jours")) ? parseInt(clean(get(r, "validite_jours")), 10) : null,
    auto_pricing_used: String(get(r, "auto_pricing_used")).trim().toUpperCase() === "TRUE",
    statut: clean(get(r, "statut")) ?? "En attente",
    created_at: created,
    updated_at: created,
  };
});

console.log(`CSV : ${rows.length} devis`);
const numbers = rows.map((r) => r.devis_number).filter(Boolean);
const maxSeq = Math.max(...numbers.map((n) => parseInt(String(n).split("-")[2], 10) || 0));
console.log(`Plus grand numéro : ${numbers.find((n) => n.endsWith(String(maxSeq).padStart(4, "0")))} → séquence à caler sur ${maxSeq + 1}`);

const anomalies = [];
rows.forEach((r) => {
  if (r.client_nom === "(sans nom)") anomalies.push(`${r.devis_number} : nom de client vide`);
});
const seen = {};
rows.forEach((r) => {
  const key = `${r.client_nom}|${r.total_ttc}|${r.created_at}`;
  if (seen[key]) anomalies.push(`${r.devis_number} : doublon de ${seen[key]}`);
  else seen[key] = r.devis_number;
});
if (anomalies.length) {
  console.log("\nAnomalies conservées telles quelles :");
  anomalies.forEach((a) => console.log("  · " + a));
}

if (DRY) {
  console.log("\n— simulation, rien n'est écrit —");
  console.log(JSON.stringify(rows[0], null, 2));
  process.exit(0);
}

// ── Écriture ────────────────────────────────────────────────────────────────
const res = await fetch(`${SB}/rest/v1/devis?on_conflict=devis_number`, {
  method: "POST",
  headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify(rows),
});
if (!res.ok) {
  console.error(`\n❌ Écriture refusée : HTTP ${res.status}`);
  console.error((await res.text()).slice(0, 600));
  process.exit(1);
}
console.log(`\n✅ ${rows.length} devis écrits`);

// ── Contrôle ────────────────────────────────────────────────────────────────
const all = await fetch(`${SB}/rest/v1/devis?select=devis_number,client_nom,total_ttc&order=devis_number`, { headers: H }).then((r) => r.json());
console.log(`\nEn base : ${all.length} devis`);
console.log(`  Total cumulé : ${all.reduce((s, d) => s + Number(d.total_ttc || 0), 0).toLocaleString("fr-FR")} MAD`);
console.log(`\n⚠ Cale ensuite la séquence dans Supabase, SQL Editor :`);
console.log(`     select setval('devis_number_seq', ${maxSeq}, true);`);
console.log(`   Sans cela, le prochain devis reprendrait le numéro IMM-<année>-0001.`);
