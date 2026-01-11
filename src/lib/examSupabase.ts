import { createClient, SupabaseClient } from '@supabase/supabase-js';

const EXAM_SUPABASE_URL = 'https://oqgotlmztpvchkipslnc.supabase.co';
const EXAM_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xZ290bG16dHB2Y2hraXBzbG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMjc0MjAsImV4cCI6MjA3NTkwMzQyMH0.1yt8V-9weq5n7z2ncN1p9vAgRvNI4TAIC5VyDFcuM7w';

const createExamSupabaseClient = (): SupabaseClient => {
  try {
    return createClient(EXAM_SUPABASE_URL, EXAM_SUPABASE_ANON_KEY, {
      auth: {
        storage: typeof window !== 'undefined' ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  } catch (error) {
    console.error('Failed to create Exam Supabase client:', error);
    throw error;
  }
};

export const examSupabase = createExamSupabaseClient();
export { EXAM_SUPABASE_URL, EXAM_SUPABASE_ANON_KEY };
