#!/usr/bin/env node

/**
 * Backfill Release Status Script
 *
 * Fetches release_dates from IGDB for existing games and updates their release_status.
 * This script processes games in batches to avoid overwhelming the API and database.
 *
 * Usage:
 *   node scripts/backfill-release-status.js [options]
 *
 * Options:
 *   --batch-size <number>  Number of games to process per batch (default: 50)
 *   --limit <number>       Total number of games to process (default: all)
 *   --offset <number>      Skip first N games (default: 0)
 *   --dry-run              Show what would be updated without making changes
 *   --only-igdb            Only process games with igdb_id
 *
 * Examples:
 *   node scripts/backfill-release-status.js --dry-run
 *   node scripts/backfill-release-status.js --batch-size 100 --limit 1000
 *   node scripts/backfill-release-status.js --only-igdb
 */

// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Make fetch global
global.fetch = fetch;

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Get release status from IGDB game data
 * @param {Object} igdbGame - Game object from IGDB API
 * @returns {'released' | 'unreleased' | null}
 */
function getReleaseStatus(igdbGame) {
  // No release_dates data -> unknown (NULL)
  if (!igdbGame.release_dates || igdbGame.release_dates.length === 0) {
    return null;
  }

  // Check if ANY release is released/in-development (0, 1, 2, 3)
  const hasRelease = igdbGame.release_dates.some(rd =>
    rd.status === 0 || rd.status === 1 || rd.status === 2 || rd.status === 3
  );

  return hasRelease ? 'released' : 'unreleased';
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    batchSize: 50,
    limit: null,
    offset: 0,
    dryRun: false,
    onlyIgdb: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--batch-size':
        options.batchSize = parseInt(args[++i], 10);
        break;
      case '--limit':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--offset':
        options.offset = parseInt(args[++i], 10);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--only-igdb':
        options.onlyIgdb = true;
        break;
      case '--help':
        console.log(`
Backfill Release Status Script

Usage:
  node scripts/backfill-release-status.js [options]

Options:
  --batch-size <number>  Number of games to process per batch (default: 50)
  --limit <number>       Total number of games to process (default: all)
  --offset <number>      Skip first N games (default: 0)
  --dry-run              Show what would be updated without making changes
  --only-igdb            Only process games with igdb_id
  --help                 Show this help message

Examples:
  node scripts/backfill-release-status.js --dry-run
  node scripts/backfill-release-status.js --batch-size 100 --limit 1000
  node scripts/backfill-release-status.js --only-igdb
        `);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Fetch games from database that need backfilling
 * Uses pagination to handle large datasets (185K+ games)
 */
async function fetchGamesToBackfill(options) {
  console.log('📊 Fetching games from database...');

  const PAGE_SIZE = 1000; // Supabase default limit
  let allGames = [];
  let currentPage = 0;
  let hasMore = true;

  // Calculate starting page based on offset
  const startPage = Math.floor(options.offset / PAGE_SIZE);
  currentPage = startPage;

  while (hasMore) {
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('game')
      .select('id, game_id, igdb_id, name, release_status', { count: 'exact' })
      .order('id', { ascending: true })
      .range(from, to);

    // Only get games with igdb_id if specified
    if (options.onlyIgdb) {
      query = query.not('igdb_id', 'is', null);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching games:', error);
      throw error;
    }

    if (data && data.length > 0) {
      allGames = allGames.concat(data);
      console.log(`   📄 Fetched page ${currentPage + 1}: ${data.length} games (total so far: ${allGames.length})`);

      // Check if we've reached the limit
      if (options.limit && allGames.length >= options.limit) {
        allGames = allGames.slice(0, options.limit);
        hasMore = false;
      } else if (data.length < PAGE_SIZE || allGames.length >= (count || 0)) {
        hasMore = false; // No more pages
      } else {
        currentPage++;
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`   ✅ Found ${allGames.length} games to process`);

  // Statistics
  const withIgdbId = allGames.filter(g => g.igdb_id).length;
  const withoutIgdbId = allGames.length - withIgdbId;
  const alreadyHasStatus = allGames.filter(g => g.release_status).length;

  console.log(`   📈 Statistics:`);
  console.log(`      - With IGDB ID: ${withIgdbId}`);
  console.log(`      - Without IGDB ID: ${withoutIgdbId}`);
  console.log(`      - Already has status: ${alreadyHasStatus}`);
  console.log(`      - Need backfill: ${allGames.length - alreadyHasStatus}`);

  return allGames;
}

/**
 * Fetch release_dates from IGDB for a batch of games
 */
async function fetchIGDBData(igdbIds) {
  if (igdbIds.length === 0) {
    return {};
  }

  console.log(`   🔍 Fetching release data from IGDB for ${igdbIds.length} games...`);

  try {
    const query = `
      fields id, name, release_dates.platform, release_dates.status;
      where id = (${igdbIds.join(',')});
      limit ${igdbIds.length};
    `;

    const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isBulkRequest: true,
        endpoint: 'games',
        requestBody: query
      })
    });

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'IGDB API request failed');
    }

    // Create a map of igdb_id -> game data
    const gameMap = {};
    (data.games || []).forEach(game => {
      gameMap[game.id] = game;
    });

    console.log(`   ✅ Fetched data for ${Object.keys(gameMap).length} games from IGDB`);

    return gameMap;

  } catch (error) {
    console.error('   ❌ Error fetching from IGDB:', error.message);
    return {};
  }
}

/**
 * Update games in database with release_status
 */
async function updateGamesInDatabase(updates, dryRun) {
  if (updates.length === 0) {
    console.log('   ℹ️  No updates needed');
    return { success: 0, failed: 0, skipped: 0 };
  }

  console.log(`   💾 ${dryRun ? '[DRY RUN]' : 'Updating'} ${updates.length} games...`);

  if (dryRun) {
    // Just show what would be updated
    updates.slice(0, 10).forEach(u => {
      console.log(`      - ${u.name} (${u.game_id}): release_status = ${u.release_status}`);
    });
    if (updates.length > 10) {
      console.log(`      ... and ${updates.length - 10} more`);
    }
    return { success: updates.length, failed: 0, skipped: 0 };
  }

  let success = 0;
  let failed = 0;

  // Update in batches of 10 to avoid overwhelming the database
  const updateBatchSize = 10;
  for (let i = 0; i < updates.length; i += updateBatchSize) {
    const batch = updates.slice(i, i + updateBatchSize);

    for (const update of batch) {
      const { error } = await supabase
        .from('game')
        .update({ release_status: update.release_status })
        .eq('id', update.id);

      if (error) {
        console.error(`      ❌ Failed to update ${update.name}:`, error.message);
        failed++;
      } else {
        success++;
      }
    }

    // Progress indicator
    if ((i + updateBatchSize) % 50 === 0) {
      console.log(`      ⏳ Progress: ${Math.min(i + updateBatchSize, updates.length)}/${updates.length}`);
    }
  }

  return { success, failed, skipped: 0 };
}

/**
 * Process a batch of games
 */
async function processBatch(games, dryRun) {
  // Separate games with and without IGDB IDs
  const withIgdbId = games.filter(g => g.igdb_id);
  const withoutIgdbId = games.filter(g => !g.igdb_id);

  const updates = [];

  // Process games WITH IGDB IDs - fetch from IGDB
  if (withIgdbId.length > 0) {
    const igdbIds = withIgdbId.map(g => g.igdb_id);
    const igdbData = await fetchIGDBData(igdbIds);

    for (const game of withIgdbId) {
      const igdbGame = igdbData[game.igdb_id];

      if (igdbGame) {
        const releaseStatus = getReleaseStatus(igdbGame);

        // Only update if status changed or was null
        if (releaseStatus !== game.release_status) {
          updates.push({
            id: game.id,
            game_id: game.game_id,
            name: game.name,
            release_status: releaseStatus
          });
        }
      }
    }
  }

  // Process games WITHOUT IGDB IDs - set to null (unknown)
  for (const game of withoutIgdbId) {
    if (game.release_status !== null) {
      updates.push({
        id: game.id,
        game_id: game.game_id,
        name: game.name,
        release_status: null
      });
    }
  }

  // Update database
  const results = await updateGamesInDatabase(updates, dryRun);

  return results;
}

/**
 * Main backfill function
 */
async function backfillReleaseStatus() {
  const options = parseArgs();

  console.log('\n🚀 Release Status Backfill Script');
  console.log('=====================================');
  console.log(`Configuration:`);
  console.log(`  - Batch size: ${options.batchSize}`);
  console.log(`  - Limit: ${options.limit || 'all games'}`);
  console.log(`  - Offset: ${options.offset}`);
  console.log(`  - Dry run: ${options.dryRun ? 'YES' : 'NO'}`);
  console.log(`  - Only IGDB games: ${options.onlyIgdb ? 'YES' : 'NO'}`);
  console.log('');

  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made to the database');
    console.log('');
  }

  try {
    // Fetch games to process
    const games = await fetchGamesToBackfill(options);

    if (games.length === 0) {
      console.log('✅ No games to process');
      return;
    }

    console.log('');
    console.log('📝 Processing games in batches...');
    console.log('');

    // Process in batches
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (let i = 0; i < games.length; i += options.batchSize) {
      const batch = games.slice(i, i + options.batchSize);
      const batchNum = Math.floor(i / options.batchSize) + 1;
      const totalBatches = Math.ceil(games.length / options.batchSize);

      console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} games)`);

      const results = await processBatch(batch, options.dryRun);

      totalSuccess += results.success;
      totalFailed += results.failed;
      totalSkipped += results.skipped;

      console.log(`   ✅ Updated: ${results.success}, ❌ Failed: ${results.failed}`);
      console.log('');

      // Rate limiting - wait 1 second between batches
      if (i + options.batchSize < games.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Final summary
    console.log('=====================================');
    console.log('✅ Backfill Complete!');
    console.log('');
    console.log('📊 Final Statistics:');
    console.log(`   - Total processed: ${games.length}`);
    console.log(`   - Successfully updated: ${totalSuccess}`);
    console.log(`   - Failed: ${totalFailed}`);
    console.log(`   - Skipped (no change): ${totalSkipped}`);
    console.log('');

    if (options.dryRun) {
      console.log('ℹ️  This was a dry run. Run without --dry-run to apply changes.');
    } else {
      console.log('✅ Database updated successfully!');
    }

  } catch (error) {
    console.error('');
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillReleaseStatus();
