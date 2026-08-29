/**
 * scripts/migrate-surfaces-villes-2026-08-29.mjs — Migration n°2 : aligne les
 * DONNÉES restantes des leads sur le vocabulaire (types/vocabulaire.ts).
 * Complète migrate-vocabulaire-2026-08-29.mjs (types de bien + villes n°1).
 *
 *   node scripts/migrate-surfaces-villes-2026-08-29.mjs           → dry-run
 *   node scripts/migrate-surfaces-villes-2026-08-29.mjs --apply   → applique
 *
 * Règles validées par le propriétaire le 29/08/2026 :
 *  - Tranches ambiguës « au plus probable » : moins de 100m² → « 50 – 100 m² »,
 *    100 à 300m² → « 100 – 200 m² » (la surface exacte se précise au devis).
 *  - Valeurs numériques : normalisées en « N m² » (on garde la précision).
 *  - Villes : normalisation (arabe/orthographe) ; les 13 valeurs sans
 *    information (autre_ville, N, Ccc, Nbb) sont vidées.
 *  - typeDeBien « Résidence » → « Immobilier ».
 *  - Les DEVIS ne sont PAS touchés : documents commerciaux archivés, la
 *    réimpression doit garder mot pour mot ce qui a été chiffré au client.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const log = (...a) => console.log(APPLY ? "[APPLY]" : "[DRY]  ", ...a);

// ── Surfaces : libellés legacy → tranches du vocabulaire ────────────────────
const SURFACE_MAP = {
  "moins_de_100m²": "50 – 100 m²",
  "<100": "50 – 100 m²",
  "< 100 m²": "50 – 100 m²",
  "100_à_300m²": "100 – 200 m²",
  "100 – 300 m²": "100 – 200 m²",
  "300_à_500m²": "200 – 500 m²",
  "300 – 500 m²": "200 – 500 m²",
  "plus_de_500m²": "Plus de 500 m²",
  "500 m² et plus": "Plus de 500 m²",
};

/** Tranches du vocabulaire, pour reconnaître une plage saisie librement. */
const TRANCHES = [
  { min: 50, max: 100, label: "50 – 100 m²" },
  { min: 100, max: 200, label: "100 – 200 m²" },
  { min: 200, max: 500, label: "200 – 500 m²" },
];

function normaliseSurface(raw) {
  const v = (raw ?? "").trim();
  if (!v) return undefined;
  if (SURFACE_MAP[v]) return SURFACE_MAP[v];
  // Valeur numérique pure ("120", "78m", "2000m", "479 m2") → « N m² »
  const single = v.match(/^(\d+(?:[.,]\d+)?)\s*m?[²2]?$/i);
  if (single) {
    const clean = single[1].replace(",", ".").replace(/\.0+$/, "");
    const target = `${clean} m²`;
    return target === v ? undefined : target;
  }
  // Plage "N1-N2m" correspondant exactement à une tranche du barème
  const range = v.match(/^(\d+)\s*[-–à]\s*(\d+)\s*m?[²2]?$/i);
  if (range) {
    const t = TRANCHES.find((t) => t.min === Number(range[1]) && t.max === Number(range[2]));
    if (t) return t.label;
  }
  return undefined; // valeur libre non reconnue : on ne devine pas
}

// ── Villes ──────────────────────────────────────────────────────────────────
const VILLE_MAP = {
  "طنجة": "Tanger",
  "كازا1": "Casablanca",
  "تاونات": "Taounate",
  Sale: "Salé",
  Eljadida: "El Jadida",
  milano: "Milano",
};
const VILLE_VIDER = new Set(["autre_ville", "N", "Ccc", "Nbb"]);

// ── typeDeBien ──────────────────────────────────────────────────────────────
const TYPE_MAP = { Résidence: "Immobilier" };

const { data: leads, error } = await sb.from("leads").select("leadId,nom,surface,ville,typeDeBien");
if (error) throw error;

let n = 0;
for (const l of leads) {
  const patch = {};

  const s = normaliseSurface(l.surface);
  if (s) patch.surface = s;

  if (l.ville && VILLE_VIDER.has(l.ville)) patch.ville = null;
  else if (l.ville && VILLE_MAP[l.ville]) patch.ville = VILLE_MAP[l.ville];

  if (l.typeDeBien && TYPE_MAP[l.typeDeBien]) patch.typeDeBien = TYPE_MAP[l.typeDeBien];

  if (Object.keys(patch).length === 0) continue;
  n++;
  log(
    `lead ${l.leadId} (${(l.nom || "?").slice(0, 20)}):`,
    JSON.stringify(patch),
    `(avant: surface=${JSON.stringify(l.surface)} ville=${JSON.stringify(l.ville)} type=${JSON.stringify(l.typeDeBien)})`
  );
  if (APPLY) {
    const { error: e } = await sb.from("leads").update(patch).eq("leadId", l.leadId);
    if (e) throw e;
  }
}

console.log(`\n${n} leads concernés.`);
console.log(APPLY ? "Migration n°2 appliquée." : "Dry-run — rien n'a été écrit. Relancer avec --apply.");
process.exit(0);
