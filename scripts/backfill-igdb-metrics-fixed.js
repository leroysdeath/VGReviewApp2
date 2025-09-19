#!/usr/bin/env node

/**
 * IGDB Metrics Backfill Script - Fixed Version
 * 
 * Fixed issues:
 * - Better error handling for ES modules
 * - More verbose logging
 * - Timeout handling
 * - Graceful connection testing
 */

// Import required modules
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Load environment variables
console.log('📝 Loading environment variables...');
config();

// Make fetch global
global.fetch = fetch;

// Configuration validation
console.log('🔍 Validating configuration...');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log(`SUPABASE_URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('\n❌ Missing Supabase environment variables');
  console.error('Make sure your .env file contains:');
  console.error('VITE_SUPABASE_URL=your_supabase_url');
  console.error('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  process.exit(1);
}

// Initialize Supabase client
console.log('🔌 Connecting to Supabase...');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

// Test database connection
async function testConnection() {
  console.log('🧪 Testing database connection...');
  try {
    const { data, error } = await supabase
      .from('game')
      .select('count')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Test if the new columns exist
async function testNewColumns() {
  console.log('🔍 Checking for new IGDB metrics columns...');
  try {
    const { data, error } = await supabase
      .from('game')
      .select('total_rating, rating_count, follows, hypes, popularity_score')
      .limit(1);
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.error('❌ New columns not found. Have you run the migration?');
        console.error('Run this first: Apply the migration in supabase/migrations/20250911_add_igdb_metrics_columns.sql');
        return false;
      }
      throw error;
    }
    
    console.log('✅ New IGDB metrics columns found');
    return true;
  } catch (error) {
    console.error('❌ Column check failed:', error.message);
    return false;
  }
}

// Get current statistics
async function getCurrentStats() {
  console.log('📊 Getting current database statistics...');
  try {
    const { data: totalCount, error: countError } = await supabase
      .from('game')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    const { data: missingMetrics, error: missingError } = await supabase
      .from('game')
      .select('*', { count: 'exact', head: true })
      .or('total_rating.is.null,rating_count.eq.0,follows.eq.0');
    
    if (missingError) throw missingError;
    
    const total = totalCount.count || 0;
    const missing = missingMetrics.count || 0;
    const withMetrics = total - missing;
    const percentage = total > 0 ? ((withMetrics / total) * 100).toFixed(1) : 0;
    
    console.log(`📊 Database Statistics:`);
    console.log(`   Total games: ${total}`);
    console.log(`   Games with metrics: ${withMetrics}`);
    console.log(`   Games missing metrics: ${missing}`);
    console.log(`   Completion: ${percentage}%`);
    
    return { total, missing, withMetrics, percentage };
  } catch (error) {
    console.error('❌ Failed to get statistics:', error.message);
    return { total: 0, missing: 0, withMetrics: 0, percentage: 0 };
  }
}

// Get a small sample of games missing metrics
async function getSampleGamesMissingMetrics(limit = 5) {
  console.log(`🔍 Getting sample of games missing metrics (limit: ${limit})...`);
  try {
    const { data, error } = await supabase
      .from('game')
      .select('id, igdb_id, name, total_rating, rating_count, follows, hypes')
      .or('total_rating.is.null,rating_count.eq.0,follows.eq.0')
      .order('id')
      .limit(limit);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.log('✅ No games found missing metrics!');
      return [];
    }
    
    console.log(`📋 Sample games missing metrics:`);
    data.forEach((game, index) => {
      console.log(`   ${index + 1}. ${game.name} (ID: ${game.id}, IGDB: ${game.igdb_id})`);
      console.log(`      Current metrics: rating=${game.total_rating}, count=${game.rating_count}, follows=${game.follows}, hypes=${game.hypes}`);
    });
    
    return data;
  } catch (error) {
    console.error('❌ Failed to get sample games:', error.message);
    return [];
  }
}

// Test IGDB API connectivity
async function testIGDBAPI(igdbId = 1942) { // Using Super Mario Bros as test
  console.log('🌐 Testing IGDB API connectivity...');
  try {
    const requestBody = `fields id, name, total_rating, rating_count, follows, hypes; where id = ${igdbId};`;
    
    console.log('📡 Making test request to IGDB...');
    const response = await fetch('/.netlify/functions/igdb-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isBulkRequest: true,
        endpoint: 'games',
        requestBody
      })
    });

    if (!response.ok) {
      throw new Error(`IGDB API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`IGDB API error: ${data.error || 'Unknown error'}`);
    }
    
    if (!data.data || data.data.length === 0) {
      throw new Error('IGDB API returned no data');
    }
    
    const game = data.data[0];
    console.log('✅ IGDB API test successful');
    console.log(`   Test game: ${game.name || 'Unknown'}`);
    console.log(`   Metrics: rating=${game.total_rating}, count=${game.rating_count}, follows=${game.follows}, hypes=${game.hypes}`);
    
    return true;
  } catch (error) {
    console.error('❌ IGDB API test failed:', error.message);
    console.error('   This could mean:');
    console.error('   - Netlify functions are not running');
    console.error('   - IGDB API credentials are missing');
    console.error('   - Network connectivity issues');
    return false;
  }
}

// Main diagnostic function
async function runDiagnostics() {
  console.log('🚀 IGDB Metrics Backfill Diagnostics');
  console.log('=====================================\n');
  
  const checks = [
    testConnection,
    testNewColumns,
    getCurrentStats,
    () => getSampleGamesMissingMetrics(3),
    testIGDBAPI
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    try {
      const result = await check();
      if (result === false) {
        allPassed = false;
      }
    } catch (error) {
      console.error(`❌ Check failed: ${error.message}`);
      allPassed = false;
    }
    console.log(''); // Add spacing
  }
  
  if (allPassed) {
    console.log('🎉 All diagnostics passed! Ready to run backfill.');
    console.log('\nTo run the actual backfill:');
    console.log('node scripts/backfill-igdb-metrics-fixed.js --run-backfill');
  } else {
    console.log('⚠️  Some diagnostics failed. Please fix the issues above before running backfill.');
  }
  
  return allPassed;
}

// Simple backfill function (just processes 1 game as a test)
async function runTestBackfill() {
  console.log('🧪 Running test backfill (1 game only)...\n');
  
  // Get one game missing metrics
  const { data: games, error } = await supabase
    .from('game')
    .select('id, igdb_id, name')
    .or('total_rating.is.null,rating_count.eq.0,follows.eq.0')
    .limit(1);
  
  if (error) {
    console.error('❌ Failed to get test game:', error.message);
    return;
  }
  
  if (!games || games.length === 0) {
    console.log('✅ No games need metrics backfill!');
    return;
  }
  
  const game = games[0];
  console.log(`🎮 Processing: ${game.name} (ID: ${game.id}, IGDB: ${game.igdb_id})`);
  
  try {
    // Fetch from IGDB
    const requestBody = `fields id, total_rating, rating_count, follows, hypes; where id = ${game.igdb_id};`;
    
    const response = await fetch('/.netlify/functions/igdb-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isBulkRequest: true,
        endpoint: 'games',
        requestBody
      })
    });

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.data || data.data.length === 0) {
      console.log('   ⏭️  No IGDB data found for this game');
      return;
    }
    
    const igdbData = data.data[0];
    console.log(`   📊 IGDB data: rating=${igdbData.total_rating}, count=${igdbData.rating_count}, follows=${igdbData.follows}, hypes=${igdbData.hypes}`);
    
    // Calculate popularity score
    const popularityScore = Math.round(
      (igdbData.follows || 0) * 0.6 +
      (igdbData.hypes || 0) * 0.3 +
      (igdbData.rating_count || 0) * 10 * 0.1
    );
    
    const updateData = {
      total_rating: igdbData.total_rating || null,
      rating_count: igdbData.rating_count || 0,
      follows: igdbData.follows || 0,
      hypes: igdbData.hypes || 0,
      updated_at: new Date().toISOString()
    };
    
    console.log(`   📊 Calculated popularity score: ${popularityScore}`);
    console.log('   💾 Updating database...');
    
    const { error: updateError } = await supabase
      .from('game')
      .update(updateData)
      .eq('id', game.id);
    
    if (updateError) {
      throw updateError;
    }
    
    console.log('   ✅ Successfully updated!');
    
    // Verify the update
    const { data: updated, error: verifyError } = await supabase
      .from('game')
      .select('total_rating, rating_count, follows, hypes, popularity_score')
      .eq('id', game.id)
      .single();
    
    if (verifyError) {
      console.log('   ⚠️  Could not verify update:', verifyError.message);
    } else {
      console.log('   ✅ Verification successful:');
      console.log(`      Updated metrics: rating=${updated.total_rating}, count=${updated.rating_count}, follows=${updated.follows}, hypes=${updated.hypes}`);
      console.log(`      Auto-calculated popularity_score: ${updated.popularity_score}`);
    }
    
  } catch (error) {
    console.error(`   ❌ Failed to process game: ${error.message}`);
  }
}

// Parse arguments
const args = process.argv.slice(2);
const shouldRunBackfill = args.includes('--run-backfill');
const shouldRunTest = args.includes('--test-backfill');

// Main execution
async function main() {
  try {
    if (shouldRunTest) {
      await runTestBackfill();
    } else if (shouldRunBackfill) {
      console.log('⚠️  Full backfill not implemented in this diagnostic version.');
      console.log('Run with --test-backfill to test with 1 game first.');
    } else {
      await runDiagnostics();
    }
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Interrupted by user');
  process.exit(0);
});

// Add some timeout to prevent hanging
const timeout = setTimeout(() => {
  console.error('⏰ Script timed out after 30 seconds');
  process.exit(1);
}, 30000);

main().finally(() => {
  clearTimeout(timeout);
});