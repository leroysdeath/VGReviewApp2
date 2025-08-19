/**
 * Data Backfill Script for Game Database (CommonJS version)
 * 
 * This script updates incomplete game records with full data from IGDB API.
 * It identifies games with missing critical fields (summary, cover_url, developer)
 * and fetches complete data from IGDB to update the database.
 * 
 * Usage: node scripts/backfill-game-data.cjs [options]
 * Options:
 *   --test           Run with only the 5 problematic games
 *   --limit <n>      Process only n games
 *   --dry-run        Show what would be updated without making changes
 *   --force          Update even if some fields exist
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs').promises;
const https = require('https');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse command line arguments
const args = process.argv.slice(2);
const isTest = args.includes('--test');
const isDryRun = args.includes('--dry-run');
const forceUpdate = args.includes('--force');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : null;

// Test game IDs (the problematic ones you mentioned)
const TEST_GAME_IDS = [55056, 4152, 305152, 116, 45142];

// Statistics tracking
let stats = {
  total: 0,
  processed: 0,
  updated: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

/**
 * Make HTTP request (Node.js compatible fetch)
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => JSON.parse(data)
          });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Fetch game data from IGDB API via Netlify function
 */
async function fetchFromIGDB(igdbId) {
  try {
    console.log(`  📡 Fetching IGDB data for ID: ${igdbId}`);
    
    // Use the local Netlify dev server endpoint
    const response = await makeRequest('https://grand-narwhal-4e85d9.netlify.app/.netlify/functions/igdb-search', {
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
      throw new Error(`IGDB API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.games || data.games.length === 0) {
      throw new Error('No game data returned from IGDB');
    }

    return data.games[0];
  } catch (error) {
    console.error(`  ❌ Failed to fetch from IGDB: ${error.message}`);
    throw error;
  }
}

/**
 * Transform IGDB data to database format
 */
function transformIGDBData(igdbGame) {
  const transformed = {
    summary: igdbGame.summary || null,
    cover_url: null,
    developer: null,
    publisher: null,
    genres: [],
    platforms: [],
    igdb_rating: null,
    first_release_date: null,
    updated_at: new Date().toISOString()
  };

  // Transform cover URL
  if (igdbGame.cover?.url) {
    transformed.cover_url = igdbGame.cover.url
      .replace('t_thumb', 't_cover_big')
      .replace('//', 'https://');
  }

  // Extract developer/publisher from involved companies
  if (igdbGame.involved_companies && igdbGame.involved_companies.length > 0) {
    const developers = igdbGame.involved_companies.filter(ic => ic.developer);
    const publishers = igdbGame.involved_companies.filter(ic => ic.publisher);
    
    if (developers.length > 0 && developers[0].company) {
      transformed.developer = developers[0].company.name || null;
    }
    if (publishers.length > 0 && publishers[0].company) {
      transformed.publisher = publishers[0].company.name || null;
    }
    // If no specific roles, use the first company for both
    if (!transformed.developer && !transformed.publisher && igdbGame.involved_companies[0]?.company?.name) {
      transformed.developer = igdbGame.involved_companies[0].company.name;
      transformed.publisher = igdbGame.involved_companies[0].company.name;
    }
  }

  // Transform genres
  if (igdbGame.genres && igdbGame.genres.length > 0) {
    transformed.genres = igdbGame.genres.map(g => g.name);
  }

  // Transform platforms
  if (igdbGame.platforms && igdbGame.platforms.length > 0) {
    transformed.platforms = igdbGame.platforms.map(p => p.name);
  }

  // Transform rating
  if (igdbGame.rating) {
    transformed.igdb_rating = Math.round(igdbGame.rating);
  }

  // Transform release date
  if (igdbGame.first_release_date) {
    transformed.first_release_date = new Date(igdbGame.first_release_date * 1000)
      .toISOString()
      .split('T')[0];
  }

  return transformed;
}

/**
 * Check if a game needs updating
 */
function needsUpdate(game) {
  if (forceUpdate) return true;
  
  // Check for critical missing fields
  return !game.summary || 
         !game.cover_url || 
         !game.developer || 
         !game.genres || 
         game.genres.length === 0 ||
         !game.platforms || 
         game.platforms.length === 0;
}

/**
 * Update a single game
 */
async function updateGame(game) {
  try {
    console.log(`\n🎮 Processing: ${game.name} (IGDB ID: ${game.igdb_id})`);
    
    // Check if update is needed
    if (!needsUpdate(game)) {
      console.log(`  ⏭️  Skipping - already has complete data`);
      stats.skipped++;
      return;
    }

    // Fetch data from IGDB
    const igdbData = await fetchFromIGDB(game.igdb_id);
    const updates = transformIGDBData(igdbData);

    // Show what will be updated
    console.log(`  📝 Updates to apply:`);
    if (!game.summary && updates.summary) {
      console.log(`     - Summary: ${updates.summary.substring(0, 50)}...`);
    }
    if (!game.cover_url && updates.cover_url) {
      console.log(`     - Cover URL: ${updates.cover_url}`);
    }
    if (!game.developer && updates.developer) {
      console.log(`     - Developer: ${updates.developer}`);
    }
    if ((!game.genres || game.genres.length === 0) && updates.genres.length > 0) {
      console.log(`     - Genres: ${updates.genres.join(', ')}`);
    }
    if ((!game.platforms || game.platforms.length === 0) && updates.platforms.length > 0) {
      console.log(`     - Platforms: ${updates.platforms.join(', ')}`);
    }

    if (isDryRun) {
      console.log(`  🔍 DRY RUN - Would update game ID ${game.id}`);
      stats.updated++;
      return;
    }

    // Update the database
    const { error } = await supabase
      .from('game')
      .update(updates)
      .eq('id', game.id);

    if (error) {
      throw error;
    }

    console.log(`  ✅ Successfully updated game ID ${game.id}`);
    stats.updated++;

  } catch (error) {
    console.error(`  ❌ Failed to update game: ${error.message}`);
    stats.failed++;
    stats.errors.push({
      gameId: game.id,
      igdbId: game.igdb_id,
      name: game.name,
      error: error.message
    });
  }
}

/**
 * Get games that need updating
 */
async function getGamesToUpdate() {
  let query = supabase
    .from('game')
    .select('id, igdb_id, name, summary, cover_url, developer, genres, platforms');

  if (isTest) {
    // Test mode: only process the 5 problematic games
    query = query.in('igdb_id', TEST_GAME_IDS);
  } else if (!forceUpdate) {
    // Normal mode: find games with missing data
    query = query.or(
      'summary.is.null,' +
      'cover_url.is.null,' +
      'developer.is.null,' +
      'genres.is.null,' +
      'platforms.is.null'
    );
  }

  if (limit && !isTest) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Save statistics to file
 */
async function saveStats() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backfill-stats-${timestamp}.json`;
  const filepath = path.join(__dirname, '..', 'logs', filename);

  // Ensure logs directory exists
  await fs.mkdir(path.join(__dirname, '..', 'logs'), { recursive: true });

  await fs.writeFile(filepath, JSON.stringify(stats, null, 2));
  console.log(`\n📊 Statistics saved to: logs/${filename}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Game Data Backfill Process');
  console.log('=====================================');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }
  if (isTest) {
    console.log('🧪 TEST MODE - Processing only 5 problematic games');
  }
  if (forceUpdate) {
    console.log('⚠️  FORCE MODE - Will update even if some fields exist');
  }
  if (limit) {
    console.log(`📏 LIMIT MODE - Processing maximum ${limit} games`);
  }

  try {
    // Get games to update
    console.log('\n📋 Fetching games that need updates...');
    const games = await getGamesToUpdate();
    stats.total = games.length;
    
    console.log(`Found ${stats.total} games to process\n`);

    if (stats.total === 0) {
      console.log('✨ No games need updating!');
      return;
    }

    // Process each game with rate limiting
    for (const game of games) {
      stats.processed++;
      console.log(`Progress: ${stats.processed}/${stats.total}`);
      
      await updateGame(game);
      
      // Rate limiting: wait 1 second between API calls to avoid overwhelming IGDB
      if (!isDryRun) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Print summary
    console.log('\n=====================================');
    console.log('📊 Backfill Complete - Summary:');
    console.log(`  Total games found: ${stats.total}`);
    console.log(`  Games processed: ${stats.processed}`);
    console.log(`  Games updated: ${stats.updated}`);
    console.log(`  Games skipped: ${stats.skipped}`);
    console.log(`  Games failed: ${stats.failed}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      stats.errors.forEach(err => {
        console.log(`  - ${err.name} (IGDB: ${err.igdbId}): ${err.error}`);
      });
    }

    // Save statistics
    await saveStats();

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);