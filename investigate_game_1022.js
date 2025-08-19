import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function investigateGame1022() {
  console.log('🔍 Investigating game_id 1022...\n');

  try {
    // 1. Check the game record itself
    console.log('1. Checking game record:');
    const { data: gameData, error: gameError } = await supabase
      .from('game')
      .select('*')
      .eq('id', 1022)
      .single();

    if (gameError) {
      console.error('❌ Error fetching game:', gameError);
      return;
    }

    console.log('Game data:', {
      id: gameData.id,
      igdb_id: gameData.igdb_id,
      name: gameData.name,
      summary: gameData.summary ? 'HAS_SUMMARY' : 'NULL',
      publisher: gameData.publisher || 'NULL',
      developer: gameData.developer || 'NULL',
      first_release_date: gameData.first_release_date || 'NULL',
      cover_url: gameData.cover_url ? 'HAS_COVER' : 'NULL',
      created_at: gameData.created_at,
      updated_at: gameData.updated_at
    });

    // 2. Check for ratings/reviews
    console.log('\n2. Checking for ratings/reviews:');
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('rating')
      .select('id, user_id, rating, review, post_date_time')
      .eq('game_id', 1022);

    if (ratingsError) {
      console.error('❌ Error fetching ratings:', ratingsError);
    } else {
      console.log(`Found ${ratingsData.length} ratings for this game`);
      if (ratingsData.length > 0) {
        console.log('Sample ratings:', ratingsData.slice(0, 3));
      }
    }

    // 3. Check for game progress
    console.log('\n3. Checking for game progress entries:');
    const { data: progressData, error: progressError } = await supabase
      .from('game_progress')
      .select('id, user_id, started, completed, started_date, completed_date')
      .eq('game_id', 1022);

    if (progressError) {
      console.error('❌ Error fetching progress:', progressError);
    } else {
      console.log(`Found ${progressData.length} progress entries for this game`);
      if (progressData.length > 0) {
        console.log('Sample progress:', progressData.slice(0, 3));
      }
    }

    // 4. Check if IGDB ID exists and is valid
    console.log('\n4. IGDB ID Analysis:');
    if (gameData.igdb_id) {
      console.log(`✅ Has IGDB ID: ${gameData.igdb_id}`);
      console.log('This suggests it\'s a real game that needs data population from IGDB');
    } else {
      console.log('❌ No IGDB ID - this might be a placeholder/test entry');
    }

    // 5. Summary and recommendations
    console.log('\n📋 ANALYSIS SUMMARY:');
    console.log('==================');
    
    const hasData = gameData.summary || gameData.publisher || gameData.developer;
    const hasDependencies = ratingsData.length > 0 || progressData.length > 0;
    
    if (gameData.igdb_id && !hasData) {
      console.log('🔧 RECOMMENDATION: Fetch data from IGDB API');
      console.log(`   - Game has IGDB ID ${gameData.igdb_id} but missing summary/publisher/developer`);
      console.log('   - Should populate from IGDB API');
    } else if (!gameData.igdb_id && !hasDependencies) {
      console.log('🗑️ RECOMMENDATION: Safe to delete');
      console.log('   - No IGDB ID and no user data dependencies');
    } else if (!gameData.igdb_id && hasDependencies) {
      console.log('📝 RECOMMENDATION: Update with placeholder data');
      console.log('   - No IGDB ID but has user dependencies');
      console.log('   - Should update with meaningful placeholder text');
    } else {
      console.log('ℹ️ RECOMMENDATION: Review manually');
      console.log('   - Complex case requiring manual review');
    }

    if (hasDependencies) {
      console.log(`⚠️ WARNING: Game has ${ratingsData.length} ratings and ${progressData.length} progress entries`);
      console.log('   - Consider user impact before making changes');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

investigateGame1022();