import { createClient } from '@supabase/supabase-js';
import { corsConfig, getCorsHeaders } from '../config/cors';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      ...getCorsHeaders(),
      'X-Client-Info': `vgreviewapp-${corsConfig.environment}`
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
