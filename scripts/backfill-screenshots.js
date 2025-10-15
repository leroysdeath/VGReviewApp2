#!/usr/bin/env node

/**
 * IGDB Screenshot Backfill Script
 *
 * Backfills screenshot data for existing games in the database
 * by fetching from IGDB API and updating the screenshots column.
 *
 * Usage: node scripts/backfill-screenshots.js [options]
 *
 * Features:
 * - Batch processing with configurable limits
 * - Dry run mode for testing
 * - Resume capability (tracks progress)
 * - Rate limiting to avoid API throttling
 * - Comprehensive error handling and logging
 * - Progress tracking and statistics
 */

import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Make fetch global for consistency
global.fetch = fetch;

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env file');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false },
  global: { headers: { 'X-Supabase-Timeout': '30' } }
});

// Progress tracking file
const PROGRESS_FILE = path.join(process.cwd(), '.screenshot-backfill-progress.json');

/**
 * Transform IGDB screenshot objects to full URLs
 * IGDB returns: { id: 123, url: "//images.igdb.com/igdb/image/upload/t_thumb/abc.jpg" }
 * We need: "https://images.igdb.com/igdb/image/upload/t_screenshot_big/abc.jpg"
 */
function transformScreenshotUrls(igdbScreenshots) {
  if (!igdbScreenshots || !Array.isArray(igdbScreenshots)) {
    return [];
  }

  return igdbScreenshots
    .map(screenshot => {
      if (!screenshot.url) return null;

      // Extract image_id from URL (everything after last /)
      const urlParts = screenshot.url.split('/');
      const imageFile = urlParts[urlParts.length - 1]; // e.g., "abc.jpg"
      const imageId = imageFile.replace('.jpg', ''); // e.g., "abc"

      // Construct high-quality screenshot URL
      return `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${imageId}.jpg`;
    })
    .filter(url => url !== null);
}

/**
 * Fetch screenshots from IGDB for a batch of game IDs
 */
async function fetchScreenshotsFromIGDB(igdbIds) {
  try {
    if (igdbIds.length === 0) return [];

    // Build IGDB query for multiple games
    const idsString = igdbIds.join(',');
    const requestBody = `fields id, screenshots.url; where id = (${idsString}); limit ${igdbIds.length};`;

    const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isBulkRequest: true,
        endpoint: 'games',
        requestBody: requestBody
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

/**
 * Update game screenshots in database
 */
async function updateGameScreenshots(gameId, igdbId, screenshots) {
  try {
    const { error } = await supabase
      .from('game')
      .update({ screenshots: screenshots })
      .eq('id', gameId);

    if (error) {
      console.error(`      ❌ Database error for game ${igdbId}:`, error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`      ❌ Error updating game ${igdbId}:`, error.message);
    return false;
  }
}

/**
 * Load progress from file
 */
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('⚠️  Could not load progress file, starting fresh');
  }
  return { lastProcessedId: 0, totalProcessed: 0, totalUpdated: 0 };
}

/**
 * Save progress to file
 */
function saveProgress(progress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.error('❌ Could not save progress:', error.message);
  }
}

/**
 * Main backfill function
 */
async function backfillScreenshots(options = {}) {
  const {
    batchSize = 50,      // Process this many games per batch
    limit = null,        // Total games to process (null = all)
    dryRun = false,      // If true, don't update database
    resume = true,       // Resume from last checkpoint
    delayMs = 100        // Delay between batches (ms)
  } = options;

  console.log(`🎮 IGDB Screenshot Backfill Starting...`);
  console.log(`📊 Batch size: ${batchSize}`);
  console.log(`🎯 Limit: ${limit || 'All games'}`);
  console.log(`🧪 Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log(`♻️  Resume: ${resume ? 'YES' : 'NO'}\n`);

  // Load progress if resuming
  let progress = resume ? loadProgress() : { lastProcessedId: 0, totalProcessed: 0, totalUpdated: 0 };
  console.log(`📍 Starting from game ID: ${progress.lastProcessedId}`);
  console.log(`📈 Already processed: ${progress.totalProcessed} games\n`);

  const stats = {
    totalChecked: 0,
    totalWithScreenshots: 0,
    totalUpdated: 0,
    totalSkipped: 0,
    totalErrors: 0,
    errors: []
  };

  try {
    let hasMore = true;
    let processedCount = 0;

    while (hasMore) {
      // Check if we've hit the limit
      if (limit && processedCount >= limit) {
        console.log(`✅ Reached processing limit of ${limit} games`);
        break;
      }

      // Fetch batch of games
      console.log(`📦 Fetching batch starting from ID ${progress.lastProcessedId}...`);

      const { data: games, error: fetchError } = await supabase
        .from('game')
        .select('id, igdb_id, name, screenshots')
        .gt('id', progress.lastProcessedId)
        .not('igdb_id', 'is', null) // Only games with IGDB IDs
        .order('id', { ascending: true })
        .limit(batchSize);

      if (fetchError) {
        throw new Error(`Failed to fetch games: ${fetchError.message}`);
      }

      if (!games || games.length === 0) {
        console.log('✅ No more games to process');
        hasMore = false;
        break;
      }

      console.log(`   Found ${games.length} games in batch`);
      stats.totalChecked += games.length;

      // Filter games that need screenshot updates
      const gamesToUpdate = games.filter(game => {
        // Skip if already has screenshots (unless you want to refresh)
        if (game.screenshots && game.screenshots.length > 0) {
          stats.totalSkipped++;
          return false;
        }
        return true;
      });

      console.log(`   📸 ${gamesToUpdate.length} games need screenshot data`);

      if (gamesToUpdate.length > 0) {
        // Fetch screenshots from IGDB
        const igdbIds = gamesToUpdate.map(g => g.igdb_id);
        console.log(`   🔍 Fetching screenshots from IGDB for ${igdbIds.length} games...`);

        try {
          const igdbGames = await fetchScreenshotsFromIGDB(igdbIds);
          console.log(`   ✅ Received data for ${igdbGames.length} games from IGDB`);

          // Create a map for quick lookup
          const screenshotMap = new Map();
          igdbGames.forEach(igdbGame => {
            if (igdbGame.screenshots && igdbGame.screenshots.length > 0) {
              const urls = transformScreenshotUrls(igdbGame.screenshots);
              if (urls.length > 0) {
                screenshotMap.set(igdbGame.id, urls);
              }
            }
          });

          console.log(`   📊 ${screenshotMap.size} games have screenshots available`);
          stats.totalWithScreenshots += screenshotMap.size;

          // Update database
          if (!dryRun && screenshotMap.size > 0) {
            console.log(`   💾 Updating database...`);

            for (const game of gamesToUpdate) {
              const screenshots = screenshotMap.get(game.igdb_id);

              if (screenshots) {
                const success = await updateGameScreenshots(game.id, game.igdb_id, screenshots);
                if (success) {
                  stats.totalUpdated++;
                  console.log(`      ✅ ${game.name}: ${screenshots.length} screenshots`);
                } else {
                  stats.totalErrors++;
                  stats.errors.push(`Failed to update ${game.name} (ID: ${game.igdb_id})`);
                }
              }
            }
          } else if (dryRun && screenshotMap.size > 0) {
            console.log(`   🧪 DRY RUN: Would update ${screenshotMap.size} games`);
            screenshotMap.forEach((urls, igdbId) => {
              const game = gamesToUpdate.find(g => g.igdb_id === igdbId);
              console.log(`      ${game?.name || igdbId}: ${urls.length} screenshots`);
            });
            stats.totalUpdated += screenshotMap.size;
          }

        } catch (error) {
          console.error(`   ❌ Error processing batch: ${error.message}`);
          stats.totalErrors += gamesToUpdate.length;
          stats.errors.push(`Batch error: ${error.message}`);
        }
      }

      // Update progress
      progress.lastProcessedId = games[games.length - 1].id;
      progress.totalProcessed += games.length;
      progress.totalUpdated = stats.totalUpdated;

      if (!dryRun) {
        saveProgress(progress);
      }

      processedCount += games.length;

      // Print progress
      console.log(`   📈 Progress: ${progress.totalProcessed} total, ${stats.totalUpdated} updated, ${stats.totalSkipped} skipped\n`);

      // Rate limiting delay
      if (hasMore && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Backfill Complete!');
    console.log('='.repeat(60));
    console.log(`📊 Total games checked: ${stats.totalChecked}`);
    console.log(`📸 Games with screenshots: ${stats.totalWithScreenshots}`);
    console.log(`✅ Games updated: ${stats.totalUpdated}`);
    console.log(`⏭️  Games skipped (already had screenshots): ${stats.totalSkipped}`);
    console.log(`❌ Errors: ${stats.totalErrors}`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Error details:');
      stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
      if (stats.errors.length > 10) {
        console.log(`   ... and ${stats.errors.length - 10} more errors`);
      }
    }

    // Clean up progress file on successful completion
    if (!dryRun && hasMore === false) {
      try {
        if (fs.existsSync(PROGRESS_FILE)) {
          fs.unlinkSync(PROGRESS_FILE);
          console.log('\n✨ Progress file cleaned up (backfill complete)');
        }
      } catch (error) {
        console.warn('⚠️  Could not delete progress file:', error.message);
      }
    }

    return stats;

  } catch (error) {
    console.error('\n💥 Backfill failed:', error.message);
    stats.errors.push(`Fatal error: ${error.message}`);
    return stats;
  }
}

// CLI argument parsing
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🎮 IGDB Screenshot Backfill Script

Usage: node scripts/backfill-screenshots.js [options]

Options:
  --dry-run, -d          Dry run - show what would be updated without doing it
  --batch-size N, -b N   Number of games per batch (default: 50)
  --limit N, -l N        Max total games to process (default: unlimited)
  --no-resume            Don't resume from last checkpoint, start fresh
  --delay N              Delay between batches in ms (default: 100)
  --help, -h             Show this help

Examples:
  node scripts/backfill-screenshots.js                           # Process all games
  node scripts/backfill-screenshots.js --dry-run                 # Test run
  node scripts/backfill-screenshots.js --limit 100               # Process first 100 games
  node scripts/backfill-screenshots.js --batch-size 100 --delay 200   # Larger batches, slower

Prerequisites:
  - Run 'netlify dev' in another terminal (for IGDB API access)
  - Run the database migration first: Apply 20251015_add_screenshots_column.sql
  - Ensure .env file has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

Resume Capability:
  The script saves progress to .screenshot-backfill-progress.json
  If interrupted, just run again and it will resume from last checkpoint
  Use --no-resume to start from the beginning
`);
  process.exit(0);
}

const options = {
  dryRun: args.includes('--dry-run') || args.includes('-d'),
  resume: !args.includes('--no-resume'),
  batchSize: 50,
  limit: null,
  delayMs: 100
};

// Parse batch size
const batchIndex = args.findIndex(arg => arg === '--batch-size' || arg === '-b');
if (batchIndex >= 0 && args[batchIndex + 1]) {
  options.batchSize = parseInt(args[batchIndex + 1]) || 50;
}

// Parse limit
const limitIndex = args.findIndex(arg => arg === '--limit' || arg === '-l');
if (limitIndex >= 0 && args[limitIndex + 1]) {
  options.limit = parseInt(args[limitIndex + 1]) || null;
}

// Parse delay
const delayIndex = args.findIndex(arg => arg === '--delay');
if (delayIndex >= 0 && args[delayIndex + 1]) {
  options.delayMs = parseInt(args[delayIndex + 1]) || 100;
}

// Pre-flight checks
async function preflightChecks() {
  console.log('🔍 Running pre-flight checks...\n');

  // Check if netlify dev is running
  try {
    const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchTerm: 'test', limit: 1 })
    });

    if (!response.ok && response.status !== 400) {
      throw new Error('Netlify function not responding');
    }
    console.log('✅ Netlify dev server is running');
  } catch (error) {
    console.error('❌ Netlify dev server is not running on localhost:8888');
    console.error('   Please run "netlify dev" first to make IGDB functions available\n');
    process.exit(1);
  }

  // Test Supabase connection
  try {
    const { data, error } = await supabase
      .from('game')
      .select('id, igdb_id, screenshots')
      .limit(1);

    if (error) throw error;
    console.log('✅ Supabase connection working');

    // Check if screenshots column exists
    if (data && data.length > 0 && !('screenshots' in data[0])) {
      console.error('❌ screenshots column does not exist in game table');
      console.error('   Please run migration: 20251015_add_screenshots_column.sql\n');
      process.exit(1);
    }
    console.log('✅ screenshots column exists in game table');

  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    console.error('   Check your .env file and database connection\n');
    process.exit(1);
  }

  console.log('');
}

// Run the script
async function main() {
  await preflightChecks();
  const stats = await backfillScreenshots(options);

  if (stats.totalErrors > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(error => {
  console.error('💥 Script failed:', error.message);
  process.exit(1);
});
