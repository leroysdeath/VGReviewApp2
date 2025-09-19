// Test environment configuration for Jest
// This file only uses process.env to avoid import.meta issues

interface EnvironmentVariables {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_IGDB_CLIENT_ID?: string;
  VITE_IGDB_ACCESS_TOKEN?: string;
}

// For Jest tests, always use test values
export const ENV: EnvironmentVariables = {
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
  VITE_IGDB_CLIENT_ID: 'test-client-id',
  VITE_IGDB_ACCESS_TOKEN: 'test-access-token'
};

// Export individual variables for convenience
export const {
  VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY,
  VITE_IGDB_CLIENT_ID,
  VITE_IGDB_ACCESS_TOKEN
} = ENV;