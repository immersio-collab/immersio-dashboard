import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/config';

import { Database } from '@/types/supabase';

// Singleton instance of the Supabase client
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
