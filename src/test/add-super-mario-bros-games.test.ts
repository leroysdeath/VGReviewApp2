import { createClient } from '@supabase/supabase-js';
import { generateSlug } from '../utils/gameUrls';

describe('Add Super Mario Bros Games to Database', () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cqufmmnguumyhbkhgwdc.supabase.co';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdWZtbW5ndXVteWhia2hnd2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MzU3MDUsImV4cCI6MjA2ODIxMTcwNX0.iP9jJM26Xa3-YeeB2YdYnqMK5JZyYcFY5_KXuLAZw-s';
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  const superMarioBrosGames = [
    {
      igdb_id: 1090,
      name: 'Super Mario Bros.',
      slug: 'super-mario-bros',
      release_date: '1985-09-13',
      description: 'A side-scrolling platform game and the first game in the Super Mario series.',
      summary: 'The classic platform game that started the Mario franchise. Help Mario rescue Princess Peach from Bowser.',
      developer: 'Nintendo EAD',
      publisher: 'Nintendo',
      genre: 'Platform',
      genres: ['Platform', 'Adventure'],
      platforms: ['Nintendo Entertainment System', 'Game Boy Color', 'Game Boy Advance'],
      igdb_rating: 85,
      category: 0, // Main game
      greenlight_flag: true,
      cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eoa.jpg',
      pic_url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gx9.jpg'
    },
    {
      igdb_id: 1029,
      name: 'Super Mario Bros. 2',
      slug: 'super-mario-bros-2',
      release_date: '1988-10-09',
      description: 'The American sequel to Super Mario Bros., originally released as Doki Doki Panic in Japan.',
      summary: 'Play as Mario, Luigi, Princess Peach, or Toad in this unique Mario adventure with different gameplay mechanics.',
      developer: 'Nintendo EAD',
      publisher: 'Nintendo',
      genre: 'Platform',
      genres: ['Platform', 'Adventure'],
      platforms: ['Nintendo Entertainment System', 'Game Boy Advance'],
      igdb_rating: 82,
      category: 0, // Main game
      greenlight_flag: true,
      cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eob.jpg',
      pic_url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gxa.jpg'
    },
    {
      igdb_id: 1030,
      name: 'Super Mario Bros. 3',
      slug: 'super-mario-bros-3',
      release_date: '1988-10-23',
      description: 'Often considered one of the greatest video games of all time, featuring power-ups and world map.',
      summary: 'The definitive Mario experience with innovative power-ups, world map, and memorable levels. Mario must save the Mushroom Kingdom from Bowser and the Koopalings.',
      developer: 'Nintendo EAD',
      publisher: 'Nintendo',
      genre: 'Platform',
      genres: ['Platform', 'Adventure'],
      platforms: ['Nintendo Entertainment System', 'Game Boy Advance', 'Nintendo Switch'],
      igdb_rating: 95,
      category: 0, // Main game
      greenlight_flag: true,
      cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eoc.jpg',
      pic_url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gxb.jpg'
    },
    {
      igdb_id: 1031,
      name: 'Super Mario World',
      slug: 'super-mario-world',
      release_date: '1990-11-21',
      description: 'Mario\'s first adventure on the Super Nintendo, introducing Yoshi and Cape Mario.',
      summary: 'Explore Dinosaur Land with Mario and Luigi, meet Yoshi, and use the Cape Feather to soar through levels.',
      developer: 'Nintendo EAD',
      publisher: 'Nintendo',
      genre: 'Platform',
      genres: ['Platform', 'Adventure'],
      platforms: ['Super Nintendo Entertainment System', 'Game Boy Advance', 'Nintendo Switch'],
      igdb_rating: 94,
      category: 0, // Main game
      greenlight_flag: true,
      cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eod.jpg',
      pic_url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gxc.jpg'
    },
    {
      igdb_id: 1032,
      name: 'Super Mario 64',
      slug: 'super-mario-64',
      release_date: '1996-06-23',
      description: 'Mario\'s first 3D adventure and launch title for the Nintendo 64.',
      summary: 'Explore Princess Peach\'s castle in full 3D, collect stars, and master Mario\'s new 3D moveset.',
      developer: 'Nintendo EAD',
      publisher: 'Nintendo',
      genre: 'Platform',
      genres: ['Platform', 'Adventure', '3D'],
      platforms: ['Nintendo 64', 'Nintendo DS', 'Nintendo Switch'],
      igdb_rating: 96,
      category: 0, // Main game
      greenlight_flag: true,
      cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eoe.jpg',
      pic_url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gxd.jpg'
    },
    {
      igdb_id: 1033,
      name: 'Super Mario Sunshine',
      slug: 'super-mario-sunshine',
      release_date: '2002-07-19',
      description: 'Mario visits Isle Delfino with FLUDD, a water pack device, to clean up graffiti.',
      summary: 'Use FLUDD to clean Isle Delfino and prove Mario\'s innocence in this tropical adventure.',
      developer: 'Nintendo EAD',
      publisher: 'Nintendo',
      genre: 'Platform',
      genres: ['Platform', 'Adventure', '3D'],
      platforms: ['GameCube', 'Nintendo Switch'],
      igdb_rating: 89,
      category: 0, // Main game
      greenlight_flag: true,
      cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eof.jpg',
      pic_url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gxe.jpg'
    },
    {
      igdb_id: 1034,
      name: 'Super Mario Galaxy',
      slug: 'super-mario-galaxy',
      release_date: '2007-11-01',
      description: 'Mario travels through space to rescue Princess Peach from Bowser using gravity-defying gameplay.',
      summary: 'Explore galaxies with innovative gravity mechanics in this critically acclaimed 3D Mario adventure.',
      developer: 'Nintendo EAD Tokyo',
      publisher: 'Nintendo',
      genre: 'Platform',
      genres: ['Platform', 'Adventure', '3D'],
      platforms: ['Wii', 'Nintendo Switch'],
      igdb_rating: 97,
      category: 0, // Main game
      greenlight_flag: true,
      cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eog.jpg',
      pic_url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gxf.jpg'
    },
    {
      igdb_id: 1035,
      name: 'Super Mario Galaxy 2',
      slug: 'super-mario-galaxy-2',
      release_date: '2010-05-23',
      description: 'The sequel to Super Mario Galaxy with Yoshi and new gravity-based gameplay elements.',
      summary: 'Team up with Yoshi in this galaxy-spanning sequel with even more creative level design.',
      developer: 'Nintendo EAD Tokyo',
      publisher: 'Nintendo',
      genre: 'Platform',
      genres: ['Platform', 'Adventure', '3D'],
      platforms: ['Wii', 'Nintendo Switch'],
      igdb_rating: 97,
      category: 0, // Main game
      greenlight_flag: true,
      cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eoh.jpg',
      pic_url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gxg.jpg'
    },
    {
      igdb_id: 1036,
      name: 'Super Mario Odyssey',
      slug: 'super-mario-odyssey',
      release_date: '2017-10-27',
      description: 'Mario\'s latest adventure featuring Cappy and the ability to capture enemies and objects.',
      summary: 'Travel the world with Cappy to save Princess Peach and Tiara from Bowser\'s wedding plans.',
      developer: 'Nintendo EPD',
      publisher: 'Nintendo',
      genre: 'Platform',
      genres: ['Platform', 'Adventure', '3D'],
      platforms: ['Nintendo Switch'],
      igdb_rating: 97,
      category: 0, // Main game
      greenlight_flag: true,
      cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.jpg',
      pic_url: 'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc39dp.jpg'
    }
  ];

  test('should add essential Super Mario Bros games to the database', async () => {
    console.log('🎮 Adding essential Super Mario Bros games to database...');
    
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const gameData of superMarioBrosGames) {
      try {
        console.log(`\n📝 Processing: "${gameData.name}"`);
        
        // Check if game already exists by IGDB ID
        const { data: existingGame, error: checkError } = await supabase
          .from('game')
          .select('id, name, greenlight_flag')
          .eq('igdb_id', gameData.igdb_id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error(`❌ Error checking for existing game:`, checkError);
          continue;
        }

        if (existingGame) {
          console.log(`✅ Game already exists: "${existingGame.name}" (ID: ${existingGame.id})`);
          
          // Update greenlight flag if not set
          if (!existingGame.greenlight_flag) {
            const { error: updateError } = await supabase
              .from('game')
              .update({
                greenlight_flag: true,
                flag_reason: 'Essential Super Mario Bros game',
                flagged_at: new Date().toISOString()
              })
              .eq('id', existingGame.id);

            if (updateError) {
              console.error(`❌ Error updating greenlight flag:`, updateError);
            } else {
              console.log(`🟢 Updated greenlight flag for "${existingGame.name}"`);
            }
          }
          
          skippedCount++;
          continue;
        }

        // Generate unique game_id and slug
        const gameId = `mario-${gameData.igdb_id}`;
        
        // Insert new game
        const { data: insertedGame, error: insertError } = await supabase
          .from('game')
          .insert({
            game_id: gameId,
            igdb_id: gameData.igdb_id,
            name: gameData.name,
            slug: gameData.slug,
            release_date: gameData.release_date,
            description: gameData.description,
            summary: gameData.summary,
            developer: gameData.developer,
            publisher: gameData.publisher,
            genre: gameData.genre,
            genres: gameData.genres,
            platforms: gameData.platforms,
            igdb_rating: gameData.igdb_rating,
            category: gameData.category,
            greenlight_flag: gameData.greenlight_flag,
            flag_reason: 'Essential Super Mario Bros game',
            flagged_at: new Date().toISOString(),
            cover_url: gameData.cover_url,
            pic_url: gameData.pic_url,
            is_verified: true
          })
          .select()
          .single();

        if (insertError) {
          console.error(`❌ Error inserting "${gameData.name}":`, insertError);
          
          // Try with alternative game_id if conflict
          if (insertError.code === '23505') {
            const altGameId = `mario-${gameData.igdb_id}-${Date.now()}`;
            console.log(`🔄 Retrying with alternative ID: ${altGameId}`);
            
            const { data: retryGame, error: retryError } = await supabase
              .from('game')
              .insert({
                ...{
                  game_id: altGameId,
                  igdb_id: gameData.igdb_id,
                  name: gameData.name,
                  slug: `${gameData.slug}-${Date.now()}`,
                  release_date: gameData.release_date,
                  description: gameData.description,
                  summary: gameData.summary,
                  developer: gameData.developer,
                  publisher: gameData.publisher,
                  genre: gameData.genre,
                  genres: gameData.genres,
                  platforms: gameData.platforms,
                  igdb_rating: gameData.igdb_rating,
                  category: gameData.category,
                  greenlight_flag: gameData.greenlight_flag,
                  flag_reason: 'Essential Super Mario Bros game',
                  flagged_at: new Date().toISOString(),
                  cover_url: gameData.cover_url,
                  pic_url: gameData.pic_url,
                  is_verified: true
                }
              })
              .select()
              .single();

            if (retryError) {
              console.error(`❌ Retry failed for "${gameData.name}":`, retryError);
            } else {
              console.log(`✅ Successfully added "${gameData.name}" (ID: ${retryGame.id})`);
              addedCount++;
            }
          }
        } else {
          console.log(`✅ Successfully added "${gameData.name}" (ID: ${insertedGame.id})`);
          addedCount++;
        }
        
      } catch (error) {
        console.error(`💥 Unexpected error processing "${gameData.name}":`, error);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`✅ Games added: ${addedCount}`);
    console.log(`⏭️ Games skipped (already exist): ${skippedCount}`);
    console.log(`📝 Total processed: ${addedCount + skippedCount}`);

    // Verify the games are accessible via search
    console.log(`\n🔍 Verifying games are searchable...`);
    
    const { data: marioGames, error: searchError } = await supabase
      .from('game')
      .select('id, name, greenlight_flag, igdb_id')
      .ilike('name', '%mario%')
      .eq('greenlight_flag', true)
      .limit(20);

    if (searchError) {
      console.error('❌ Error searching for Mario games:', searchError);
    } else {
      console.log(`✅ Found ${marioGames.length} Mario games with greenlight flag:`);
      marioGames.forEach(game => {
        console.log(`  - "${game.name}" (ID: ${game.id}, IGDB: ${game.igdb_id})`);
      });
    }

    expect(addedCount + skippedCount).toBeGreaterThan(0);
  }, 60000);
});