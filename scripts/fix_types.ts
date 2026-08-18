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

function normalizeType(type: string | null | undefined) {
  if (!type) return "Autre";
  const v = type.trim().toLowerCase();
  
  if (
    v.includes("immobilier") || 
    v.includes("appartement") || 
    v.includes("villa") || 
    v.includes("terrain") || 
    v.includes("résidence") || 
    v.includes("hôtel") || 
    v.includes("riad")
  ) {
    return "Immobilier";
  }
  
  if (
    v.includes("cabinet") || 
    v.includes("medecin") || 
    v.includes("oto-rhino") || 
    v.includes("dentistaire") || 
    v.includes("gastro") || 
    v.includes("hijama")
  ) {
    return "Cabinet Médical";
  }
  
  if (
    v.includes("ecole") || 
    v.includes("éducation") || 
    v.includes("education")
  ) {
    return "Ecole";
  }
  
  if (v.includes("bureau")) {
    return "Bureau";
  }
  
  return "Autre";
}

async function fixTypes() {
  console.log("Fetching leads...");
  const { data: leads, error } = await supabase.from("leads").select("leadId, typeDeBien");
  
  if (error) {
    console.error("Error fetching leads:", error);
    return;
  }

  let updatedCount = 0;

  for (const lead of leads) {
    const normalized = normalizeType(lead.typeDeBien);
    if (normalized !== lead.typeDeBien) {
      console.log(`Fixing type for lead ${lead.leadId}: "${lead.typeDeBien}" -> "${normalized}"`);
      const { error: updateError } = await supabase
        .from("leads")
        .update({ typeDeBien: normalized })
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

fixTypes();
