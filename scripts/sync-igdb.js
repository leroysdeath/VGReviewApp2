#!/usr/bin/env node

// IGDB Sync Script - Run locally to test syncing new games
// Usage: node scripts/sync-igdb.js [options]

// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Make fetch global for the sync service
global.fetch = fetch;

// Configuration - Load from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  console.error('');
  console.error('Current environment variables:');
  console.error(`VITE_SUPABASE_URL: ${SUPABASE_URL ? 'SET' : 'NOT SET'}`);
  console.error(`VITE_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}`);
  console.error('');
  console.error('Make sure you have a .env file in your project root with:');
  console.error('VITE_SUPABASE_URL=your_supabase_url');
  console.error('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  process.exit(1);
}

// Initialize Supabase client with custom timeout
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: false
  },
  global: {
    headers: {
      'X-Supabase-Timeout': '30'
    }
  }
});

// IGDB Service (simplified for Node.js)
class NodeIGDBSyncService {
  async syncNewGames(options = {}) {
    const {
      daysBack = 7,
      limit = 50,
      dryRun = false
    } = options;

    console.log(`🔄 Starting IGDB sync (${dryRun ? 'DRY RUN' : 'LIVE'})`);
    console.log(`📅 Checking games updated in last ${daysBack} days`);
    console.log(`🎯 Max games to process: ${limit}`);

    const result = {
      success: false,
      totalChecked: 0,
      newGamesFound: 0,
      gamesAdded: 0,
      errors: [],
      newGames: []
    };

    try {
      // Step 1: Get recently updated games from IGDB
      console.log('🔍 Fetching recent games from IGDB...');
      const recentGames = await this.getRecentlyUpdatedGames(daysBack, limit);
      result.totalChecked = recentGames.length;
      console.log(`📦 Found ${recentGames.length} recently updated games in IGDB`);

      if (recentGames.length === 0) {
        console.log('✅ No recent games found to sync');
        result.success = true;
        return result;
      }

      // Step 2: Check which games are already in our database
      console.log('🔍 Checking existing games in database...');
      const existingGames = await this.checkExistingGames(recentGames.map(g => g.id));
      const existingIds = new Set(existingGames.map(g => g.igdb_id));
      
      // Step 3: Filter to only new games
      const newGames = recentGames.filter(game => !existingIds.has(game.id));
      result.newGamesFound = newGames.length;
      console.log(`🆕 Found ${newGames.length} new games not in our database`);

      if (newGames.length === 0) {
        console.log('✅ All recent games are already in database');
        result.success = true;
        return result;
      }

      // Show the new games found
      console.log('\n📋 New games to add:');
      newGames.forEach((game, index) => {
        console.log(`  ${index + 1}. ${game.name} (ID: ${game.id})`);
      });

      // Step 4: Add new games to database (unless dry run)
      if (dryRun) {
        console.log(`\n🧪 DRY RUN: Would add ${newGames.length} games to database`);
        result.gamesAdded = newGames.length;
        result.newGames = newGames.map(game => ({
          igdb_id: game.id,
          name: game.name,
          added: true
        }));
      } else {
        console.log(`\n💾 Adding ${newGames.length} games to database...`);
        
        for (const [index, game] of newGames.entries()) {
          try {
            console.log(`  Adding ${index + 1}/${newGames.length}: ${game.name}...`);
            const added = await this.addGameToDatabase(game);
            
            result.newGames.push({
              igdb_id: game.id,
              name: game.name,
              added: added,
              error: added ? undefined : 'Failed to insert'
            });

            if (added) {
              result.gamesAdded++;
              console.log(`    ✅ Added successfully`);
            } else {
              console.log(`    ❌ Failed to add`);
            }
            
            // Small delay to avoid overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            const errorMsg = `Error adding ${game.name}: ${error.message}`;
            result.errors.push(errorMsg);
            console.log(`    ❌ ${errorMsg}`);
            
            result.newGames.push({
              igdb_id: game.id,
              name: game.name,
              added: false,
              error: errorMsg
            });
          }
        }
      }

      result.success = true;
      console.log(`\n🎉 Sync completed!`);
      console.log(`   📊 Total checked: ${result.totalChecked}`);
      console.log(`   🆕 New games found: ${result.newGamesFound}`);
      console.log(`   ✅ Games added: ${result.gamesAdded}`);
      console.log(`   ❌ Errors: ${result.errors.length}`);

    } catch (error) {
      const errorMsg = `Sync failed: ${error.message}`;
      result.errors.push(errorMsg);
      console.error(`💥 ${errorMsg}`);
    }

    return result;
  }

  async getRecentlyUpdatedGames(daysBack, limit) {
    try {
      // Calculate timestamp for X days ago
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - daysBack);
      const timestamp = Math.floor(daysAgo.getTime() / 1000);

      console.log(`   📅 Fetching games updated since: ${daysAgo.toISOString()}`);

      // Call the IGDB function
      const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isBulkRequest: true,
          endpoint: 'games',
          requestBody: `fields name, summary, first_release_date, rating, cover.url, genres.name, platforms.name, platforms.id, release_dates.platform, release_dates.status, involved_companies.company.name, updated_at; where updated_at > ${timestamp} & category = 0; sort updated_at desc; limit ${limit};`
        })
      });

      if (!response.ok) {
        throw new Error(`IGDB API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'IGDB API request failed');
      }

      return data.games || [];
    } catch (error) {
      console.error('   ❌ Error fetching from IGDB:', error.message);
      throw error;
    }
  }

  async checkExistingGames(igdbIds) {
    if (igdbIds.length === 0) return [];

    console.log(`   🔍 Checking ${igdbIds.length} games against local database`);

    const { data, error } = await supabase
      .from('game')
      .select('igdb_id')
      .in('igdb_id', igdbIds);

    if (error) {
      console.error('   ❌ Error checking existing games:', error);
      throw error;
    }

    console.log(`   📊 Found ${data?.length || 0} existing games in database`);
    return data || [];
  }

  async addGameToDatabase(igdbGame) {
    try {
      const gameData = {
        // CRITICAL FIX: Don't set game_id - let database auto-increment the primary key
        // game_id: igdbGame.id.toString(), // REMOVED - this was causing orphaned records
        igdb_id: igdbGame.id,
        name: igdbGame.name,
        slug: igdbGame.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        summary: igdbGame.summary || null,
        description: igdbGame.summary || null,
        release_date: igdbGame.first_release_date 
          ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
          : null,
        igdb_rating: igdbGame.rating ? Math.round(parseFloat(igdbGame.rating)) : null,
        cover_url: igdbGame.cover?.url 
          ? igdbGame.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://') 
          : null,
        pic_url: igdbGame.cover?.url 
          ? igdbGame.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://') 
          : null,
        igdb_link: `https://www.igdb.com/games/${igdbGame.id}`,
        genre: igdbGame.genres?.[0]?.name || null,
        genres: igdbGame.genres?.map(g => g.name) || null,
        developer: igdbGame.involved_companies?.find(c => c.developer)?.company?.name || 
                   igdbGame.involved_companies?.[0]?.company?.name || null,
        publisher: igdbGame.involved_companies?.find(c => c.publisher)?.company?.name || 
                   igdbGame.involved_companies?.[0]?.company?.name || null,
        platforms: igdbGame.platforms?.map(p => p.name) || null,
        is_verified: false,
        view_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('game')
        .insert([gameData]);

      if (error) {
        console.error(`      ❌ Database error:`, error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`      ❌ Error adding game:`, error.message);
      return false;
    }
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run') || args.includes('-d'),
  daysBack: 7,
  limit: 50
};

// Parse days back
const daysIndex = args.findIndex(arg => arg === '--days' || arg === '-n');
if (daysIndex >= 0 && args[daysIndex + 1]) {
  options.daysBack = parseInt(args[daysIndex + 1]) || 7;
}

// Parse limit
const limitIndex = args.findIndex(arg => arg === '--limit' || arg === '-l');
if (limitIndex >= 0 && args[limitIndex + 1]) {
  options.limit = parseInt(args[limitIndex + 1]) || 50;
}

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🎮 IGDB Sync Script

Usage: node scripts/sync-igdb.js [options]

Options:
  --dry-run, -d          Dry run - show what would be synced without doing it
  --days N, -n N         Number of days back to check (default: 7)
  --limit N, -l N        Maximum games to process (default: 50)
  --help, -h             Show this help

Examples:
  node scripts/sync-igdb.js                    # Sync last 7 days, up to 50 games
  node scripts/sync-igdb.js --dry-run          # Test run without adding to database
  node scripts/sync-igdb.js --days 14 --limit 100  # Last 14 days, up to 100 games

Make sure to run 'netlify dev' first so the IGDB function is available!
`);
  process.exit(0);
}

// Main execution
async function main() {
  console.log('🎮 IGDB Sync Script Starting...\n');
  
  if (options.dryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made to the database\n');
  }

  try {
    const syncService = new NodeIGDBSyncService();
    const result = await syncService.syncNewGames(options);
    
    if (result.success) {
      console.log('\n✅ Sync completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Sync completed with errors');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Sync failed:', error.message);
    process.exit(1);
  }
}

// Check if netlify dev is running
async function checkNetlifyDev() {
  try {
    const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchTerm: 'test', limit: 1 })
    });
    return response.ok || response.status === 400; // 400 is ok, means function is running
  } catch (error) {
    return false;
  }
}

// Pre-flight checks
async function preflightChecks() {
  console.log('🔍 Running pre-flight checks...\n');
  
  // Check if netlify dev is running
  const netlifyRunning = await checkNetlifyDev();
  if (!netlifyRunning) {
    console.error('❌ Netlify dev server is not running on localhost:8888');
    console.error('   Please run "netlify dev" first to make IGDB functions available');
    process.exit(1);
  }
  console.log('✅ Netlify dev server is running');
  
  // Test Supabase connection with simple query
  try {
    console.log('   Testing Supabase connection...');
    
    // Try a simple table existence check first
    const { data, error } = await supabase
      .from('game')
      .select('igdb_id')
      .limit(1);
    
    if (error) {
      // If 'game' table doesn't exist, suggest table names
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.error('❌ Table "game" does not exist in your database');
        console.error('');
        console.error('Available options:');
        console.error('1. Create the "game" table in your Supabase database');
        console.error('2. Or modify the script to use your existing table name');
        console.error('');
        console.error('Common table names: games, Game, GAME');
        process.exit(1);
      }
      throw error;
    }
    
    console.log('✅ Supabase connection working');
    console.log(`   Database has ${data ? 'data' : 'no data'} in game table`);
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    console.error('   This could be due to:');
    console.error('   - Network timeout');
    console.error('   - Wrong database URL/key');
    console.error('   - Database not accessible');
    console.error('   - Table permissions');
    process.exit(1);
  }
  
  console.log('');
}

// Run the script
preflightChecks().then(main).catch(error => {
  console.error('💥 Script failed:', error.message);
  process.exit(1);
});