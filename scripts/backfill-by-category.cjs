#!/usr/bin/env node

/**
 * Category-Based Backfill Script
 *
 * Systematically backfills all games from categories that were originally filtered out.
 * Processes one category at a time with rate limiting and progress tracking.
 *
 * Usage:
 *   node scripts/backfill-by-category.cjs --priority 1
 *   node scripts/backfill-by-category.cjs --category 11
 *   node scripts/backfill-by-category.cjs --categories 11,2,3
 *   node scripts/backfill-by-category.cjs --all
 *   node scripts/backfill-by-category.cjs --dry-run
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const RATE_LIMIT = 3; // requests per second (IGDB allows 4, we stay safe at 3)
const DELAY_BETWEEN_REQUESTS = Math.ceil(1000 / RATE_LIMIT); // ~333ms
const BATCH_SIZE = 500; // IGDB max per request
const DB_BATCH_SIZE = 50; // Supabase batch insert size
const PROGRESS_FILE = '.backfill-progress.json';

// Category definitions
const CATEGORIES = {
  // Priority 1: Most Important
  11: { name: 'Ports', priority: 1, estimated: 15000 },
  2: { name: 'Expansions', priority: 1, estimated: 3000 },
  3: { name: 'Bundles', priority: 1, estimated: 2000 },

  // Priority 2: Medium Important
  5: { name: 'Mods', priority: 2, estimated: 1000 },
  9: { name: 'Remasters', priority: 2, estimated: 500 },
  10: { name: 'Remakes', priority: 2, estimated: 500 },

  // Priority 3: Lower Priority
  1: { name: 'DLC', priority: 3, estimated: 20000 },
  6: { name: 'Episodes', priority: 3, estimated: 500 },
  7: { name: 'Seasons', priority: 3, estimated: 200 },
  12: { name: 'Forks', priority: 3, estimated: 100 },
  13: { name: 'Packs', priority: 3, estimated: 500 },
  14: { name: 'Updates', priority: 3, estimated: 1000 }
};

// ============================================================================
// INITIALIZE CLIENTS
// ============================================================================

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getReleaseStatus(game) {
  if (!game.first_release_date) return 'tba';

  const releaseDate = new Date(game.first_release_date * 1000);
  const now = new Date();

  if (releaseDate > now) return 'upcoming';
  if (releaseDate < new Date('1980-01-01')) return 'unknown';
  return 'released';
}

function transformIGDBGame(igdbGame) {
  return {
    game_id: igdbGame.id.toString(),
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
    release_status: getReleaseStatus(igdbGame),
    is_verified: false,
    view_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch (err) {
      console.error('⚠️  Failed to load progress file, starting fresh');
      return { completed: [], stats: {} };
    }
  }
  return { completed: [], stats: {} };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ============================================================================
// IGDB API
// ============================================================================

async function fetchFromIGDB(categoryId, offset) {
  const query = `
    fields name, summary, slug, first_release_date, rating,
           cover.url, genres.name, platforms.name,
           involved_companies.company.name,
           involved_companies.developer,
           involved_companies.publisher,
           category;
    where category = ${categoryId};
    limit ${BATCH_SIZE};
    offset ${offset};
    sort id asc;
  `;

  const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      isBulkRequest: true,
      endpoint: 'games',
      requestBody: query.trim()
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`IGDB API error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'IGDB API request failed');
  }

  return data.games || [];
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function getExistingIGDBIds(igdbIds) {
  // Query in chunks to avoid timeout
  const CHUNK_SIZE = 1000;
  const allExisting = new Set();

  for (let i = 0; i < igdbIds.length; i += CHUNK_SIZE) {
    const chunk = igdbIds.slice(i, i + CHUNK_SIZE);

    const { data, error } = await supabase
      .from('game')
      .select('igdb_id')
      .in('igdb_id', chunk);

    if (error) {
      console.error('      ⚠️  Error checking duplicates:', error.message);
      // Continue anyway, duplicates will be caught during insert
      return new Set();
    }

    data.forEach(g => allExisting.add(g.igdb_id));
  }

  return allExisting;
}

async function insertGames(games) {
  let successCount = 0;
  let failCount = 0;

  // Insert in smaller batches to avoid timeout
  for (let i = 0; i < games.length; i += DB_BATCH_SIZE) {
    const batch = games.slice(i, i + DB_BATCH_SIZE);

    try {
      const { data, error } = await supabase
        .from('game')
        .insert(batch);

      if (error) {
        // Count how many succeeded before error
        if (error.message.includes('duplicate key')) {
          // Duplicates are expected, count as success
          successCount += batch.length;
        } else {
          console.error(`      ❌ Batch insert error:`, error.message);
          failCount += batch.length;
        }
      } else {
        successCount += batch.length;
      }

      // Small delay between batches
      await sleep(100);

    } catch (err) {
      console.error(`      ❌ Batch insert exception:`, err.message);
      failCount += batch.length;
    }
  }

  return { success: successCount, failed: failCount };
}

// ============================================================================
// CATEGORY BACKFILL
// ============================================================================

async function backfillCategory(categoryId, dryRun = false) {
  const category = CATEGORIES[categoryId];
  const categoryName = category.name;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎮 Category ${categoryId}: ${categoryName}`);
  console.log(`${'='.repeat(80)}`);

  let offset = 0;
  let totalFetched = 0;
  let totalNew = 0;
  let totalAdded = 0;
  let batchNum = 0;
  const startTime = Date.now();

  while (true) {
    batchNum++;
    console.log(`\n📦 Batch ${batchNum} (offset ${offset})`);

    try {
      // Fetch from IGDB
      console.log(`   🔍 Fetching from IGDB...`);
      const games = await fetchFromIGDB(categoryId, offset);

      if (games.length === 0) {
        console.log(`   ✅ No more games in this category`);
        break;
      }

      // Safety check: if we're getting errors repeatedly, stop after reasonable attempts
      if (batchNum > 100 && totalFetched === 0) {
        console.log(`   ⚠️  No data fetched after 100 batches, likely connection issue or empty category`);
        break;
      }

      totalFetched += games.length;
      console.log(`   ✅ Fetched ${games.length} games`);

      // Check which are new
      console.log(`   🔍 Checking for duplicates...`);
      const igdbIds = games.map(g => g.id);
      const existingIds = await getExistingIGDBIds(igdbIds);
      const newGames = games.filter(g => !existingIds.has(g.id));
      totalNew += newGames.length;

      console.log(`   📊 ${newGames.length} are new (${existingIds.size} already in database)`);

      // Insert new games
      if (newGames.length > 0 && !dryRun) {
        console.log(`   💾 Inserting ${newGames.length} games to database...`);
        const transformed = newGames.map(transformIGDBGame);
        const { success, failed } = await insertGames(transformed);
        totalAdded += success;

        if (failed > 0) {
          console.log(`   ⚠️  ${success} inserted, ${failed} failed`);
        } else {
          console.log(`   ✅ Inserted ${success} games`);
        }
      } else if (dryRun) {
        console.log(`   🔍 DRY RUN: Would insert ${newGames.length} games`);
        totalAdded += newGames.length;
      }

      // Progress update
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const rate = totalFetched / elapsed;
      console.log(`   📈 Progress: ${totalFetched} fetched, ${totalNew} new, ${totalAdded} added`);
      console.log(`   ⏱️  Elapsed: ${elapsed}s (${rate.toFixed(1)} games/sec)`);

      // Move to next batch
      offset += BATCH_SIZE;

      // Rate limit: wait between requests
      await sleep(DELAY_BETWEEN_REQUESTS);

    } catch (error) {
      console.error(`\n   ❌ Error in batch ${batchNum}:`, error.message);

      if (error.message.includes('429')) {
        console.log(`   ⏳ Rate limited, waiting 5 seconds...`);
        await sleep(5000);
        // Retry this batch
        continue;
      } else {
        console.log(`   ⏭️  Skipping to next batch...`);
        offset += BATCH_SIZE;
      }
    }
  }

  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(totalTime / 60);
  const seconds = totalTime % 60;

  console.log(`\n✅ Category ${categoryId} (${categoryName}) Complete!`);
  console.log(`   📊 Total fetched: ${totalFetched.toLocaleString()}`);
  console.log(`   ✅ Total new: ${totalNew.toLocaleString()}`);
  console.log(`   💾 Total added: ${totalAdded.toLocaleString()}`);
  console.log(`   ⏱️  Time: ${minutes}m ${seconds}s`);

  return {
    categoryId,
    categoryName,
    fetched: totalFetched,
    new: totalNew,
    added: totalAdded,
    time: totalTime
  };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🎮 Category Backfill Script\n');

  // Parse arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const resume = args.includes('--resume');

  let categoriesToProcess = [];

  if (args.includes('--all')) {
    categoriesToProcess = Object.keys(CATEGORIES).map(Number);
  } else if (args.includes('--priority')) {
    const priorityIdx = args.indexOf('--priority');
    const priority = parseInt(args[priorityIdx + 1]);
    categoriesToProcess = Object.keys(CATEGORIES)
      .map(Number)
      .filter(id => CATEGORIES[id].priority === priority);
  } else if (args.includes('--category')) {
    const catIdx = args.indexOf('--category');
    categoriesToProcess = [parseInt(args[catIdx + 1])];
  } else if (args.includes('--categories')) {
    const catIdx = args.indexOf('--categories');
    categoriesToProcess = args[catIdx + 1].split(',').map(Number);
  } else {
    // Default: Priority 1
    console.log('ℹ️  No arguments provided, defaulting to Priority 1 categories');
    console.log('   Use --help for usage information\n');
    categoriesToProcess = Object.keys(CATEGORIES)
      .map(Number)
      .filter(id => CATEGORIES[id].priority === 1);
  }

  // Load progress
  let progress = resume ? loadProgress() : { completed: [], stats: {} };

  // Filter out completed categories if resuming
  if (resume) {
    const remaining = categoriesToProcess.filter(id => !progress.completed.includes(id));
    console.log(`📋 Resuming: ${remaining.length} categories remaining\n`);
    categoriesToProcess = remaining;
  }

  // Show plan
  console.log('📋 Categories to process:\n');
  categoriesToProcess.forEach(id => {
    const cat = CATEGORIES[id];
    const status = progress.completed.includes(id) ? '✅' : '⏳';
    console.log(`   ${status} Category ${id}: ${cat.name} (Priority ${cat.priority}, ~${cat.estimated.toLocaleString()} estimated)`);
  });
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  const totalEstimated = categoriesToProcess.reduce((sum, id) => sum + CATEGORIES[id].estimated, 0);
  const estimatedMinutes = Math.ceil(totalEstimated / 180); // ~180 games per minute at 3 req/sec
  console.log(`⏱️  Estimated time: ~${estimatedMinutes} minutes for ${totalEstimated.toLocaleString()} estimated games\n`);

  // Confirm
  if (!dryRun && !args.includes('--yes') && !args.includes('-y')) {
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to begin...');
    await sleep(5000);
  }

  // Process categories
  const results = [];
  const overallStart = Date.now();

  for (let i = 0; i < categoriesToProcess.length; i++) {
    const categoryId = categoriesToProcess[i];
    console.log(`\n[${ i + 1}/${categoriesToProcess.length}] Processing Category ${categoryId}...`);

    try {
      const result = await backfillCategory(categoryId, dryRun);
      results.push(result);

      // Update progress
      progress.completed.push(categoryId);
      progress.stats[categoryId] = result;
      if (!dryRun) {
        saveProgress(progress);
      }

    } catch (error) {
      console.error(`\n❌ Fatal error processing category ${categoryId}:`, error);
      console.log(`\n💾 Progress saved. You can resume with --resume flag\n`);
      process.exit(1);
    }
  }

  // Final summary
  const overallTime = Math.floor((Date.now() - overallStart) / 1000);
  const overallMinutes = Math.floor(overallTime / 60);
  const overallSeconds = overallTime % 60;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎉 Backfill Complete!`);
  console.log(`${'='.repeat(80)}\n`);

  console.log('📊 Summary by Category:\n');
  results.forEach(r => {
    const pct = r.fetched > 0 ? ((r.new / r.fetched) * 100).toFixed(1) : 0;
    console.log(`   Category ${r.categoryId} (${r.categoryName}):`.padEnd(35) +
                `+${r.added.toLocaleString()} games (${pct}% new)`);
  });

  const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
  const totalFetched = results.reduce((sum, r) => sum + r.fetched, 0);

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`   ✅ Total Added: ${totalAdded.toLocaleString()} games`);
  console.log(`   📊 Total Fetched: ${totalFetched.toLocaleString()} games`);
  console.log(`   ⏱️  Total Time: ${overallMinutes}m ${overallSeconds}s`);

  if (!dryRun) {
    console.log(`\n💾 Progress saved to ${PROGRESS_FILE}`);
    console.log(`🗑️  Delete this file to start fresh next time\n`);
  }
}

// ============================================================================
// RUN
// ============================================================================

if (require.main === module) {
  main().catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
  });
}
