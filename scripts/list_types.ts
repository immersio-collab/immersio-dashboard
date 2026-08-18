import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTypes() {
  const { data: leads, error } = await supabase.from("leads").select("typeDeBien");
  if (error) {
    console.error(error);
    return;
  }
  const types = new Set();
  leads.forEach(l => {
    if (l.typeDeBien) types.add(l.typeDeBien);
  });
  console.log("Unique types:", Array.from(types));
}

listTypes();
