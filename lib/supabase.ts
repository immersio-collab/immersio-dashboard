import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/config';

import { Database } from '@/types/supabase';

// Singleton instance of the Supabase client.
// Note: This client runs exclusively on the server and is initialized with the 
// secret serviceRoleKey (service_role key), which allows it to bypass Row-Level 
// Security (RLS) policies. This is necessary because database tables have RLS 
// enabled and direct public access is blocked.
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  
  supabaseInstance = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (url, options) => {
        return fetch(url, { ...options, cache: 'no-store' });
      },
    },
  });

  return supabaseInstance;
}
