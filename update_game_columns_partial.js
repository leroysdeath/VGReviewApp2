#!/usr/bin/env node

/**
 * Partial Database Update Script for Game Table
 * Updates ONLY specific columns from IGDB API data
 * Preserves all other existing column values
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import readline from 'readline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const config = {
  // IGDB API credentials (set these in .env file)
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
  TWITCH_APP_ACCESS_TOKEN: process.env.TWITCH_APP_ACCESS_TOKEN,
  
  // Supabase credentials
  SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  
  // IGDB API endpoint
  IGDB_API_URL: 'https://api.igdb.com/v4',
  
  // Dry run mode (set to true to preview without updating)
  DRY_RUN: process.argv.includes('--dry-run')
};

// Games to update - using YOUR database IDs
const GAMES_TO_UPDATE = [
  { id: 55056, name: "Age of Empires II: Definitive Edition" },
  { id: 4152, name: "Skies of Arcadia Legends" },
  { id: 305152, name: "Clair Obscur: Expedition 33" },
  { id: 116, name: "Star Wars: Knights of the Old Republic" },
  { id: 338616, name: "Mario Kart Tour: Mario Bros. Tour" },
  { id: 45142, name: "The Legend of Zelda: Ocarina of Time - Master Quest" },
  { id: 222095, name: "Super Mario Bros." }
];

// Columns to update (ONLY these will be modified)
const COLUMNS_TO_UPDATE = [
  'summary',
  'slug',
  'cover_url',
  'screenshots',
  'developer',
  'publisher',
  'platforms',
  'igdb_link'
];

// Initialize Supabase client
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

// Helper: Create readline interface for user input
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Helper: Ask for user confirmation
async function getUserConfirmation(message) {
  const rl = createReadlineInterface();
  
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// Helper: Generate slug from game name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper: Make IGDB API request
async function igdbRequest(endpoint, body) {
  try {
    const response = await fetch(`${config.IGDB_API_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Client-ID': config.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${config.TWITCH_APP_ACCESS_TOKEN}`,
        'Content-Type': 'text/plain'
      },
      body: body
    });

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ IGDB API request failed: ${error.message}`);
    return null;
  }
}

// Search for game in IGDB by name
async function searchGameInIGDB(gameName) {
  console.log(`  🔍 Searching IGDB for: "${gameName}"`);
  
  const query = `
    search "${gameName}";
    fields 
      name,
      slug,
      summary,
      cover.url,
      screenshots.url,
      involved_companies.company.name,
      involved_companies.developer,
      involved_companies.publisher,
      platforms.name,
      url;
    limit 1;
  `;

  const results = await igdbRequest('games', query);
  
  if (!results || results.length === 0) {
    console.log(`  ⚠️ No results found in IGDB for "${gameName}"`);
    return null;
  }

  return results[0];
}

// Transform IGDB data to database format
function transformIGDBData(igdbGame) {
  const data = {
    summary: null,
    slug: null,
    cover_url: null,
    screenshots: [],
    developer: null,
    publisher: null,
    platforms: [],
    igdb_link: null
  };

  // Summary
  data.summary = igdbGame.summary || null;

  // Slug
  data.slug = igdbGame.slug || generateSlug(igdbGame.name);

  // Cover URL
  if (igdbGame.cover && igdbGame.cover.url) {
    data.cover_url = igdbGame.cover.url
      .replace('//images.igdb.com', 'https://images.igdb.com')
      .replace('t_thumb', 't_cover_big');
  }

  // Screenshots
  if (igdbGame.screenshots && Array.isArray(igdbGame.screenshots)) {
    data.screenshots = igdbGame.screenshots
      .map(s => s.url ? s.url
        .replace('//images.igdb.com', 'https://images.igdb.com')
        .replace('t_thumb', 't_screenshot_big') : null)
      .filter(Boolean)
      .slice(0, 5); // Limit to 5 screenshots
  }

  // Developer and Publisher
  if (igdbGame.involved_companies && Array.isArray(igdbGame.involved_companies)) {
    const developer = igdbGame.involved_companies.find(ic => ic.developer);
    const publisher = igdbGame.involved_companies.find(ic => ic.publisher);
    
    if (developer && developer.company) {
      data.developer = developer.company.name;
    }
    if (publisher && publisher.company) {
      data.publisher = publisher.company.name;
    }
  }

  // Platforms
  if (igdbGame.platforms && Array.isArray(igdbGame.platforms)) {
    data.platforms = igdbGame.platforms
      .map(p => p.name)
      .filter(Boolean);
  }

  // IGDB Link
  data.igdb_link = igdbGame.url || `https://www.igdb.com/games/${data.slug}`;

  return data;
}

// Update game in database (PARTIAL UPDATE - only specified columns)
async function updateGameInDatabase(gameId, updateData) {
  // Build the update object - ONLY include the 8 specified columns
  const updateObject = {
    summary: updateData.summary,
    slug: updateData.slug,
    cover_url: updateData.cover_url,
    screenshots: updateData.screenshots,
    developer: updateData.developer,
    publisher: updateData.publisher,
    platforms: updateData.platforms,
    igdb_link: updateData.igdb_link
  };

  if (config.DRY_RUN) {
    console.log(`  🔵 [DRY RUN] Would update game ID ${gameId} with:`);
    console.log(`     Summary: ${updateObject.summary ? updateObject.summary.substring(0, 50) + '...' : 'NULL'}`);
    console.log(`     Slug: ${updateObject.slug || 'NULL'}`);
    console.log(`     Cover URL: ${updateObject.cover_url ? 'SET' : 'NULL'}`);
    console.log(`     Screenshots: ${updateObject.screenshots.length} items`);
    console.log(`     Developer: ${updateObject.developer || 'NULL'}`);
    console.log(`     Publisher: ${updateObject.publisher || 'NULL'}`);
    console.log(`     Platforms: ${updateObject.platforms.join(', ') || 'NULL'}`);
    console.log(`     IGDB Link: ${updateObject.igdb_link || 'NULL'}`);
    return { success: true, dryRun: true };
  }

  try {
    // Execute PARTIAL UPDATE - only modifies the 8 specified columns
    const { data, error } = await supabase
      .from('game')
      .update(updateObject)
      .eq('id', gameId)
      .select('id, name'); // Only select minimal fields to confirm update

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error(`No game found with ID ${gameId}`);
    }

    console.log(`  ✅ Successfully updated game ID ${gameId}`);
    return { success: true, data: data[0] };

  } catch (error) {
    console.error(`  ❌ Failed to update game ID ${gameId}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Process a single game
async function processGame(game) {
  console.log(`\n📮 Processing: ${game.name} (ID: ${game.id})`);
  console.log('=' .repeat(60));

  try {
    // Search for game in IGDB
    const igdbGame = await searchGameInIGDB(game.name);
    
    if (!igdbGame) {
      console.log(`  ⏭️ Skipping - not found in IGDB`);
      return { 
        gameId: game.id, 
        gameName: game.name, 
        status: 'skipped', 
        reason: 'Not found in IGDB' 
      };
    }

    console.log(`  ✅ Found in IGDB: "${igdbGame.name}"`);

    // Transform IGDB data
    const updateData = transformIGDBData(igdbGame);
    
    // Update database
    const result = await updateGameInDatabase(game.id, updateData);
    
    return {
      gameId: game.id,
      gameName: game.name,
      status: result.success ? 'updated' : 'failed',
      error: result.error
    };

  } catch (error) {
    console.error(`  💥 Unexpected error: ${error.message}`);
    return {
      gameId: game.id,
      gameName: game.name,
      status: 'error',
      error: error.message
    };
  }
}

// Main execution
async function main() {
  console.log('🎮 Partial Game Update Script');
  console.log('📦 This script updates ONLY these columns:');
  COLUMNS_TO_UPDATE.forEach(col => console.log(`   • ${col}`));
  console.log('\n📋 Games to update:');
  GAMES_TO_UPDATE.forEach(g => console.log(`   • ${g.name} (ID: ${g.id})`));
  
  if (config.DRY_RUN) {
    console.log('\n🔵 DRY RUN MODE - No changes will be made to the database');
  }

  // Check configuration
  if (!config.TWITCH_CLIENT_ID || !config.TWITCH_APP_ACCESS_TOKEN) {
    console.error('\n❌ Error: Missing IGDB API credentials');
    console.error('Please set TWITCH_CLIENT_ID and TWITCH_APP_ACCESS_TOKEN in .env file');
    process.exit(1);
  }

  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    console.error('\n❌ Error: Missing Supabase credentials');
    console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
    process.exit(1);
  }

  // Get user confirmation
  const message = config.DRY_RUN 
    ? '\n⚡ Run in DRY RUN mode? (y/n): '
    : '\n⚠️  This will update 8 columns for 7 games. Continue? (y/n): ';
    
  const confirmed = await getUserConfirmation(message);
  
  if (!confirmed) {
    console.log('❌ Operation cancelled by user');
    process.exit(0);
  }

  console.log('\n🚀 Starting update process...\n');

  // Process results tracking
  const results = {
    updated: [],
    skipped: [],
    failed: [],
    errors: []
  };

  // Process each game
  for (const game of GAMES_TO_UPDATE) {
    const result = await processGame(game);
    
    switch (result.status) {
      case 'updated':
        results.updated.push(result);
        break;
      case 'skipped':
        results.skipped.push(result);
        break;
      case 'failed':
        results.failed.push(result);
        break;
      case 'error':
        results.errors.push(result);
        break;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 UPDATE SUMMARY');
  console.log('=' .repeat(60));

  if (config.DRY_RUN) {
    console.log('🔵 DRY RUN COMPLETED - No actual changes were made\n');
  }

  console.log(`✅ Successfully updated: ${results.updated.length} games`);
  if (results.updated.length > 0) {
    results.updated.forEach(r => console.log(`   • ${r.gameName} (ID: ${r.gameId})`));
  }

  if (results.skipped.length > 0) {
    console.log(`\n⏭️ Skipped: ${results.skipped.length} games`);
    results.skipped.forEach(r => console.log(`   • ${r.gameName}: ${r.reason}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length} games`);
    results.failed.forEach(r => console.log(`   • ${r.gameName}: ${r.error}`));
  }

  if (results.errors.length > 0) {
    console.log(`\n💥 Errors: ${results.errors.length} games`);
    results.errors.forEach(r => console.log(`   • ${r.gameName}: ${r.error}`));
  }

  console.log('\n✨ Script completed!');
  console.log(`📅 Finished at: ${new Date().toISOString()}`);
}

// Execute with error handling
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});