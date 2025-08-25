// Script to fetch Legend of Zelda (IGDB ID 1022) and update game table row ID 32
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Environment variables
const supabaseUrl = 'https://cqufmmnguumyhbkhgwdc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdWZtbW5ndXVteWhia2hnd2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MzU3MDUsImV4cCI6MjA2ODIxMTcwNX0.iP9jJM26Xa3-YeeB2YdYnqMK5JZyYcFY5_KXuLAZw-s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateGame32WithZelda() {
  console.log('🎮 Fetching Legend of Zelda (IGDB ID: 1022) and updating game ID 32...\n');

  try {
    // Step 1: Check current state of game ID 32
    console.log('1. Checking current state of game ID 32...');
    const { data: currentGame, error: fetchError } = await supabase
      .from('game')
      .select('*')
      .eq('id', 32)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching game ID 32:', fetchError);
      return;
    }

    console.log('Current game ID 32:', {
      id: currentGame.id,
      name: currentGame.name || 'NULL',
      igdb_id: currentGame.igdb_id || 'NULL',
      developer: currentGame.developer || 'NULL',
      publisher: currentGame.publisher || 'NULL'
    });

    // Step 2: Fetch Legend of Zelda data from IGDB API
    console.log('\n2. Fetching Legend of Zelda from IGDB API...');
    
    try {
      // Try to use netlify function first
      let response;
      try {
        response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'getById',
            gameId: 1022
          })
        });
      } catch (netlifyError) {
        console.log('Netlify function not available, using direct IGDB data...');
        // Fallback to manual data if API is not available
        throw new Error('API not available');
      }

      let igdbGame = null;
      
      if (response && response.ok) {
        const data = await response.json();
        if (data.success && data.games && data.games[0]) {
          igdbGame = data.games[0];
          console.log('✅ IGDB API data found:', {
            name: igdbGame.name,
            summary: igdbGame.summary ? 'HAS_SUMMARY' : 'NULL',
            developer: igdbGame.involved_companies?.[0]?.company?.name || 'NULL',
            publisher: igdbGame.involved_companies?.[0]?.company?.name || 'NULL',
            cover: igdbGame.cover?.url || 'NULL'
          });
        }
      }
      
      // If IGDB API failed, use manual Legend of Zelda data
      if (!igdbGame) {
        console.log('🔧 Using manual Legend of Zelda data...');
        igdbGame = {
          id: 1022,
          name: 'The Legend of Zelda',
          summary: 'The Legend of Zelda is an action-adventure game developed and published by Nintendo. The first game of The Legend of Zelda series, it is set in the fantasy land of Hyrule and centers on a character named Link, who aims to collect the eight fragments of the Triforce of Wisdom in order to rescue Princess Zelda from the antagonist Ganon.',
          first_release_date: 509140800, // February 21, 1986
          rating: 85,
          cover: {
            url: '//images.igdb.com/igdb/image/upload/t_thumb/co1uii.jpg'
          },
          genres: [
            { name: 'Adventure' },
            { name: 'Role-playing (RPG)' }
          ],
          platforms: [
            { name: 'Nintendo Entertainment System (NES)' },
            { name: 'Game Boy Advance' },
            { name: 'Nintendo 3DS' }
          ],
          involved_companies: [
            {
              company: { name: 'Nintendo' }
            }
          ]
        };
      }

      // Step 3: Prepare update data
      console.log('\n3. Preparing update data...');
      const updateData = {
        igdb_id: 1022,
        name: igdbGame.name,
        summary: igdbGame.summary,
        description: igdbGame.summary, // Use summary as description too
        developer: igdbGame.involved_companies?.[0]?.company?.name || 'Nintendo',
        publisher: igdbGame.involved_companies?.[0]?.company?.name || 'Nintendo',
        release_date: igdbGame.first_release_date 
          ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
          : '1986-02-21',
        cover_url: igdbGame.cover?.url 
          ? igdbGame.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://')
          : 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1uii.jpg',
        pic_url: igdbGame.cover?.url 
          ? igdbGame.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://')
          : 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1uii.jpg',
        genres: igdbGame.genres?.map(g => g.name) || ['Adventure', 'Role-playing (RPG)'],
        genre: igdbGame.genres?.[0]?.name || 'Adventure',
        platforms: igdbGame.platforms?.map(p => p.name) || ['Nintendo Entertainment System (NES)'],
        igdb_rating: Math.round(igdbGame.rating || 85),
        updated_at: new Date().toISOString()
      };

      console.log('Update data prepared:', {
        name: updateData.name,
        igdb_id: updateData.igdb_id,
        developer: updateData.developer,
        publisher: updateData.publisher,
        release_date: updateData.release_date,
        has_summary: updateData.summary ? 'YES' : 'NO',
        has_cover: updateData.cover_url ? 'YES' : 'NO'
      });

      // Step 4: Update the database
      console.log('\n4. Updating game ID 32 in database...');
      const { data: updatedGame, error: updateError } = await supabase
        .from('game')
        .update(updateData)
        .eq('id', 32)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating game:', updateError);
      } else {
        console.log('✅ Game ID 32 updated successfully!');
        console.log('Updated game data:', {
          id: updatedGame.id,
          name: updatedGame.name,
          igdb_id: updatedGame.igdb_id,
          developer: updatedGame.developer,
          publisher: updatedGame.publisher,
          release_date: updatedGame.release_date,
          summary: updatedGame.summary ? updatedGame.summary.substring(0, 100) + '...' : 'NULL'
        });
      }

    } catch (apiError) {
      console.error('❌ Error with API:', apiError.message);
    }

    console.log('\n🎉 Update completed!');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the script
updateGame32WithZelda().then(() => {
  console.log('\n✨ Script finished!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});