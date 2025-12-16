// supabaseClient.ts
// services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://utihfxcdejjkqydtsiqj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0aWhmeGNkZWpqa3F5ZHRzaXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3OTYyMjYsImV4cCI6MjA4MTM3MjIyNn0.6Tn9yBDHH-bo0dZBFok9JOpwfXKOSSVos8iPZS9fVcI';

console.log('🔗 Supabase URL:', supabaseUrl);
console.log('✅ Supabase client initialized');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const isSupabaseConfigured = () => !!supabase;

// Simple types - no complex Database type needed
export type Tables = 'users' | 'topics' | 'assessments' | 'submissions' | 'user_progress' | 'announcements';