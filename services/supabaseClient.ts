// supabaseClient.ts
// services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Fail fast and loudly if required env vars are missing to avoid silent production failures
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl ? 'VITE_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null
  ].filter(Boolean).join(', ');

  console.error(`❌ Supabase environment variables missing: ${missing}`);
  throw new Error(`Missing required Supabase environment variables: ${missing}`);
}

console.log('🔗 Supabase URL:', supabaseUrl);
console.log('✅ Supabase client initialized');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const isSupabaseConfigured = () => !!(supabaseUrl && supabaseAnonKey);

// Simple types - no complex Database type needed
export type Tables = 'users' | 'topics' | 'assessments' | 'submissions' | 'user_progress' | 'announcements';