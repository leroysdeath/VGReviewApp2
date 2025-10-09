#!/usr/bin/env node

/**
 * Backfill Missing Cover URLs from IGDB
 *
 * This script identifies games in the database that are missing cover_url
 * and attempts to fetch them from IGDB API.
 *
 * Usage:
 *   node scripts/backfill-missing-covers.js [--dry-run] [--limit=100]
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 100;

// Environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const igdbEndpoint = 'http://localhost:8888/.netlify/functions/igdb-search';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetch game details from IGDB by ID
 */
async function fetchGameFromIGDB(igdbId) {
  try {
    const response = await fetch(igdbEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'getById',
        gameId: igdbId
      })
    });

    if (!response.ok) {
      console.warn(`  ⚠️  IGDB API returned ${response.status} for ID ${igdbId}`);
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.games || data.games.length === 0) {
      console.warn(`  ⚠️  No game found in IGDB for ID ${igdbId}`);
      return null;
    }

    return data.games[0];
  } catch (error) {
    console.error(`  ❌ Error fetching from IGDB:`, error.message);
    return null;
  }
}

/**
 * Convert IGDB cover object to URL
 */
function getCoverUrl(cover) {
  if (!cover || !cover.image_id) {
    return null;
  }

  // Use high quality 1080p images
  return `https://images.igdb.com/igdb/image/upload/t_1080p/${cover.image_id}.webp`;
}

/**
 * Main backfill function
 */
async function backfillMissingCovers() {
  console.log('🔍 Searching for games with missing cover URLs...\n');

  // Fetch games with missing cover_url
  const { data: games, error } = await supabase
    .from('game')
    .select('id, igdb_id, name, cover_url')
    .is('cover_url', null)
    .not('igdb_id', 'is', null)
    .order('id', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching games:', error);
    process.exit(1);
  }

  if (!games || games.length === 0) {
    console.log('✅ No games with missing cover URLs found!');
    return;
  }

  console.log(`📊 Found ${games.length} games with missing cover URLs\n`);

  if (isDryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made\n');
  }

  let successCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  for (const game of games) {
    console.log(`\n🎮 Processing: ${game.name} (ID: ${game.id}, IGDB ID: ${game.igdb_id})`);

    // Fetch from IGDB
    const igdbGame = await fetchGameFromIGDB(game.igdb_id);

    if (!igdbGame) {
      notFoundCount++;
      console.log(`  ❌ Could not fetch from IGDB`);
      continue;
    }

    const coverUrl = getCoverUrl(igdbGame.cover);

    if (!coverUrl) {
      notFoundCount++;
      console.log(`  ⚠️  Game exists in IGDB but has no cover`);
      continue;
    }

    console.log(`  ✅ Found cover: ${coverUrl}`);

    if (!isDryRun) {
      // Update BOTH cover_url and pic_url (search function uses pic_url)
      const { error: updateError } = await supabase
        .from('game')
        .update({
          cover_url: coverUrl,
          pic_url: coverUrl
        })
        .eq('id', game.id);

      if (updateError) {
        errorCount++;
        console.error(`  ❌ Error updating database:`, updateError.message);
        continue;
      }

      successCount++;
      console.log(`  💾 Database updated`);
    } else {
      successCount++;
      console.log(`  💾 Would update database (dry run)`);
    }

    // Rate limiting - wait 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 BACKFILL SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${games.length}`);
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`❌ Not found in IGDB: ${notFoundCount}`);
  console.log(`⚠️  Errors: ${errorCount}`);
  console.log('='.repeat(60) + '\n');

  if (isDryRun) {
    console.log('🧪 This was a dry run. Run without --dry-run to apply changes.\n');
  }
}

// Run the script
backfillMissingCovers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
