import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeCity(city) {
  if (!city) return null;
  const v = city.trim().toLowerCase();
  
  if (v === "rabat") return "Rabat";
  if (v === "casa" || v === "casablanca") return "Casablanca";
  if (v === "kenitra" || v === "kénitra") return "Kénitra";
  if (v === "tanger") return "Tanger";
  
  return city;
}

async function fixVilles() {
  console.log("Fetching leads...");
  const { data: leads, error } = await supabase.from("leads").select("leadId, ville");
  
  if (error) {
    console.error("Error fetching leads:", error);
    return;
  }

  let updatedCount = 0;

  for (const lead of leads) {
    if (!lead.ville) continue;
    
    const normalized = normalizeCity(lead.ville);
    if (normalized !== lead.ville) {
      console.log(`Fixing ville for lead ${lead.leadId}: "${lead.ville}" -> "${normalized}"`);
      const { error: updateError } = await supabase
        .from("leads")
        .update({ ville: normalized })
        .eq("leadId", lead.leadId);
        
      if (updateError) {
        console.error(`Error updating lead ${lead.leadId}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Finished. Updated ${updatedCount} leads.`);
}

fixVilles();
