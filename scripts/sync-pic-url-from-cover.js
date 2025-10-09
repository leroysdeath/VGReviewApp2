#!/usr/bin/env node

/**
 * Sync pic_url from cover_url
 *
 * This script copies cover_url to pic_url for games that have cover_url but missing pic_url.
 * This is a quick fix that doesn't require any IGDB API calls.
 *
 * Usage:
 *   node scripts/sync-pic-url-from-cover.js [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncPicUrl() {
  console.log('🔄 Syncing pic_url from cover_url...\n');

  // Get games with cover_url but no pic_url
  const { data: games, error } = await supabase
    .from('game')
    .select('id, igdb_id, name, cover_url, pic_url')
    .not('cover_url', 'is', null)
    .is('pic_url', null);

  if (error) {
    console.error('❌ Error fetching games:', error);
    process.exit(1);
  }

  console.log(`📊 Found ${games.length} games needing pic_url sync\n`);

  if (games.length === 0) {
    console.log('✅ All games are already synced!');
    return;
  }

  if (isDryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made\n');
    console.log('Sample games that would be updated:');
    games.slice(0, 10).forEach(game => {
      console.log(`  - ${game.name}`);
      console.log(`    cover_url: ${game.cover_url}`);
      console.log(`    pic_url: NULL -> ${game.cover_url}`);
    });
    console.log(`\n... and ${games.length - 10} more`);
    return;
  }

  // Update in batches
  const BATCH_SIZE = 100;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < games.length; i += BATCH_SIZE) {
    const batch = games.slice(i, i + BATCH_SIZE);

    const updatePromises = batch.map(game =>
      supabase
        .from('game')
        .update({ pic_url: game.cover_url })
        .eq('id', game.id)
    );

    const results = await Promise.allSettled(updatePromises);

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && !result.value.error) {
        successCount++;
      } else {
        errorCount++;
        console.error(`  ❌ Error updating ${batch[idx].name}`);
      }
    });

    console.log(`  ✅ Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(games.length/BATCH_SIZE)}: ${successCount}/${i + batch.length} updated`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SYNC SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total games: ${games.length}`);
  console.log(`✅ Successfully synced: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('='.repeat(60));
}

syncPicUrl().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
