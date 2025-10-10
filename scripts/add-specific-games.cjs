#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function addGame(gameData) {
  const { data, error } = await supabase
    .from('game')
    .insert([gameData])
    .select();

  if (error) {
    if (error.message.includes('duplicate key')) {
      console.log(`   ⚠️  Game already exists: ${gameData.name}`);
      return null;
    }
    console.error(`   ❌ Error adding ${gameData.name}:`, error.message);
    return null;
  }

  console.log(`   ✅ Successfully added: ${gameData.name}`);
  return data[0];
}

async function addGames() {
  console.log('🎮 Adding specific games to database...\n');

  const games = [
    {
      game_id: '1638',
      igdb_id: 1638,
      name: 'GoldenEye 007',
      slug: 'goldeneye-007-n64',
      summary: "GoldenEye 007 is a first-person shooter based on the 1995 James Bond film. The game features a single-player campaign with 20 missions across multiple difficulty levels, emphasizing stealth, varied objectives and mission-based progression. Players can use a range of weapons and gadgets while navigating diverse environments inspired by the movie.\n\nThe local split-screen multiplayer mode supports up to four players and offers competitive scenarios such as deathmatch, team modes and character selection from the James Bond universe. The multiplayer component became widely recognized for its influence on console FPS design and is considered a landmark feature of the game.",
      description: "GoldenEye 007 is a first-person shooter based on the 1995 James Bond film.",
      release_date: '1997-08-25',
      igdb_rating: null,
      cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/coa0y2.jpg',
      pic_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/coa0y2.jpg',
      igdb_link: 'https://www.igdb.com/games/goldeneye-007',
      genre: 'Shooter',
      genres: ['Shooter'],
      developer: 'Rare',
      publisher: 'Nintendo',
      platforms: ['Nintendo 64'],
      is_verified: false,
      view_count: 0
    },
    {
      game_id: '119171',
      igdb_id: 119171,
      name: 'Pikmin 1+2',
      slug: 'pikmin-1-2-switch',
      summary: "Pikmin 1+2 contains enhanced versions of both Pikmin and Pikmin 2 games, remastered for Nintendo Switch. Command a pikmin army as you solve puzzles and battle creatures across alien worlds.",
      description: "Pikmin 1+2 contains enhanced versions of both Pikmin and Pikmin 2 games for Nintendo Switch.",
      release_date: '2023-09-22',
      igdb_rating: null,
      cover_url: null,
      pic_url: null,
      igdb_link: 'https://www.igdb.com/games/pikmin-1-plus-2',
      genre: 'Strategy',
      genres: ['Strategy', 'Puzzle'],
      developer: 'Nintendo',
      publisher: 'Nintendo',
      platforms: ['Nintendo Switch'],
      is_verified: false,
      view_count: 0
    }
  ];

  let added = 0;
  let skipped = 0;

  for (const game of games) {
    const result = await addGame(game);
    if (result) {
      added++;
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ Complete! Added ${added} games, skipped ${skipped} duplicates`);
}

addGames().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
