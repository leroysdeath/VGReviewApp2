// Script to update incomplete game entries with full IGDB data
import { supabase } from './src/services/supabase.js';
import { igdbService } from './src/services/igdbService.js';

// Games to update with their IGDB IDs
const gamesToUpdate = [
  { name: 'Far Cry 3: Blood Dragon', igdb_id: 2001 },
  { name: 'Age of Empires II: Definitive Edition', igdb_id: 55056 },
  { name: 'Skies of Arcadia Legends', igdb_id: 4152 },
  { name: 'Clair Obscur: Expedition 33', igdb_id: 305152 },
  { name: 'Star Wars: Knights of the Old Republic', igdb_id: 116 },
  { name: 'Mario Kart Tour: Mario Bros. Tour', igdb_id: 338616 },
  { name: 'The Legend of Zelda: Ocarina of Time - Master Quest', igdb_id: 45142 }
];

// Generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Generate IGDB link
function generateIGDBLink(igdbId, slug) {
  // IGDB URLs typically use the slug if available
  return slug ? `https://www.igdb.com/games/${slug}` : `https://www.igdb.com/games/game-${igdbId}`;
}

// Infer platforms from game name
function inferPlatforms(name) {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('tour') && nameLower.includes('mario')) {
    return ['iOS', 'Android'];
  }
  if (nameLower.includes('definitive edition')) {
    return ['PC', 'Xbox One', 'PlayStation 4', 'Nintendo Switch'];
  }
  if (nameLower.includes('master quest')) {
    return ['Nintendo GameCube', 'Nintendo 3DS'];
  }
  if (nameLower.includes('legends')) {
    return ['Nintendo GameCube'];
  }
  
  // Default platforms for older games
  return ['PC', 'Console'];
}

// Create default data for a game
function createDefaultData(game) {
  const slug = generateSlug(game.name);
  return {
    slug: slug,
    summary: 'Game description pending update.',
    platforms: inferPlatforms(game.name),
    developer: 'Unknown Developer',
    publisher: 'Unknown Publisher',
    igdb_link: generateIGDBLink(game.igdb_id, slug),
    screenshots: [],
    cover_url: null
  };
}

// Update a single game
async function updateGame(game) {
  console.log(`\n📎 Processing: ${game.name} (IGDB ID: ${game.igdb_id})`);
  console.log('=' .repeat(60));

  try {
    // First, check current state in database
    const { data: currentData, error: fetchError } = await supabase
      .from('game')
      .select('*')
      .eq('igdb_id', game.igdb_id)
      .single();

    if (fetchError) {
      console.error(`❌ Error fetching current data:`, fetchError);
      return { success: false, error: fetchError };
    }

    if (!currentData) {
      console.log(`⚠️ Game not found in database with IGDB ID ${game.igdb_id}`);
      return { success: false, error: 'Game not found' };
    }

    console.log('📊 Current state:', {
      has_slug: !!currentData.slug,
      has_summary: !!currentData.summary,
      has_cover: !!currentData.cover_url,
      has_screenshots: currentData.screenshots?.length > 0,
      has_platforms: currentData.platforms?.length > 0,
      has_developer: !!currentData.developer,
      has_publisher: !!currentData.publisher,
      has_igdb_link: !!currentData.igdb_link
    });

    let updateData = {};
    let dataSource = 'IGDB';

    // Try to fetch from IGDB
    try {
      console.log('🌐 Fetching from IGDB API...');
      const igdbData = await igdbService.getGameById(game.igdb_id);

      if (igdbData) {
        console.log('✅ IGDB data received');
        const transformedGame = igdbService.transformGame(igdbData);

        // Build update object, only updating null/missing fields
        updateData = {
          slug: currentData.slug || transformedGame.slug || generateSlug(transformedGame.name),
          summary: currentData.summary || transformedGame.summary || 'Game description pending update.',
          cover_url: currentData.cover_url || transformedGame.cover_url,
          screenshots: (currentData.screenshots && currentData.screenshots.length > 0) 
            ? currentData.screenshots 
            : transformedGame.screenshots || [],
          platforms: (currentData.platforms && currentData.platforms.length > 0)
            ? currentData.platforms
            : transformedGame.platforms || inferPlatforms(game.name),
          developer: currentData.developer || transformedGame.developer || 'Unknown Developer',
          publisher: currentData.publisher || transformedGame.publisher || 'Unknown Publisher',
          igdb_link: currentData.igdb_link || generateIGDBLink(game.igdb_id, transformedGame.slug || generateSlug(transformedGame.name)),
          
          // Also update these fields if they're missing
          genres: (currentData.genres && currentData.genres.length > 0)
            ? currentData.genres
            : transformedGame.genres || [],
          igdb_rating: currentData.igdb_rating || transformedGame.igdb_rating || 0,
          
          // Update timestamp
          updated_at: new Date().toISOString()
        };

        // Don't overwrite existing non-null fields
        if (currentData.first_release_date) {
          delete updateData.first_release_date;
        } else if (transformedGame.first_release_date) {
          updateData.first_release_date = new Date(transformedGame.first_release_date * 1000).toISOString().split('T')[0];
        }

      } else {
        console.log('⚠️ No IGDB data found, using defaults');
        dataSource = 'defaults';
        updateData = createDefaultData(game);
      }
    } catch (igdbError) {
      console.error('❌ IGDB fetch failed:', igdbError.message);
      console.log('📝 Using default data as fallback');
      dataSource = 'defaults';
      
      // Create default data for missing fields only
      const defaults = createDefaultData(game);
      updateData = {
        slug: currentData.slug || defaults.slug,
        summary: currentData.summary || defaults.summary,
        cover_url: currentData.cover_url || defaults.cover_url,
        screenshots: (currentData.screenshots && currentData.screenshots.length > 0) 
          ? currentData.screenshots 
          : defaults.screenshots,
        platforms: (currentData.platforms && currentData.platforms.length > 0)
          ? currentData.platforms
          : defaults.platforms,
        developer: currentData.developer || defaults.developer,
        publisher: currentData.publisher || defaults.publisher,
        igdb_link: currentData.igdb_link || defaults.igdb_link,
        updated_at: new Date().toISOString()
      };
    }

    // Update the database
    console.log(`📤 Updating database (source: ${dataSource})...`);
    const { data: updatedGame, error: updateError } = await supabase
      .from('game')
      .update(updateData)
      .eq('igdb_id', game.igdb_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update failed:', updateError);
      return { success: false, error: updateError };
    }

    console.log('✅ Successfully updated!');
    console.log('📋 Updated fields:', {
      slug: updatedGame.slug,
      summary: updatedGame.summary ? `${updatedGame.summary.substring(0, 50)}...` : 'NULL',
      cover_url: updatedGame.cover_url ? 'SET' : 'NULL',
      screenshots: `${updatedGame.screenshots?.length || 0} screenshots`,
      platforms: updatedGame.platforms?.join(', ') || 'NULL',
      developer: updatedGame.developer,
      publisher: updatedGame.publisher,
      igdb_link: updatedGame.igdb_link
    });

    return { success: true, data: updatedGame };

  } catch (error) {
    console.error(`💥 Unexpected error for ${game.name}:`, error);
    return { success: false, error };
  }
}

// Main execution
async function updateAllGames() {
  console.log('🎮 Starting batch game update process');
  console.log(`📝 Processing ${gamesToUpdate.length} games`);
  console.log('=' .repeat(60));

  const results = {
    successful: [],
    failed: []
  };

  // Process each game
  for (const game of gamesToUpdate) {
    const result = await updateGame(game);
    
    if (result.success) {
      results.successful.push(game.name);
    } else {
      results.failed.push({ name: game.name, error: result.error });
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 UPDATE SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ Successfully updated: ${results.successful.length} games`);
  if (results.successful.length > 0) {
    results.successful.forEach(name => console.log(`   • ${name}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed updates: ${results.failed.length} games`);
    results.failed.forEach(({ name, error }) => {
      console.log(`   • ${name}: ${error.message || error}`);
    });
  }

  // Refresh materialized view
  console.log('\n🔄 Refreshing materialized view...');
  try {
    // Try using the function first
    const { error: refreshError } = await supabase.rpc('refresh_materialized_view_concurrently', {
      view_name: 'popular_game_cached'
    });

    if (refreshError) {
      console.log('⚠️ Function not available, trying direct refresh...');
      // If function doesn't exist, we can't directly run REFRESH MATERIALIZED VIEW through Supabase client
      console.log('ℹ️ Please run this SQL manually in your database:');
      console.log('   REFRESH MATERIALIZED VIEW CONCURRENTLY popular_game_cached;');
    } else {
      console.log('✅ Materialized view refreshed successfully!');
    }
  } catch (error) {
    console.log('⚠️ Could not refresh materialized view automatically');
    console.log('ℹ️ Please run this SQL manually in your database:');
    console.log('   REFRESH MATERIALIZED VIEW CONCURRENTLY popular_game_cached;');
  }

  return results;
}

// Run the update process
console.log('🚀 Batch Game Update Script');
console.log('📅 Started at:', new Date().toISOString());
console.log('');

updateAllGames()
  .then(results => {
    console.log('\n✨ Script completed successfully!');
    console.log('📅 Finished at:', new Date().toISOString());
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Script failed with error:', error);
    process.exit(1);
  });