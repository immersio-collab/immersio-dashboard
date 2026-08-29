/**
 * scripts/audit-db-state.mjs — Diagnostic LECTURE SEULE avant la refonte du
 * vocabulaire. Vérifie quelles colonnes existent et quelles valeurs devront
 * être migrées. N'écrit rien.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error("env manquante"); process.exit(1); }
const sb = createClient(url, key);

async function hasColumn(table, col) {
  const { error } = await sb.from(table).select(col).limit(1);
  return !error;
}

const tables = ["leads", "devis", "blog_posts", "portfolio_projects", "tours"];
for (const t of tables) {
  const cols = {};
  for (const c of ["archived", "archive", "lead_id", "archived_at"]) {
    cols[c] = await hasColumn(t, c);
  }
  console.log(`${t.padEnd(20)} archived:${cols.archived} archive:${cols.archive} lead_id:${cols.lead_id} archived_at:${cols.archived_at}`);
}

console.log("\n--- leads: répartition typeDeBien / ville ---");
const { data: leads } = await sb.from("leads").select("typeDeBien,ville,canal");
const count = (arr, k) => arr.reduce((m, r) => { const v = r[k] || "(vide)"; m[v] = (m[v] || 0) + 1; return m; }, {});
console.log("typeDeBien:", JSON.stringify(count(leads, "typeDeBien")));
console.log("ville:", JSON.stringify(count(leads, "ville")));
console.log("total leads:", leads.length);

console.log("\n--- tours: secteurs ---");
const { data: tours } = await sb.from("tours").select("id,slug,sector,active,client_name");
console.log("sector:", JSON.stringify(count(tours, "sector")));
console.log("total tours:", tours.length);

console.log("\n--- portfolio: deliverables + surface Bouznika ---");
const { data: projs } = await sb.from("portfolio_projects").select("id,slug,language,sector,surface,deliverables,meta_title");
for (const p of projs) {
  console.log(`${p.language === "French" ? "fr" : "en"} ${p.slug.padEnd(30)} sector=${p.sector} surface=${p.surface} deliverables=${JSON.stringify(p.deliverables)}`);
}

console.log("\n--- devis: superficies et types stockés ---");
const { data: devis } = await sb.from("devis").select("devis_number,type_bien,superficie,statut,lead_id");
console.log("type_bien:", JSON.stringify(count(devis, "type_bien")));
console.log("superficie:", JSON.stringify(count(devis, "superficie")));
console.log("lead_id renseigné:", devis.filter(d => d.lead_id).length, "/", devis.length);
