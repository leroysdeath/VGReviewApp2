// Test environment configuration for Jest
// This file only uses process.env to avoid import.meta issues

interface EnvironmentVariables {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_IGDB_CLIENT_ID?: string;
  VITE_IGDB_ACCESS_TOKEN?: string;
}

// For Jest tests, always use process.env
export const ENV: EnvironmentVariables = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://cqufmmnguumyhbkhgwdc.supabase.co',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdWZtbW5ndXVteWhia2hnd2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MzU3MDUsImV4cCI6MjA2ODIxMTcwNX0.iP9jJM26Xa3-YeeB2YdYnqMK5JZyYcFY5_KXuLAZw-s',
  VITE_IGDB_CLIENT_ID: process.env.VITE_IGDB_CLIENT_ID,
  VITE_IGDB_ACCESS_TOKEN: process.env.VITE_IGDB_ACCESS_TOKEN
};

// Export individual variables for convenience
export const {
  VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY,
  VITE_IGDB_CLIENT_ID,
  VITE_IGDB_ACCESS_TOKEN
} = ENV;