// Script to investigate and fix game_id 1022
import { supabase } from './src/services/supabase.js';

async function fixGame1022() {
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
        console.log('Sample ratings:', ratingsData.slice(0, 3).map(r => ({
          id: r.id,
          user_id: r.user_id,
          rating: r.rating,
          has_review: !!r.review
        })));
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

    // 4. Analysis and recommendation
    console.log('\n📋 ANALYSIS SUMMARY:');
    console.log('==================');
    
    const hasData = gameData.summary || gameData.publisher || gameData.developer;
    const hasDependencies = ratingsData.length > 0 || progressData.length > 0;
    
    console.log(`Game name: "${gameData.name}"`);
    console.log(`IGDB ID: ${gameData.igdb_id || 'NULL'}`);
    console.log(`Has data: ${hasData ? 'YES' : 'NO'}`);
    console.log(`Has dependencies: ${hasDependencies ? 'YES' : 'NO'}`);
    console.log(`Dependencies: ${ratingsData.length} ratings, ${progressData.length} progress entries`);

    // 5. Decide action and execute
    if (gameData.igdb_id && !hasData) {
      console.log('\n🔧 RECOMMENDED ACTION: Fetch data from IGDB API');
      console.log('Attempting to fetch from IGDB...');
      
      // Use the existing IGDB service to fetch data
      try {
        // Import the IGDB service
        const { igdbService } = await import('./src/services/igdbService.js');
        
        console.log(`Fetching IGDB data for ID: ${gameData.igdb_id}`);
        const igdbData = await igdbService.getGameById(gameData.igdb_id);
        
        if (igdbData) {
          const transformedGame = igdbService.transformGame(igdbData);
          
          console.log('✅ IGDB data found:', {
            name: transformedGame.name,
            summary: transformedGame.summary ? 'HAS_SUMMARY' : 'NULL',
            publisher: transformedGame.publisher || 'NULL',
            developer: transformedGame.developer || 'NULL'
          });

          // Update the game record
          const { data: updatedGame, error: updateError } = await supabase
            .from('game')
            .update({
              name: transformedGame.name,
              summary: transformedGame.summary,
              publisher: transformedGame.publisher,
              developer: transformedGame.developer,
              first_release_date: transformedGame.first_release_date 
                ? new Date(transformedGame.first_release_date * 1000).toISOString().split('T')[0]
                : null,
              cover_url: transformedGame.cover_url,
              genres: transformedGame.genres || [],
              platforms: transformedGame.platforms || [],
              igdb_rating: Math.round(transformedGame.igdb_rating || 0),
              updated_at: new Date().toISOString()
            })
            .eq('id', 1022)
            .select()
            .single();

          if (updateError) {
            console.error('❌ Error updating game:', updateError);
          } else {
            console.log('✅ Game updated successfully!');
            console.log('Updated game:', {
              name: updatedGame.name,
              summary: updatedGame.summary ? updatedGame.summary.substring(0, 100) + '...' : 'NULL',
              publisher: updatedGame.publisher,
              developer: updatedGame.developer
            });
          }
        } else {
          console.log('❌ No IGDB data found for this ID');
          console.log('🔧 FALLBACK: Setting placeholder data');
          await setPlaceholderData();
        }
      } catch (igdbError) {
        console.error('❌ Error fetching from IGDB:', igdbError);
        console.log('🔧 FALLBACK: Setting placeholder data');
        await setPlaceholderData();
      }
    } else if (!gameData.igdb_id && !hasDependencies) {
      console.log('\n🗑️ RECOMMENDED ACTION: Safe to delete');
      console.log('This game has no IGDB ID and no user dependencies');
      
      const { error: deleteError } = await supabase
        .from('game')
        .delete()
        .eq('id', 1022);

      if (deleteError) {
        console.error('❌ Error deleting game:', deleteError);
      } else {
        console.log('✅ Game deleted successfully!');
      }
    } else if (!gameData.igdb_id && hasDependencies) {
      console.log('\n📝 RECOMMENDED ACTION: Update with placeholder data');
      await setPlaceholderData();
    } else {
      console.log('\nℹ️ Game appears to have data already, no action needed');
    }

    // Function to set placeholder data
    async function setPlaceholderData() {
      const { data: updatedGame, error: updateError } = await supabase
        .from('game')
        .update({
          name: gameData.name || 'Unknown Game',
          summary: 'This game entry is being updated. Game information will be available soon.',
          publisher: 'Unknown Publisher',
          developer: 'Unknown Developer',
          updated_at: new Date().toISOString()
        })
        .eq('id', 1022)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating with placeholder data:', updateError);
      } else {
        console.log('✅ Placeholder data set successfully!');
      }
    }

    // 6. Refresh materialized view
    console.log('\n🔄 Refreshing materialized view...');
    const { error: refreshError } = await supabase.rpc('refresh_materialized_view_concurrently', {
      view_name: 'popular_game_cached'
    });

    if (refreshError) {
      console.error('❌ Error refreshing materialized view:', refreshError);
      console.log('ℹ️ You may need to refresh this manually in the database');
    } else {
      console.log('✅ Materialized view refreshed successfully!');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the script
fixGame1022().then(() => {
  console.log('\n🎉 Script completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});