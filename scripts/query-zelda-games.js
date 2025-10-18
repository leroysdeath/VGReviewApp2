import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cqufmmnguumyhbkhgwdc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdWZtbW5ndXVteWhia2hnd2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MzU3MDUsImV4cCI6MjA2ODIxMTcwNX0.iP9jJM26Xa3-YeeB2YdYnqMK5JZyYcFY5_KXuLAZw-s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryZeldaGames() {
  const { data, error } = await supabase
    .from('game')
    .select('name, igdb_rating, release_date, igdb_id')
    .ilike('name', '%zelda%')
    .order('igdb_rating', { ascending: false, nullsFirst: false })
    .limit(30);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Zelda Games Found:', data.length);
  console.log('\n=== ALL ZELDA GAMES (Sorted by Rating) ===\n');
  data.forEach((game, index) => {
    console.log(`${index + 1}. ${game.name}`);
    console.log(`   Rating: ${game.igdb_rating || 'N/A'}`);
    console.log(`   Release Date: ${game.release_date || 'N/A'}`);
    console.log(`   IGDB ID: ${game.igdb_id || 'N/A'}`);
    console.log('');
  });

  // Check for specific games from the reference image
  console.log('\n=== REFERENCE GAMES CHECK ===\n');
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

  referenceGames.forEach((refGame, index) => {
    const found = data.find(game => game.name.toLowerCase().includes(refGame.toLowerCase().substring(0, 30)));
    console.log(`${index + 1}. ${refGame}`);
    console.log(`   Status: ${found ? '✅ FOUND' : '❌ MISSING'}`);
    if (found) {
      console.log(`   DB Name: ${found.name}`);
      console.log(`   Rating: ${found.igdb_rating || 'N/A'}`);
    }
    console.log('');
  });
}

queryZeldaGames();
