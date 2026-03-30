import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EXTERNAL_SUPABASE_ANON_KEY, EXTERNAL_SUPABASE_URL } from '@/lib/supabaseConfig';

const createSupabaseClient = (): SupabaseClient => {
  try {
    return createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
      auth: {
        storage: typeof window !== 'undefined' ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    throw error;
  }
};

export const externalSupabase = createSupabaseClient();
export { EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY };
