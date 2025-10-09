#!/usr/bin/env node

/**
 * Smart backfill: Prioritize popular games (those with user ratings)
 * This ensures the games users actually see get covers first
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

const DELAY_MS = 334; // ~3 requests/second
const BATCH_SIZE = 500; // Process 500 popular games
const RATE_LIMIT_COOLDOWN = 60000;

let stats = { processed: 0, success: 0, noCover: 0, errors: 0 };

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function backfillPopularGames() {
  console.log('🎯 SMART BACKFILL: Prioritizing Popular Games\n');

  // Get popular games missing covers (have user ratings but no pic_url)
  const { data: games, error} = await supabase
    .from('game')
    .select('id, igdb_id, name, rating_count')
    .is('pic_url', null)
    .not('igdb_id', 'is', null)
    .not('rating_count', 'is', null)
    .gt('rating_count', 0)
    .order('rating_count', { ascending: false })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('❌ Database error:', error.message);
    return;
  }

  console.log(`📊 Found ${games.length} popular games missing covers`);
  console.log(`🚀 Starting backfill (${DELAY_MS}ms delay between requests)...\n`);

  for (const game of games) {
    stats.processed++;
    const progress = `[${stats.processed}/${games.length}]`;
    process.stdout.write(`${progress} ${game.name.substring(0, 50).padEnd(50)}... `);

    try {
      const response = await fetch(igdbEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'getById', gameId: game.igdb_id })
      });

      if (response.status === 429) {
        console.log(`⚠️  Rate limited, cooling down...`);
        await sleep(RATE_LIMIT_COOLDOWN);
        continue;
      }

      if (!response.ok) {
        console.log(`❌ HTTP ${response.status}`);
        stats.errors++;
        await sleep(DELAY_MS);
        continue;
      }

      const data = await response.json();
      const igdbGame = data.games?.[0];

      if (!igdbGame?.cover?.image_id) {
        console.log(`⚠️  No cover`);
        stats.noCover++;
        await sleep(DELAY_MS);
        continue;
      }

      const coverUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big/${igdbGame.cover.image_id}.jpg`;

      const { error: updateError } = await supabase
        .from('game')
        .update({ pic_url: coverUrl, cover_url: coverUrl })
        .eq('id', game.id);

      if (updateError) {
        console.log(`❌ DB error`);
        stats.errors++;
      } else {
        console.log(`✅`);
        stats.success++;
      }

      await sleep(DELAY_MS);

    } catch (err) {
      console.log(`❌ ${err.message}`);
      stats.errors++;
    }

    // Show progress every 50 games
    if (stats.processed % 50 === 0) {
      console.log(`\n📈 Progress: ${stats.success} covers added, ${stats.noCover} without covers, ${stats.errors} errors\n`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 BACKFILL COMPLETE');
  console.log('='.repeat(70));
  console.log(`Total processed: ${stats.processed}`);
  console.log(`✅ Success: ${stats.success}`);
  console.log(`⚠️  No cover: ${stats.noCover}`);
  console.log(`❌ Errors: ${stats.errors}`);
  console.log(`📈 Success rate: ${((stats.success / stats.processed) * 100).toFixed(1)}%`);
  console.log('='.repeat(70));
}

backfillPopularGames().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
