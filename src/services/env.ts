// Environment variable bridge for import.meta.env compatibility
// Handles both Vite (import.meta.env) and Jest (process.env) environments

interface EnvironmentVariables {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_IGDB_CLIENT_ID?: string;
  VITE_IGDB_ACCESS_TOKEN?: string;
}

/**
 * Safely get import.meta if available, otherwise return null
 */
function getImportMeta(): any {
  try {
    // Use eval to avoid TypeScript compilation issues with import.meta in Jest
    return (typeof globalThis !== 'undefined' && (globalThis as any).import?.meta) || null;
  } catch {
    return null;
  }
}

/**
 * Gets environment variables from either import.meta.env (Vite) or process.env (Node/Jest)
 */
function getEnvVar(key: keyof EnvironmentVariables): string | undefined {
  // Try import.meta.env first (Vite environment)
  const importMeta = getImportMeta();
  if (importMeta?.env?.[key]) {
    return importMeta.env[key];
  }
  
  // Fallback to process.env (Node/Jest environment)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  
  return undefined;
}

/**
 * Environment configuration that works in both Vite and Jest
 */
export const ENV: EnvironmentVariables = {
  VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL') || 'http://localhost:54321',
  VITE_SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY') || 'test-anon-key',
  VITE_IGDB_CLIENT_ID: getEnvVar('VITE_IGDB_CLIENT_ID'),
  VITE_IGDB_ACCESS_TOKEN: getEnvVar('VITE_IGDB_ACCESS_TOKEN')
};

// Validate required environment variables
if (!ENV.VITE_SUPABASE_URL) {
  throw new Error('Missing required environment variable: VITE_SUPABASE_URL');
}

if (!ENV.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Missing required environment variable: VITE_SUPABASE_ANON_KEY');
}

// Export individual variables for convenience
export const {
  VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY,
  VITE_IGDB_CLIENT_ID,
  VITE_IGDB_ACCESS_TOKEN
} = ENV;

// Development logging
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  const importMeta = getImportMeta();
  console.log('🔧 Environment bridge loaded:', {
    hasSupabaseUrl: !!ENV.VITE_SUPABASE_URL,
    hasSupabaseKey: !!ENV.VITE_SUPABASE_ANON_KEY,
    hasIGDBClient: !!ENV.VITE_IGDB_CLIENT_ID,
    hasIGDBToken: !!ENV.VITE_IGDB_ACCESS_TOKEN,
    environment: importMeta?.env ? 'Vite' : 'Node/Jest'
  });
}