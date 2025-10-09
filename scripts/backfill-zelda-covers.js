#!/usr/bin/env node

/**
 * Targeted backfill for Zelda games missing covers
 * Includes rate limiting to respect API limits
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

// Rate limiting: 250ms between requests = 4 requests/second (safe for IGDB)
const DELAY_MS = 250;

async function backfillZeldaCovers() {
  console.log('🔍 Searching for Zelda games missing covers...\n');

  const { data: games, error } = await supabase
    .from('game')
    .select('id, igdb_id, name, cover_url')
    .is('cover_url', null)
    .not('igdb_id', 'is', null)
    .ilike('name', '%zelda%')
    .order('id')
    .limit(30);

  if (error) {
    console.error('❌ Database error:', error);
    return;
  }

  console.log(`📊 Found ${games.length} Zelda games missing covers\n`);

  if (games.length === 0) {
    console.log('✅ All Zelda games already have covers!');
    return;
  }

  let successCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  for (const game of games) {
    console.log(`🎮 ${game.name.substring(0, 70)}`);
    console.log(`   ID: ${game.id}, IGDB ID: ${game.igdb_id}`);

    try {
      const response = await fetch(igdbEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'getById',
          gameId: game.igdb_id
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.log('   ⚠️  Rate limit hit - stopping to avoid further issues');
          break;
        }
        console.log(`   ❌ IGDB API returned ${response.status}`);
        errorCount++;
        await new Promise(r => setTimeout(r, DELAY_MS));
        continue;
      }

      const data = await response.json();
      const igdbGame = data.games?.[0];

      if (!igdbGame) {
        console.log('   ❌ Game not found in IGDB');
        notFoundCount++;
        await new Promise(r => setTimeout(r, DELAY_MS));
        continue;
      }

      if (!igdbGame.cover?.image_id) {
        console.log('   ⚠️  Game exists in IGDB but has no cover');
        notFoundCount++;
        await new Promise(r => setTimeout(r, DELAY_MS));
        continue;
      }

      const coverUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big/${igdbGame.cover.image_id}.jpg`;
      console.log(`   ✅ Found cover: ${coverUrl}`);

      const { error: updateError } = await supabase
        .from('game')
        .update({
          cover_url: coverUrl,
          pic_url: coverUrl
        })
        .eq('id', game.id);

      if (updateError) {
        console.log(`   ❌ Database update error: ${updateError.message}`);
        errorCount++;
      } else {
        console.log('   💾 Database updated');
        successCount++;
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, DELAY_MS));

    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      errorCount++;
    }

    console.log(''); // Blank line between games
  }

  console.log('='.repeat(60));
  console.log('📊 BACKFILL SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${games.length}`);
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`❌ Not found / No cover: ${notFoundCount}`);
  console.log(`⚠️  Errors: ${errorCount}`);
  console.log('='.repeat(60));
}

backfillZeldaCovers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
