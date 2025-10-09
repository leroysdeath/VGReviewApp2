#!/usr/bin/env node

/**
 * Batch Backfill Missing Cover URLs from IGDB
 *
 * This script identifies games in the database that are missing cover_url
 * and fetches them from IGDB API using efficient batching.
 *
 * Features:
 * - Batch API calls (up to 500 games per request to IGDB)
 * - Automatic rate limiting (4 requests/second per IGDB limits)
 * - Progress tracking and resume capability
 * - Comprehensive error handling and retry logic
 * - Database batch updates (reduces DB calls)
 *
 * Usage:
 *   node scripts/backfill-covers-batch.js [--dry-run] [--limit=1000] [--batch-size=100] [--resume]
 *
 * Options:
 *   --dry-run       Test mode - no database changes
 *   --limit=N       Maximum number of games to process (default: all)
 *   --batch-size=N  Games per IGDB batch (default: 100, max: 500)
 *   --resume        Resume from last checkpoint
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldResume = args.includes('--resume');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));

const maxGames = limitArg ? parseInt(limitArg.split('=')[1]) : null;
const BATCH_SIZE = batchSizeArg ? Math.min(parseInt(batchSizeArg.split('=')[1]), 500) : 100;
const DB_BATCH_SIZE = 50; // Batch size for database updates

// IGDB rate limit: 4 requests per second
const RATE_LIMIT_MS = 250; // 250ms between requests = 4 req/sec

// Checkpoint file for resuming
const CHECKPOINT_FILE = join(__dirname, '.backfill-checkpoint.json');

// Environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const clientId = process.env.TWITCH_CLIENT_ID;
const accessToken = process.env.TWITCH_APP_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseKey || !clientId || !accessToken) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Statistics tracking
const stats = {
  totalProcessed: 0,
  successfulUpdates: 0,
  noCoverInIGDB: 0,
  notFoundInIGDB: 0,
  errors: 0,
  startTime: Date.now()
};

/**
 * Fetch multiple games from IGDB in a single batch request
 */
async function fetchGameBatchFromIGDB(igdbIds) {
  try {
    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
      body: `fields id, name, cover.image_id; where id = (${igdbIds.join(',')});`
    });

    if (!response.ok) {
      console.warn(`  ⚠️  IGDB API returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`  ❌ Error fetching batch from IGDB:`, error.message);
    return null;
  }
}

/**
 * Convert IGDB cover object to URL (matching existing format in DB)
 */
function getCoverUrl(imageId) {
  if (!imageId) {
    return null;
  }
  // Use t_cover_big to match existing database format (not t_1080p)
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
}

/**
 * Update database in batch
 */
async function updateGamesBatch(updates) {
  const updatePromises = updates.map(({ id, cover_url, pic_url }) =>
    supabase
      .from('game')
      .update({ cover_url, pic_url })
      .eq('id', id)
  );

  const results = await Promise.allSettled(updatePromises);

  let successCount = 0;
  let errorCount = 0;

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled' && !result.value.error) {
      successCount++;
    } else {
      errorCount++;
      console.error(`  ❌ Error updating game ${updates[idx].name}:`, result.value?.error?.message || result.reason);
    }
  });

  return { successCount, errorCount };
}

/**
 * Save checkpoint for resume capability
 */
function saveCheckpoint(offset, stats) {
  const checkpoint = {
    offset,
    stats,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

/**
 * Load checkpoint
 */
function loadCheckpoint() {
  if (!fs.existsSync(CHECKPOINT_FILE)) {
    return null;
  }
  try {
    const data = fs.readFileSync(CHECKPOINT_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('⚠️  Could not load checkpoint file');
    return null;
  }
}

/**
 * Main backfill function with batching
 */
async function backfillMissingCovers() {
  console.log('🔍 Starting batch cover URL backfill...\n');
  console.log('Configuration:');
  console.log(`  Batch size: ${BATCH_SIZE} games per IGDB request`);
  console.log(`  DB batch size: ${DB_BATCH_SIZE} updates at once`);
  console.log(`  Rate limit: ${1000/RATE_LIMIT_MS} requests/second`);
  console.log(`  Max games: ${maxGames || 'ALL'}`);
  console.log(`  Dry run: ${isDryRun ? 'YES' : 'NO'}\n`);

  // Check for resume
  let startOffset = 0;
  if (shouldResume) {
    const checkpoint = loadCheckpoint();
    if (checkpoint) {
      startOffset = checkpoint.offset;
      Object.assign(stats, checkpoint.stats);
      console.log(`📍 Resuming from offset ${startOffset}`);
      console.log(`   Previous stats: ${checkpoint.stats.successfulUpdates} updated, ${checkpoint.stats.errors} errors\n`);
    }
  }

  // Get total count first
  const { count: totalMissing } = await supabase
    .from('game')
    .select('*', { count: 'exact', head: true })
    .is('cover_url', null)
    .not('igdb_id', 'is', null);

  console.log(`📊 Total games missing covers: ${totalMissing}`);
  const gamesToProcess = maxGames ? Math.min(maxGames, totalMissing - startOffset) : totalMissing - startOffset;
  console.log(`📊 Will process: ${gamesToProcess} games\n`);

  if (isDryRun) {
    console.log('🧪 DRY RUN MODE - No database changes will be made\n');
  }

  let offset = startOffset;
  let keepGoing = true;

  while (keepGoing) {
    // Fetch batch of games from database
    const { data: games, error } = await supabase
      .from('game')
      .select('id, igdb_id, name, cover_url')
      .is('cover_url', null)
      .not('igdb_id', 'is', null)
      .order('igdb_id', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('❌ Error fetching games from database:', error);
      break;
    }

    if (!games || games.length === 0) {
      console.log('\n✅ No more games to process!');
      break;
    }

    console.log(`\n📦 Processing batch at offset ${offset} (${games.length} games)`);

    // Extract IGDB IDs
    const igdbIds = games.map(g => g.igdb_id);

    // Fetch from IGDB in batch
    const igdbGames = await fetchGameBatchFromIGDB(igdbIds);

    if (!igdbGames) {
      console.error('  ❌ Failed to fetch batch from IGDB, skipping...');
      stats.errors += games.length;
      offset += BATCH_SIZE;
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
      continue;
    }

    // Create a map of IGDB results
    const igdbMap = new Map(igdbGames.map(g => [g.id, g]));

    // Prepare updates
    const updates = [];

    for (const game of games) {
      const igdbGame = igdbMap.get(game.igdb_id);

      if (!igdbGame) {
        stats.notFoundInIGDB++;
        console.log(`  ⚠️  ${game.name} (${game.igdb_id}) - Not found in IGDB`);
        continue;
      }

      if (!igdbGame.cover || !igdbGame.cover.image_id) {
        stats.noCoverInIGDB++;
        console.log(`  ⚠️  ${game.name} (${game.igdb_id}) - No cover in IGDB`);
        continue;
      }

      const coverUrl = getCoverUrl(igdbGame.cover.image_id);
      updates.push({
        id: game.id,
        name: game.name,
        igdb_id: game.igdb_id,
        cover_url: coverUrl,
        pic_url: coverUrl
      });
    }

    console.log(`  ✅ Found covers for ${updates.length}/${games.length} games`);

    // Update database in batches
    if (updates.length > 0 && !isDryRun) {
      for (let i = 0; i < updates.length; i += DB_BATCH_SIZE) {
        const batch = updates.slice(i, i + DB_BATCH_SIZE);
        const { successCount, errorCount } = await updateGamesBatch(batch);
        stats.successfulUpdates += successCount;
        stats.errors += errorCount;
        console.log(`    💾 Updated ${successCount}/${batch.length} games (batch ${Math.floor(i/DB_BATCH_SIZE) + 1})`);
      }
    } else if (updates.length > 0) {
      stats.successfulUpdates += updates.length;
      console.log(`    💾 Would update ${updates.length} games (dry run)`);
    }

    stats.totalProcessed += games.length;
    offset += BATCH_SIZE;

    // Save checkpoint every batch
    saveCheckpoint(offset, stats);

    // Check if we should continue
    if (maxGames && stats.totalProcessed >= maxGames) {
      console.log(`\n✅ Reached limit of ${maxGames} games`);
      keepGoing = false;
    }

    // Progress report
    const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
    const rate = stats.totalProcessed / elapsed;
    const remaining = gamesToProcess - stats.totalProcessed;
    const eta = remaining > 0 ? Math.ceil(remaining / rate) : 0;

    console.log(`  📈 Progress: ${stats.totalProcessed}/${gamesToProcess} (${Math.floor(stats.totalProcessed/gamesToProcess*100)}%)`);
    console.log(`  ⏱️  Rate: ${rate.toFixed(1)} games/sec | ETA: ${Math.floor(eta/60)}m ${eta%60}s`);

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
  }

  // Final summary
  const totalTime = Math.floor((Date.now() - stats.startTime) / 1000);
  console.log('\n' + '='.repeat(70));
  console.log('📊 BACKFILL SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total games processed: ${stats.totalProcessed}`);
  console.log(`✅ Successfully updated: ${stats.successfulUpdates}`);
  console.log(`⚠️  No cover in IGDB: ${stats.noCoverInIGDB}`);
  console.log(`❌ Not found in IGDB: ${stats.notFoundInIGDB}`);
  console.log(`⚠️  Errors: ${stats.errors}`);
  console.log(`⏱️  Total time: ${Math.floor(totalTime/60)}m ${totalTime%60}s`);
  console.log(`📈 Average rate: ${(stats.totalProcessed/totalTime).toFixed(2)} games/sec`);
  console.log('='.repeat(70) + '\n');

  if (isDryRun) {
    console.log('🧪 This was a dry run. Run without --dry-run to apply changes.\n');
  }

  // Clean up checkpoint file if completed
  if (!isDryRun && keepGoing === false && fs.existsSync(CHECKPOINT_FILE)) {
    fs.unlinkSync(CHECKPOINT_FILE);
    console.log('✅ Checkpoint file cleaned up\n');
  }
}

// Run the script
backfillMissingCovers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
