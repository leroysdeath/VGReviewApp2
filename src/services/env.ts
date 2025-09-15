// Environment variable bridge for import.meta.env compatibility
// Handles both Vite (import.meta.env) and Jest (process.env) environments

interface EnvironmentVariables {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_IGDB_CLIENT_ID?: string;
  VITE_IGDB_ACCESS_TOKEN?: string;
}

/**
 * Gets environment variables - prioritizes import.meta.env in browser, process.env in Node
 */
function getEnvVar(key: keyof EnvironmentVariables): string | undefined {
  // In browser/Vite environment, use import.meta.env
  if (typeof window !== 'undefined') {
    try {
      // @ts-ignore - import.meta.env is available in Vite
      return import.meta.env[key];
    } catch (e) {
      return undefined;
    }
  }
  
  // In Node/Jest environment, use process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  
  return undefined;
}

/**
 * Environment configuration that works in both Vite and Jest
 */
export const ENV: EnvironmentVariables = {
  VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL') || '',
  VITE_SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY') || '',
  VITE_IGDB_CLIENT_ID: getEnvVar('VITE_IGDB_CLIENT_ID'),
  VITE_IGDB_ACCESS_TOKEN: getEnvVar('VITE_IGDB_ACCESS_TOKEN')
};

// For test environments, use test values
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  ENV.VITE_SUPABASE_URL = ENV.VITE_SUPABASE_URL || 'https://test.supabase.co';
  ENV.VITE_SUPABASE_ANON_KEY = ENV.VITE_SUPABASE_ANON_KEY || 'test-anon-key';
}

// Validate required environment variables (skip in test environment)
if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
  if (!ENV.VITE_SUPABASE_URL) {
    console.error('Missing required environment variable: VITE_SUPABASE_URL');
    console.error('Make sure you have a .env file with VITE_SUPABASE_URL set');
    console.error('Current environment:', typeof window !== 'undefined' ? 'browser' : 'node');
  }

  if (!ENV.VITE_SUPABASE_ANON_KEY) {
    console.error('Missing required environment variable: VITE_SUPABASE_ANON_KEY');
    console.error('Make sure you have a .env file with VITE_SUPABASE_ANON_KEY set');
  }
}

// Export individual variables for convenience
export const {
  VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY,
  VITE_IGDB_CLIENT_ID,
  VITE_IGDB_ACCESS_TOKEN
} = ENV;

// Development logging
if ((typeof process !== 'undefined' && process.env.NODE_ENV === 'development') || 
    (typeof window !== 'undefined')) {
  // Environment configuration loaded
}