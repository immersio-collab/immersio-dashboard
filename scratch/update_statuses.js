const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const MAPPING = {
  'Qualifié': 'Intéressé',
  'Relance 1 envoyée': 'Contacté',
  'Relance 2 envoyée': 'Contacté',
  'Devis envoyé': 'Négociation',
  'Curieux / Non qualifié': 'Perdu'
};

async function updateStatuses() {
  const { data, error } = await supabase.from('leads').select('leadId, statut');
  
  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  let updatedCount = 0;
  for (const lead of data) {
    if (MAPPING[lead.statut]) {
      const { error: updateError } = await supabase
        .from('leads')
        .update({ statut: MAPPING[lead.statut] })
        .eq('leadId', lead.leadId);
        
      if (updateError) {
        console.error(`Error updating lead ${lead.leadId}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Successfully updated ${updatedCount} leads.`);
}

updateStatuses();
