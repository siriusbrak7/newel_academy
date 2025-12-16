// supabaseClient.ts
// services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔗 Supabase URL:', supabaseUrl);
console.log('✅ Supabase client initialized');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const isSupabaseConfigured = () => !!supabase;

// Simple types - no complex Database type needed
export type Tables = 'users' | 'topics' | 'assessments' | 'submissions' | 'user_progress' | 'announcements';