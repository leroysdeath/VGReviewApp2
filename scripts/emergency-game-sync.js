#!/usr/bin/env node

/**
 * Emergency Game Data Sync
 * Aggressively syncs all games with IGDB data
 * Run with: node scripts/emergency-game-sync.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// IGDB Configuration
const IGDB_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const IGDB_ACCESS_TOKEN = process.env.TWITCH_APP_ACCESS_TOKEN;
const IGDB_API_URL = 'https://api.igdb.com/v4';

// Aggressive settings for alpha environment
const CONFIG = {
  BATCH_SIZE: 500,           // Max IGDB allows per request
  PARALLEL_REQUESTS: 10,     // Run 10 requests simultaneously
  DB_BATCH_SIZE: 1000,       // Update 1000 games at once in DB
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  FIELDS_TO_SYNC: [
    'name',
    'summary',
    'cover.url',
    'first_release_date',
    'platforms.name',
    'involved_companies.company.name',
    'involved_companies.developer',
    'involved_companies.publisher',
    'screenshots.url',
    'videos.video_id',
    'aggregated_rating',
    'aggregated_rating_count',
    'total_rating',
    'total_rating_count',
    'franchises.name',
    'collections.name',
    'alternative_names.name',
    'similar_games',
    'dlcs',
    'expansions',
    'category',
    'parent_game',
    'websites.url',
    'game_modes.name',
    'themes.name',
    'keywords.name',
    'player_perspectives.name'
  ]
};

// Statistics tracking
let stats = {
  total: 0,
  processed: 0,
  updated: 0,
  failed: 0,
  startTime: Date.now()
};

/**
 * Fetch data from IGDB for a batch of IDs
 */
async function fetchIGDBBatch(igdbIds) {
  const query = `
    fields ${CONFIG.FIELDS_TO_SYNC.join(',')};
    where id = (${igdbIds.join(',')});
    limit ${CONFIG.BATCH_SIZE};
  `;

  for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${IGDB_API_URL}/games`, {
        method: 'POST',
        headers: {
          'Client-ID': IGDB_CLIENT_ID,
          'Authorization': `Bearer ${IGDB_ACCESS_TOKEN}`,
          'Content-Type': 'text/plain'
        },
        body: query
      });

      if (!response.ok) {
        throw new Error(`IGDB API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      if (attempt < CONFIG.RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Transform IGDB data to match our database schema
 */
function transformIGDBData(igdbGame) {
  const transformed = {
    igdb_id: igdbGame.id,
    name: igdbGame.name,
    summary: igdbGame.summary || null,
    release_date: igdbGame.first_release_date
      ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
      : null,
    cover_url: igdbGame.cover?.url
      ? igdbGame.cover.url.replace('//images.igdb.com', 'https://images.igdb.com').replace('t_thumb', 't_1080p')
      : null,
    platforms: igdbGame.platforms?.map(p => p.name) || [],
    screenshots: igdbGame.screenshots?.map(s =>
      s.url.replace('//images.igdb.com', 'https://images.igdb.com').replace('t_thumb', 't_1080p')
    ) || [],
    total_rating: Math.round(igdbGame.total_rating || 0),
    rating_count: igdbGame.total_rating_count || 0,
    metacritic_score: Math.round(igdbGame.aggregated_rating || 0),
    franchise_name: igdbGame.franchises?.[0]?.name || null,
    collection_name: igdbGame.collections?.[0]?.name || null,
    alternative_names: igdbGame.alternative_names?.map(a => a.name) || [],
    similar_game_ids: igdbGame.similar_games || [],
    dlc_ids: igdbGame.dlcs || [],
    expansion_ids: igdbGame.expansions || [],
    category: igdbGame.category || null,
    parent_game: igdbGame.parent_game || null,
    last_synced: new Date().toISOString(),
    sync_status: 'completed',
    data_source: 'igdb_emergency_sync'
  };

  // Extract developer and publisher
  if (igdbGame.involved_companies) {
    const developer = igdbGame.involved_companies.find(ic => ic.developer);
    const publisher = igdbGame.involved_companies.find(ic => ic.publisher);

    transformed.developer = developer?.company?.name || null;
    transformed.publisher = publisher?.company?.name || null;
  }

  return transformed;
}

/**
 * Update games in database in bulk
 */
async function updateGamesInDB(gamesData) {
  try {
    // Build bulk update query
    const updates = gamesData.map(game => {
      const setClause = Object.entries(game)
        .filter(([key]) => key !== 'igdb_id')
        .map(([key, value]) => {
          if (value === null) return `${key} = NULL`;
          if (Array.isArray(value)) return `${key} = ARRAY[${value.map(v => `'${v}'`).join(',')}]::text[]`;
          if (typeof value === 'string') return `${key} = '${value.replace(/'/g, "''")}'`;
          return `${key} = ${value}`;
        })
        .join(', ');

      return `UPDATE game SET ${setClause} WHERE igdb_id = ${game.igdb_id};`;
    }).join('\n');

    // Execute bulk update
    const { error } = await supabase.rpc('execute_sql', { sql: updates });

    if (error) throw error;

    stats.updated += gamesData.length;
    return true;
  } catch (error) {
    console.error('Database update error:', error);
    stats.failed += gamesData.length;
    return false;
  }
}

/**
 * Process a chunk of games
 */
async function processChunk(games) {
  const igdbIds = games.map(g => g.igdb_id).filter(Boolean);
  if (igdbIds.length === 0) return;

  try {
    // Fetch from IGDB
    const igdbData = await fetchIGDBBatch(igdbIds);

    // Transform data
    const transformed = igdbData.map(transformIGDBData);

    // Update database
    await updateGamesInDB(transformed);

    stats.processed += games.length;
  } catch (error) {
    console.error('Chunk processing error:', error);
    stats.failed += games.length;

    // Mark games as failed in DB
    const failedUpdate = games.map(g => ({
      igdb_id: g.igdb_id,
      sync_status: 'failed',
      sync_error: error.message,
      last_sync_attempt: new Date().toISOString()
    }));

    await updateGamesInDB(failedUpdate);
  }
}

/**
 * Main sync function
 */
async function syncAllGames() {
  console.log('🚀 Starting Emergency Game Sync');
  console.log(`Settings: ${CONFIG.PARALLEL_REQUESTS} parallel requests, ${CONFIG.BATCH_SIZE} games per batch`);

  // Get all games with IGDB IDs that need syncing
  const { data: games, error } = await supabase
    .from('game')
    .select('id, game_id, igdb_id, name')
    .not('igdb_id', 'is', null)
    .or('cover_url.is.null,summary.is.null,developer.is.null,publisher.is.null,release_date.is.null')
    .order('rating_count', { ascending: false, nullsFirst: false }); // Prioritize popular games

  if (error) {
    console.error('Failed to fetch games:', error);
    return;
  }

  stats.total = games.length;
  console.log(`Found ${stats.total} games needing sync`);

  // Process in parallel chunks
  const chunks = [];
  for (let i = 0; i < games.length; i += CONFIG.BATCH_SIZE) {
    chunks.push(games.slice(i, i + CONFIG.BATCH_SIZE));
  }

  // Process chunks with parallelism limit
  for (let i = 0; i < chunks.length; i += CONFIG.PARALLEL_REQUESTS) {
    const parallelChunks = chunks.slice(i, i + CONFIG.PARALLEL_REQUESTS);

    await Promise.all(parallelChunks.map(processChunk));

    // Progress report
    const elapsed = (Date.now() - stats.startTime) / 1000;
    const rate = Math.round(stats.processed / elapsed);
    const eta = Math.round((stats.total - stats.processed) / rate);

    console.log(`Progress: ${stats.processed}/${stats.total} (${Math.round(stats.processed/stats.total*100)}%) | Rate: ${rate}/sec | ETA: ${eta}s | Failed: ${stats.failed}`);
  }

  // Final report
  const totalTime = (Date.now() - stats.startTime) / 1000;
  console.log('\n✅ Sync Complete!');
  console.log(`Total: ${stats.total} games`);
  console.log(`Updated: ${stats.updated} games`);
  console.log(`Failed: ${stats.failed} games`);
  console.log(`Time: ${Math.round(totalTime)}s (${Math.round(stats.total/totalTime)} games/sec)`);

  // Update any remaining pending games to 'skipped'
  await supabase
    .from('game')
    .update({
      sync_status: 'skipped',
      last_sync_attempt: new Date().toISOString()
    })
    .eq('sync_status', 'pending');
}

/**
 * Quick stats check
 */
async function checkDataCompleteness() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: `
      SELECT
        COUNT(*) as total,
        COUNT(cover_url) as has_cover,
        COUNT(summary) as has_summary,
        COUNT(developer) as has_developer,
        COUNT(release_date) as has_release_date,
        ROUND(COUNT(cover_url)::numeric / COUNT(*) * 100, 2) as pct_cover,
        ROUND(COUNT(summary)::numeric / COUNT(*) * 100, 2) as pct_summary,
        ROUND(COUNT(developer)::numeric / COUNT(*) * 100, 2) as pct_developer,
        ROUND(COUNT(release_date)::numeric / COUNT(*) * 100, 2) as pct_release_date
      FROM game
      WHERE igdb_id IS NOT NULL
    `
  });

  console.log('\n📊 Data Completeness Report:');
  console.log(data[0]);
}

// Run based on command line argument
const command = process.argv[2];

if (command === '--check') {
  checkDataCompleteness();
} else if (command === '--help') {
  console.log(`
Emergency Game Sync Tool

Usage:
  node scripts/emergency-game-sync.js          # Run full sync
  node scripts/emergency-game-sync.js --check  # Check data completeness
  node scripts/emergency-game-sync.js --help   # Show this help

Environment variables required:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - TWITCH_CLIENT_ID
  - TWITCH_APP_ACCESS_TOKEN
  `);
} else {
  syncAllGames();
}