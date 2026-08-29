/**
 * scripts/audit-champs-null.mjs — Quels champs de `leads` valent null ou ""
 * en base ? Le type Lead les déclare `string`, ce qui a masqué des accès non
 * gardés (l.ville.toLowerCase()) jusqu'au crash du filtre de recherche.
 * Lecture seule.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await sb.from("leads").select("*");
if (error) throw error;

const actifs = data.filter((l) => l.archive !== "Oui" && l.archive !== "TRUE");
const champs = Object.keys(data[0] ?? {});

console.log(`${actifs.length} leads actifs\n`);
console.log("champ".padEnd(24), "null".padStart(6), "vide".padStart(6));
console.log("─".repeat(38));
for (const c of champs) {
  const nulls = actifs.filter((l) => l[c] === null || l[c] === undefined).length;
  const vides = actifs.filter((l) => l[c] === "").length;
  if (nulls || vides) {
    console.log(c.padEnd(24), String(nulls).padStart(6), String(vides).padStart(6));
  }
}
process.exit(0);
