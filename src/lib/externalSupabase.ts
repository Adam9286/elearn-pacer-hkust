import { createClient } from '@supabase/supabase-js';

const EXTERNAL_SUPABASE_URL = 'https://dpedzjzrlzvzqrzajrda.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwZWR6anpybHp2enFyemFqcmRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5Mzk5ODAsImV4cCI6MjA4MzUxNTk4MH0.eeUelxZoKBtWLwMwvCmHE5H6cYemYNJ06eyVEItp6Tk';

export const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
