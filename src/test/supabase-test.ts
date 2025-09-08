import { createClient } from '@supabase/supabase-js';
import { sanitizeSearchTerm } from '../utils/sqlSecurity';
import { Database } from '../types/supabase';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Use a unique storage key to avoid conflicts
    storageKey: 'vgreviewapp-auth-token'
  },
  global: {
    headers: {
      'X-Client-Info': 'vgreviewapp-web'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});