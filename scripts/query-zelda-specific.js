import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cqufmmnguumyhbkhgwdc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdWZtbW5ndXVteWhia2hnd2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MzU3MDUsImV4cCI6MjA2ODIxMTcwNX0.iP9jJM26Xa3-YeeB2YdYnqMK5JZyYcFY5_KXuLAZw-s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function querySpecificZeldaGames() {
  // Reference games we're looking for
  const referenceGames = [
    'The Legend of Zelda: Breath of the Wild',
    'The Legend of Zelda: Ocarina of Time',
    'The Legend of Zelda: A Link to the Past',
    'The Legend of Zelda: Tears of the Kingdom',
    'The Legend of Zelda: Ocarina of Time 3D',
    'The Legend of Zelda: The Wind Waker HD',
    "The Legend of Zelda: Link's Awakening",
    'Cadence of Hyrule: Crypt of the NecroDancer Featuring the Legend of Zelda'
  ];

  console.log('=== CHECKING SPECIFIC ZELDA GAMES ===\n');

  for (const gameName of referenceGames) {
    // Query each game individually to avoid timeout
    const { data, error } = await supabase
      .from('game')
      .select('name, igdb_rating, release_date, igdb_id')
      .ilike('name', `%${gameName.substring(0, 30)}%`)
      .limit(5);

    if (error) {
      console.log(`❌ Error checking "${gameName}": ${error.message}`);
      continue;
    }

    if (data && data.length > 0) {
      console.log(`✅ FOUND: ${gameName}`);
      data.forEach(game => {
        console.log(`   DB Name: ${game.name}`);
        console.log(`   Rating: ${game.igdb_rating || 'N/A'}`);
        console.log(`   Release Date: ${game.release_date || 'N/A'}`);
        console.log(`   IGDB ID: ${game.igdb_id || 'N/A'}`);
      });
    } else {
      console.log(`❌ MISSING: ${gameName}`);
    }
    console.log('');
  }

  // Also do a broad query for any Zelda games
  console.log('\n=== SAMPLE OF ALL ZELDA GAMES (first 20) ===\n');
  const { data: allZelda, error: allError } = await supabase
    .from('game')
    .select('name, igdb_rating')
    .textSearch('name', 'zelda', { type: 'plain', config: 'english' })
    .order('igdb_rating', { ascending: false, nullsFirst: false })
    .limit(20);

  if (allError) {
    console.log(`Error fetching all Zelda games: ${allError.message}`);
  } else if (allZelda) {
    console.log(`Total Zelda games in sample: ${allZelda.length}`);
    allZelda.forEach((game, index) => {
      console.log(`${index + 1}. ${game.name} (Rating: ${game.igdb_rating || 'N/A'})`);
    });
  }
}

querySpecificZeldaGames();
