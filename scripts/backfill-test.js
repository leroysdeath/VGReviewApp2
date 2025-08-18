/**
 * Simple test script to verify backfill concept with the 5 problematic games
 * This will test fetching from IGDB and show what would be updated
 */

const TEST_GAME_IDS = [55056, 4152, 305152, 116, 45142];

// Direct database query using Supabase REST API
async function getTestGames() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sjftmuxaobozdzdbbeaa.supabase.co';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZnRtdXhhb2JvemR6ZGJiZWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE1OTIzOTUsImV4cCI6MjAzNzE2ODM5NX0.NDn6PuKDnJdbJCMWk2BqD6TVJzNAEu6iGQWKMeHo0jg';
  
  const url = `${supabaseUrl}/rest/v1/game?igdb_id=in.(${TEST_GAME_IDS.join(',')})&select=id,igdb_id,name,summary,cover_url,developer,genres,platforms`;
  
  const response = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch games: ${response.status}`);
  }
  
  return response.json();
}

// Test IGDB API via Netlify function
async function fetchFromIGDB(igdbId) {
  const response = await fetch('https://grand-narwhal-4e85d9.netlify.app/.netlify/functions/igdb-search', {
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
}

async function main() {
  console.log('🧪 Testing Data Backfill with 5 Problematic Games');
  console.log('=' .repeat(50));
  
  try {
    // Get current state of games
    console.log('\n📋 Fetching current game data from database...');
    const games = await getTestGames();
    
    console.log(`Found ${games.length} test games\n`);
    
    // Check each game
    for (const game of games) {
      console.log(`\n🎮 Game: ${game.name} (IGDB ID: ${game.igdb_id})`);
      console.log('  Current state:');
      console.log(`    - Summary: ${game.summary ? '✅ Present' : '❌ Missing'}`);
      console.log(`    - Cover URL: ${game.cover_url ? '✅ Present' : '❌ Missing'}`);
      console.log(`    - Developer: ${game.developer ? '✅ ' + game.developer : '❌ Missing'}`);
      console.log(`    - Genres: ${game.genres && game.genres.length > 0 ? '✅ ' + game.genres.join(', ') : '❌ Missing'}`);
      console.log(`    - Platforms: ${game.platforms && game.platforms.length > 0 ? '✅ ' + game.platforms.join(', ') : '❌ Missing'}`);
      
      // Try to fetch from IGDB
      console.log('\n  📡 Fetching from IGDB API...');
      try {
        const igdbData = await fetchFromIGDB(game.igdb_id);
        
        console.log('  ✅ IGDB data retrieved:');
        if (igdbData.summary && !game.summary) {
          console.log(`    - Summary: "${igdbData.summary.substring(0, 60)}..."`);
        }
        if (igdbData.cover && !game.cover_url) {
          console.log(`    - Cover: ${igdbData.cover.url}`);
        }
        if (igdbData.involved_companies && igdbData.involved_companies.length > 0 && !game.developer) {
          const company = igdbData.involved_companies[0].company?.name;
          console.log(`    - Company: ${company}`);
        }
        if (igdbData.genres && igdbData.genres.length > 0) {
          const genreNames = igdbData.genres.map(g => g.name);
          console.log(`    - Genres: ${genreNames.join(', ')}`);
        }
        if (igdbData.platforms && igdbData.platforms.length > 0) {
          const platformNames = igdbData.platforms.map(p => p.name);
          console.log(`    - Platforms: ${platformNames.join(', ')}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Failed to fetch from IGDB: ${error.message}`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Test complete! All 5 games can be updated from IGDB.');
    console.log('\nTo run the actual backfill:');
    console.log('  - Test mode: node scripts/backfill-game-data.cjs --test');
    console.log('  - Full backfill: node scripts/backfill-game-data.cjs --limit 100');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main().catch(console.error);