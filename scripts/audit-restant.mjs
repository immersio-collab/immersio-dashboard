/** Audit lecture seule : quelles données restent hors vocabulaire ? */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const count = (arr, k) =>
  arr.reduce((m, r) => {
    const v = (r[k] ?? "(null)") || "(vide)";
    m[v] = (m[v] || 0) + 1;
    return m;
  }, {});

const { data: leads } = await sb.from("leads").select("leadId,surface,typeDeBien,ville,archive,nom");
const actifs = leads.filter((l) => l.archive !== "Oui" && l.archive !== "TRUE");
console.log("=== leads.surface (actifs:", actifs.length, "/ total:", leads.length, ") ===");
console.log(JSON.stringify(count(actifs, "surface"), null, 1));

const VOCAB = ["Immobilier", "Médical", "Écoles", "Bureaux", "Événementiel", "Hôtels", "Riads", "Sport", "Showrooms", "Autre"];
console.log("\n=== leads.typeDeBien hors vocabulaire ===");
console.log(JSON.stringify(count(actifs.filter((l) => l.typeDeBien && !VOCAB.includes(l.typeDeBien)), "typeDeBien"), null, 1));

const VILLES = ["Rabat", "Casablanca", "Kénitra", "Tanger", "Fès", "Meknès"];
console.log("\n=== leads.ville hors vocabulaire ===");
console.log(JSON.stringify(count(actifs.filter((l) => l.ville && !VILLES.includes(l.ville)), "ville"), null, 1));

const { data: devis } = await sb.from("devis").select("devis_number,superficie,type_bien");
console.log("\n=== devis.superficie ===");
console.log(JSON.stringify(count(devis, "superficie"), null, 1));
console.log("=== devis.type_bien ===");
console.log(JSON.stringify(count(devis, "type_bien"), null, 1));
process.exit(0);
