// Simple script to update Legend of Zelda game data for IGDB ID 1022
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Environment variables - you'll need to set these
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLegendOfZelda() {
  console.log('🏛️ Updating Legend of Zelda (IGDB ID: 1022)...\n');

  try {
    // Step 1: Check current state
    console.log('1. Checking current game data...');
    const { data: currentGame, error: fetchError } = await supabase
      .from('game')
      .select('*')
      .eq('id', 1022)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching current game:', fetchError);
      return;
    }

    console.log('Current game data:', {
      id: currentGame.id,
      name: currentGame.name,
      igdb_id: currentGame.igdb_id,
      summary: currentGame.summary ? 'HAS_SUMMARY' : 'NULL',
      developer: currentGame.developer || 'NULL',
      publisher: currentGame.publisher || 'NULL'
    });

    // Step 2: Try to fetch from IGDB API
    console.log('\n2. Fetching from IGDB API...');
    
    try {
      const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'getById',
          gameId: 1022
        })
      });

      const data = await response.json();
      
      if (data.success && data.games && data.games[0]) {
        const igdbGame = data.games[0];
        console.log('✅ IGDB data found:', {
          name: igdbGame.name,
          summary: igdbGame.summary ? 'HAS_SUMMARY' : 'NULL',
          developer: igdbGame.involved_companies?.[0]?.company?.name || 'NULL',
          publisher: igdbGame.involved_companies?.[0]?.company?.name || 'NULL',
          cover: igdbGame.cover?.url || 'NULL'
        });

        // Step 3: Update the database
        console.log('\n3. Updating database...');
        
        const updateData = {
          name: igdbGame.name,
          summary: igdbGame.summary,
          developer: igdbGame.involved_companies?.[0]?.company?.name,
          publisher: igdbGame.involved_companies?.[0]?.company?.name,
          release_date: igdbGame.first_release_date 
            ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
            : null,
          cover_url: igdbGame.cover?.url ? igdbGame.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://') : null,
          genres: igdbGame.genres?.map(g => g.name) || [],
          platforms: igdbGame.platforms?.map(p => p.name) || [],
          igdb_rating: Math.round(igdbGame.rating || 0),
          updated_at: new Date().toISOString()
        };

        const { data: updatedGame, error: updateError } = await supabase
          .from('game')
          .update(updateData)
          .eq('id', 1022)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Error updating game:', updateError);
        } else {
          console.log('✅ Game updated successfully!');
          console.log('Updated game data:', {
            name: updatedGame.name,
            summary: updatedGame.summary ? updatedGame.summary.substring(0, 100) + '...' : 'NULL',
            developer: updatedGame.developer,
            publisher: updatedGame.publisher,
            release_date: updatedGame.release_date
          });
        }

      } else {
        console.log('❌ No IGDB data found, using manual data...');
        await setManualZeldaData();
      }

    } catch (igdbError) {
      console.log('❌ IGDB API error:', igdbError.message);
      console.log('🔧 Falling back to manual data...');
      await setManualZeldaData();
    }

    // Function to set manual Zelda data
    async function setManualZeldaData() {
      const manualData = {
        name: 'The Legend of Zelda',
        summary: 'The Legend of Zelda is an action-adventure game developed and published by Nintendo. The first game of The Legend of Zelda series, it is set in the fantasy land of Hyrule and centers on a character named Link, who aims to collect the eight fragments of the Triforce of Wisdom in order to rescue Princess Zelda from the antagonist Ganon.',
        developer: 'Nintendo',
        publisher: 'Nintendo',
        release_date: '1986-02-21',
        genres: ['Adventure', 'Action', 'RPG'],
        platforms: ['Nintendo Entertainment System', 'Game Boy Advance', 'Nintendo 3DS'],
        igdb_rating: 85,
        updated_at: new Date().toISOString()
      };

      const { data: updatedGame, error: updateError } = await supabase
        .from('game')
        .update(manualData)
        .eq('id', 1022)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error setting manual data:', updateError);
      } else {
        console.log('✅ Manual Legend of Zelda data set successfully!');
        console.log('Updated game data:', {
          name: updatedGame.name,
          developer: updatedGame.developer,
          publisher: updatedGame.publisher,
          release_date: updatedGame.release_date
        });
      }
    }

    console.log('\n🎉 Update completed!');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the script
updateLegendOfZelda().then(() => {
  console.log('\n✨ Script finished!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});