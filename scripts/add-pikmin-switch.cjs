require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

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
    slug: igdbGame.slug || igdbGame.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
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
    view_count: 0
  };
}

async function fetchAndAddGame(gameId, gameName) {
  console.log(`\n🔍 Fetching ${gameName} (ID: ${gameId}) from IGDB...`);

  try {
    const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'getById', gameId })
    });

    const data = await response.json();

    if (!data.success || !data.games || data.games.length === 0) {
      console.error(`   ❌ Failed to fetch from IGDB`);
      return false;
    }

    const igdbGame = data.games[0];
    console.log(`   ✅ Fetched: ${igdbGame.name}`);
    console.log(`   📅 Release: ${igdbGame.first_release_date ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0] : 'Unknown'}`);
    console.log(`   🎮 Platforms: ${igdbGame.platforms?.map(p => p.name).join(', ') || 'Unknown'}`);

    // Transform and insert
    const gameData = transformIGDBGame(igdbGame);

    console.log(`   💾 Adding to database...`);
    const { data: insertData, error } = await supabase
      .from('game')
      .insert([gameData])
      .select();

    if (error) {
      if (error.message.includes('duplicate key')) {
        console.log(`   ⚠️  Already exists in database`);
        return false;
      }
      console.error(`   ❌ Database error:`, error.message);
      return false;
    }

    console.log(`   ✅ Successfully added to database!`);
    return true;

  } catch (err) {
    console.error(`   ❌ Error:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🎮 Adding Pikmin Switch Games\n');

  const games = [
    { id: 254334, name: 'Pikmin 1 (Switch)' },
    { id: 254335, name: 'Pikmin 2 (Switch)' },
    { id: 254343, name: 'Pikmin 1+2 Bundle (Switch)' }
  ];

  let added = 0;
  let skipped = 0;

  for (const game of games) {
    const success = await fetchAndAddGame(game.id, game.name);
    if (success) {
      added++;
    } else {
      skipped++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Complete!`);
  console.log(`   Added: ${added} games`);
  console.log(`   Skipped: ${skipped} games`);
  console.log(`${'='.repeat(60)}\n`);
}

main();
