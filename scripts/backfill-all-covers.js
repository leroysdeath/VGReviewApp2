#!/usr/bin/env node

/**
 * Comprehensive backfill for ALL games missing pic_url
 *
 * Rate limits:
 * - IGDB: 4 requests/second max (we use 3/second to be safe)
 * - Database: Batch updates every 50 games
 *
 * Features:
 * - Automatic resume on rate limit errors
 * - Progress tracking
 * - Batch processing to respect DB limits
 * - Detailed logging
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const igdbEndpoint = 'http://localhost:8888/.netlify/functions/igdb-search';

// Rate limiting configuration
const REQUESTS_PER_SECOND = 3;
const DELAY_MS = Math.ceil(1000 / REQUESTS_PER_SECOND); // ~333ms between requests
const BATCH_SIZE = 100; // Process 100 games at a time
const RATE_LIMIT_COOLDOWN = 60000; // Wait 1 minute if we hit rate limits

let stats = {
  total: 0,
  processed: 0,
  success: 0,
  notFound: 0,
  noCover: 0,
  errors: 0,
  rateLimited: 0
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchGameCover(igdbId) {
  try {
    const response = await fetch(igdbEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'getById',
        gameId: igdbId
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        stats.rateLimited++;
        return { rateLimited: true };
      }
      return { error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const igdbGame = data.games?.[0];

    if (!igdbGame) {
      return { notFound: true };
    }

    if (!igdbGame.cover?.image_id) {
      return { noCover: true };
    }

    const coverUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big/${igdbGame.cover.image_id}.jpg`;
    return { coverUrl };

  } catch (err) {
    return { error: err.message };
  }
}

async function updateGameCover(gameId, coverUrl) {
  const { error } = await supabase
    .from('game')
    .update({
      pic_url: coverUrl,
      cover_url: coverUrl
    })
    .eq('id', gameId);

  return !error;
}

async function processBatch(games) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Processing batch of ${games.length} games`);
  console.log(`${'='.repeat(70)}\n`);

  for (const game of games) {
    stats.processed++;

    const progress = `[${stats.processed}/${stats.total}]`;
    const gameName = game.name.substring(0, 55);

    process.stdout.write(`${progress} ${gameName}...`);

    const result = await fetchGameCover(game.igdb_id);

    // Handle rate limiting
    if (result.rateLimited) {
      console.log(` ⚠️  RATE LIMITED`);
      console.log(`\n⏸️  Pausing for ${RATE_LIMIT_COOLDOWN/1000} seconds...`);
      await sleep(RATE_LIMIT_COOLDOWN);
      console.log(`▶️  Resuming...\n`);

      // Retry this game
      const retryResult = await fetchGameCover(game.igdb_id);
      if (retryResult.coverUrl) {
        const updated = await updateGameCover(game.id, retryResult.coverUrl);
        if (updated) {
          stats.success++;
          console.log(` ✅`);
        } else {
          stats.errors++;
          console.log(` ❌ DB error`);
        }
      } else {
        stats.noCover++;
        console.log(` ⚠️  No cover`);
      }
    } else if (result.coverUrl) {
      const updated = await updateGameCover(game.id, result.coverUrl);
      if (updated) {
        stats.success++;
        console.log(` ✅`);
      } else {
        stats.errors++;
        console.log(` ❌ DB error`);
      }
    } else if (result.notFound) {
      stats.notFound++;
      console.log(` ⚠️  Not in IGDB`);
    } else if (result.noCover) {
      stats.noCover++;
      console.log(` ⚠️  No cover`);
    } else {
      stats.errors++;
      console.log(` ❌ ${result.error}`);
    }

    // Rate limiting delay
    await sleep(DELAY_MS);
  }
}

async function backfillAllCovers() {
  console.log('🎮 COMPREHENSIVE COVER BACKFILL\n');
  console.log('⚙️  Configuration:');
  console.log(`   - Rate limit: ${REQUESTS_PER_SECOND} requests/second`);
  console.log(`   - Batch size: ${BATCH_SIZE} games`);
  console.log(`   - Delay between requests: ${DELAY_MS}ms`);
  console.log(`   - Cooldown on rate limit: ${RATE_LIMIT_COOLDOWN/1000}s\n`);

  // Get total count first
  console.log('📊 Counting games that need backfilling...');

  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: games, error } = await supabase
      .from('game')
      .select('id, igdb_id, name')
      .is('pic_url', null)
      .not('igdb_id', 'is', null)
      .order('id')
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('❌ Database error:', error.message);
      break;
    }

    if (!games || games.length === 0) {
      hasMore = false;
      break;
    }

    // First iteration: set total
    if (stats.total === 0) {
      stats.total = games.length; // This is just the first batch, but good estimate
      console.log(`\nFound games to process (first batch: ${games.length})`);
      console.log(`Starting backfill...\n`);
    }

    await processBatch(games);

    offset += BATCH_SIZE;

    // Show interim stats
    console.log(`\n📈 Progress Update:`);
    console.log(`   ✅ Success: ${stats.success}`);
    console.log(`   ⚠️  No cover: ${stats.noCover}`);
    console.log(`   ❌ Not found: ${stats.notFound}`);
    console.log(`   ⚠️  Errors: ${stats.errors}`);
    console.log(`   🚦 Rate limited: ${stats.rateLimited} times\n`);

    // Check if we should continue
    if (games.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total processed: ${stats.processed}`);
  console.log(`✅ Successfully updated: ${stats.success}`);
  console.log(`⚠️  No cover in IGDB: ${stats.noCover}`);
  console.log(`❌ Not found in IGDB: ${stats.notFound}`);
  console.log(`⚠️  Errors: ${stats.errors}`);
  console.log(`🚦 Rate limited: ${stats.rateLimited} times`);
  console.log('='.repeat(70));
  console.log(`\n🎉 Backfill complete!`);
  console.log(`📈 Success rate: ${((stats.success / stats.processed) * 100).toFixed(1)}%\n`);
}

// Run it
backfillAllCovers().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
