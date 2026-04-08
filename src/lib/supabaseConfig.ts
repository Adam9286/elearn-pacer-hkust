const readEnv = (key: keyof ImportMetaEnv): string => {
  const value = import.meta.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const EXTERNAL_SUPABASE_URL = readEnv("VITE_SUPABASE_URL");
export const EXTERNAL_SUPABASE_ANON_KEY = readEnv("VITE_SUPABASE_ANON_KEY");

export const EXAM_SUPABASE_URL = readEnv("VITE_KNOWLEDGE_BASE_URL");
export const EXAM_SUPABASE_ANON_KEY = readEnv("VITE_KNOWLEDGE_BASE_ANON_KEY");
