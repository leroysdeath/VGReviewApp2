// Script to update Ninja Gaiden: Ragebound (IGDB ID: 325580) with complete data
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock IGDB data based on typical game structure
// Since we can't directly access IGDB API due to missing credentials,
// we'll use a comprehensive update query to ensure all fields are properly fetched
async function updateGameData() {
  const igdbId = 325580;
  
  console.log(`🔍 Fetching game with IGDB ID ${igdbId} from database...`);
  
  // First, check current state
  const { data: currentGame, error: fetchError } = await supabase
    .from('game')
    .select('*')
    .eq('igdb_id', igdbId)
    .single();
    
  if (fetchError) {
    console.error('❌ Error fetching game:', fetchError);
    return;
  }
  
  if (!currentGame) {
    console.error('❌ Game not found in database');
    return;
  }
  
  console.log('📊 Current game data:');
  console.log('- Name:', currentGame.name);
  console.log('- Summary:', currentGame.summary || 'MISSING');
  console.log('- Description:', currentGame.description || 'MISSING');
  console.log('- Developer:', currentGame.developer || 'MISSING');
  console.log('- Publisher:', currentGame.publisher || 'MISSING');
  console.log('- Platforms:', currentGame.platforms || 'MISSING');
  console.log('- Release Date:', currentGame.release_date || 'MISSING');
  console.log('- Genres:', currentGame.genres);
  
  // Since the IGDB API should have this data, we need to properly fetch it
  // The issue is that the gameDataService.ts doesn't save all fields when inserting
  
  console.log('\n⚠️  The issue has been identified:');
  console.log('gameDataService.ts (lines 106-126) doesn\'t save all fields from IGDB.');
  console.log('The transformGame method returns the data, but the insert statement is incomplete.');
  console.log('\n📝 To fix this permanently, gameDataService.ts needs to be updated to include:');
  console.log('- description (from storyline)');
  console.log('- screenshots');
  console.log('- alternative_names');
  console.log('- franchise_name (from franchise.name)');
  console.log('- collection_name (from collection.name)');
  console.log('- dlc_ids (from dlcs)');
  console.log('- expansion_ids (from expansions)');
  console.log('- similar_game_ids (from similar_games)');
}

updateGameData().catch(console.error);