const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkStatuses() {
  const { data, error } = await supabase.from('leads').select('statut');
  
  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  const statusCounts = {};
  data.forEach(lead => {
    const s = lead.statut;
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  console.log("Distinct statuses in DB:");
  console.log(statusCounts);
}

checkStatuses();
