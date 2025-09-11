#!/usr/bin/env node

/**
 * Timeout-Resistant IGDB Backfill Script
 * 
 * Designed to work around Supabase timeout issues by:
 * - Using shorter, more targeted queries
 * - Adding retry logic
 * - Smaller batch sizes
 * - Extended timeouts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

config();
global.fetch = fetch;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Create Supabase client with extended timeout
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { 
    schema: 'public'
  },
  auth: { 
    persistSession: false 
  },
  global: {
    headers: {
      'X-Supabase-Timeout': '60' // 60 second timeout
    }
  }
});

// Retry wrapper for database operations
async function withRetry(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`   ⚠️  Attempt ${attempt} failed: ${error.message}`);
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Get all games missing metrics
async function getGamesMissingMetrics(limit = null) {
  console.log(`🔍 Getting ${limit ? limit : 'ALL'} games missing metrics...`);
  
  return withRetry(async () => {
    let query = supabase
      .from('game')
      .select('id, igdb_id, name')
      .or('total_rating.is.null,follows.eq.0') // Simplified condition
      .not('igdb_id', 'is', null) // Must have IGDB ID
      .order('id');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  });
}

// Fetch metrics from IGDB with timeout (direct API call)
async function fetchIGDBMetrics(igdbId) {
  console.log(`   📡 Fetching IGDB data for game ${igdbId}...`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
  
  try {
    const requestBody = `fields id, total_rating, rating_count, follows, hypes; where id = ${igdbId};`;
    
    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${process.env.TWITCH_APP_ACCESS_TOKEN}`,
        'Content-Type': 'text/plain'
      },
      body: requestBody,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }
    
    return data[0];
    
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('IGDB request timed out');
    }
    throw error;
  }
}

// Update single game with retry logic
async function updateGameMetrics(gameId, metricsData) {
  console.log(`   💾 Updating game ${gameId} in database...`);
  
  return withRetry(async () => {
    const { error } = await supabase
      .from('game')
      .update(metricsData)
      .eq('id', gameId);
    
    if (error) throw error;
  });
}

// Process a single game
async function processGame(game) {
  console.log(`\n🎮 Processing: ${game.name}`);
  console.log(`   ID: ${game.id} | IGDB ID: ${game.igdb_id}`);
  
  try {
    // Step 1: Fetch from IGDB
    const igdbData = await fetchIGDBMetrics(game.igdb_id);
    
    if (!igdbData) {
      console.log(`   ⏭️  No IGDB data found`);
      return { status: 'skipped', reason: 'no_igdb_data' };
    }
    
    // Step 2: Prepare update data
    const metricsData = {
      total_rating: igdbData.total_rating ? Math.round(igdbData.total_rating) : null,
      rating_count: igdbData.rating_count || 0,
      follows: igdbData.follows || 0,
      hypes: igdbData.hypes || 0,
      updated_at: new Date().toISOString()
    };
    
    console.log(`   📊 Metrics: rating=${metricsData.total_rating}, count=${metricsData.rating_count}, follows=${metricsData.follows}, hypes=${metricsData.hypes}`);
    
    // Step 3: Update database
    await updateGameMetrics(game.id, metricsData);
    
    console.log(`   ✅ Successfully updated!`);
    return { status: 'success', metrics: metricsData };
    
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return { status: 'failed', error: error.message };
  }
}

// Main function
async function main() {
  console.log('🚀 IGDB Metrics Full Database Backfill');
  console.log('========================================\n');
  
  try {
    // Step 1: Get all games needing metrics
    const games = await getGamesMissingMetrics(); // Get ALL games
    
    if (games.length === 0) {
      console.log('✅ No games found that need metrics backfill!');
      return;
    }
    
    console.log(`📋 Found ${games.length} games to process:`);
    games.forEach((game, i) => {
      console.log(`   ${i + 1}. ${game.name} (ID: ${game.id})`);
    });
    
    // Step 2: Process each game with delay
    const results = [];
    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      
      // Add smaller delay between requests to be nice to APIs but faster processing
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
      }
      
      // Progress indicator every 10 games
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 Progress: ${i + 1}/${games.length} games processed (${Math.round((i + 1) / games.length * 100)}%)`);
      }
      
      const result = await processGame(game);
      results.push(result);
    }
    
    // Step 3: Summary
    console.log('\n📊 Results Summary:');
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    
    if (successful > 0) {
      console.log('\n🎉 Full database backfill completed successfully!');
      console.log(`📈 Enhanced ${successful} games with IGDB metrics.`);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Handle interruption
process.on('SIGINT', () => {
  console.log('\n🛑 Interrupted by user');
  process.exit(0);
});

// Add timeout protection - 2 hours for full database
const globalTimeout = setTimeout(() => {
  console.error('⏰ Script timed out after 2 hours');
  process.exit(1);
}, 7200000); // 2 hours

main().finally(() => {
  clearTimeout(globalTimeout);
  console.log('\n👋 Full backfill completed');
});