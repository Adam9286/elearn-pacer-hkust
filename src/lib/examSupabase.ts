import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EXAM_SUPABASE_ANON_KEY, EXAM_SUPABASE_URL } from '@/lib/supabaseConfig';

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
