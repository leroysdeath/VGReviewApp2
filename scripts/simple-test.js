#!/usr/bin/env node

// Super simple test to isolate the issue
console.log('🚀 Starting simple test...');

import { config } from 'dotenv';
console.log('✅ dotenv imported');

config();
console.log('✅ dotenv config loaded');

console.log('Environment check:');
console.log(`VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET'}`);
console.log(`VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}`);

try {
  console.log('📦 Importing Supabase...');
  const { createClient } = await import('@supabase/supabase-js');
  console.log('✅ Supabase imported');

  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  console.log('🔌 Creating Supabase client...');
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  console.log('✅ Supabase client created');

  console.log('🧪 Testing basic query...');
  const { data, error } = await supabase
    .from('game')
    .select('count')
    .limit(1);

  if (error) {
    console.error('❌ Query failed:', error.message);
  } else {
    console.log('✅ Basic query successful');
  }

  console.log('🔍 Checking for new columns...');
  const { data: columnTest, error: columnError } = await supabase
    .from('game')
    .select('total_rating, rating_count, follows, hypes')
    .limit(1);

  if (columnError) {
    console.error('❌ New columns not found:', columnError.message);
    console.log('💡 You need to run the database migration first!');
  } else {
    console.log('✅ New columns exist');
  }

  console.log('\n🎉 Simple test completed successfully!');
  
} catch (error) {
  console.error('💥 Error:', error.message);
  console.error('Stack:', error.stack);
}

console.log('👋 Test finished');
process.exit(0);