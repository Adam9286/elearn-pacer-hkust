import { createClient, SupabaseClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://dpedzjzrlzvzqrzajrda.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwZWR6anpybHp2enFyemFqcmRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5Mzk5ODAsImV4cCI6MjA4MzUxNTk4MH0.eeUelxZoKBtWLwMwvCmHE5H6cYemYNJ06eyVEItp6Tk';

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
