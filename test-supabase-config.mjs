// Quick test to verify Supabase configuration using ES modules
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

console.log('Testing Supabase configuration...');

// Load .env file
try {
  dotenv.config();
  console.log('✅ dotenv loaded');
} catch (error) {
  console.log('❌ dotenv failed:', error.message);
}

// Also try to read .env directly
try {
  const envContent = readFileSync('.env', 'utf8');
  console.log('\n📄 .env file contents:');
  // Only show first line to avoid exposing secrets
  console.log(envContent.split('\n')[0] + '...');
} catch (error) {
  console.log('❌ Could not read .env file:', error.message);
}

// Test environment variables
console.log('\nEnvironment variables:');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL || 'NOT SET');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET');

// Use hardcoded values from .env for testing
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cqufmmnguumyhbkhgwdc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdWZtbW5ndXVteWhia2hnd2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MzU3MDUsImV4cCI6MjA2ODIxMTcwNX0.iP9jJM26Xa3-YeeB2YdYnqMK5JZyYcFY5_KXuLAZw-s';

console.log('\nTesting Supabase client creation...');
console.log('URL:', supabaseUrl);
console.log('Key starts with:', supabaseKey.substring(0, 20) + '...');

try {
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client created successfully');
  
  // Test basic query
  console.log('\nTesting basic database query...');
  const { data, error } = await supabase
    .from('game')
    .select('id, name')
    .limit(1);
    
  if (error) {
    console.error('❌ Database query failed:', error.message);
    console.error('   Error details:', error);
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('❌ This is likely an authentication/authorization error');
      console.error('   Check your Supabase anon key and RLS policies');
    }
    process.exit(1);
  } else {
    console.log('✅ Database query successful:', data);
    process.exit(0);
  }

} catch (error) {
  console.error('❌ Failed to create/test Supabase client:', error.message);
  process.exit(1);
}