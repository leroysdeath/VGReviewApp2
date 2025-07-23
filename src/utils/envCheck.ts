// src/utils/envCheck.ts
export const validateEnvironment = () => {
  const requiredVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  const missing = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    console.error('Please check your .env file and ensure all required variables are set.');
    return false;
  }

  console.log('✅ Environment variables configured correctly');
  return true;
};

// Call this on app startup
if (import.meta.env.DEV) {
  validateEnvironment();
}
