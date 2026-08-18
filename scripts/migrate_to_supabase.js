require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function migrate() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const rawData = fs.readFileSync('leads_data.json', 'utf8');
  const jsonData = JSON.parse(rawData);
  const leads = jsonData.leads;

  console.log(`Starting migration of ${leads.length} leads...`);

  // Map JSON keys to Supabase columns
  const mappedLeads = leads.map(raw => ({
    leadId: raw["LeadID"] || "",
    nom: raw["Nom"] || "",
    telephone: String(raw["Téléphone"] || raw["Telephone"] || ""),
    canal: raw["Canal"] || "",
    ville: raw["Ville"] || "",
    typeDeBien: raw["Type de bien"] || "",
    surface: String(raw["Surface"] ?? ""),
    dateFormulaire: raw["Date formulaire"] || null,
    doublon: raw["Doublon"] || "",
    date1erContact: raw["Date 1er contact"] || null,
    appelTelephonique: raw["Appel téléphonique"] || raw["Appel telephonique"] || "",
    statut: raw["Statut"] || "",
    contacteSurWhatsapp: raw["Contacté sur whatsapp"] || raw["Contacté sur WhatsApp"] || raw["Contacte sur whatsapp"] || "",
    devisEnvoye: raw["Devis envoyé"] || raw["Devis envoye"] || "",
    demoEnvoye: raw["Demo envoyé"] || raw["Démo envoyé"] || raw["Démo envoyée"] || "",
    prixProposeMAD: String(raw["Prix proposé (MAD)"] ?? raw["Prix propose (MAD)"] ?? ""),
    dateDeEchange: raw["Date dernier échange"] || raw["Date dernier echange"] || null,
    relance1Auto: raw["Relance 1 (auto)"] || null,
    relance2Auto: raw["Relance 2 (auto)"] || null,
    relance3Auto: raw["Relance 3 (auto)"] || null,
    notes: raw["Notes"] || "",
    archive: String(raw["Archivé"] ?? raw["Archive"] ?? "")
  }));

  const { data, error } = await supabase
    .from('leads')
    .upsert(mappedLeads, { onConflict: 'leadId' });

  if (error) {
    console.error("Migration failed:", error);
  } else {
    console.log("Migration successful!");
  }
}

migrate();
