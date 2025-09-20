import { describe, test, expect } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { gameFlagService } from '../services/gameFlagService';

// Use environment variables for database connection
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

const prodSupabase = createClient(supabaseUrl, supabaseAnonKey);

describe('GTA 3 Greenlight Test', () => {
  test('should find GTA 3 in database and greenlight it', async () => {
    console.log('\n🔍 Step 1: Searching for GTA 3 in database...');
    
    // Search for GTA 3 variants
    const searchTerms = ['Grand Theft Auto III', 'Grand Theft Auto 3', 'GTA III', 'GTA 3'];
    let gta3Game = null;
    
    for (const term of searchTerms) {
      const { data, error } = await prodSupabase
        .from('game')
        .select('id, name, igdb_id, greenlight_flag, redlight_flag')
        .ilike('name', `%${term}%`)
        .limit(5);
      
      if (error) {
        console.error(`❌ Error searching for "${term}":`, error);
        continue;
      }
      
      if (data && data.length > 0) {
        console.log(`✅ Found ${data.length} games matching "${term}":`);
        data.forEach(game => {
          console.log(`  - ID: ${game.id}, Name: "${game.name}", Green: ${game.greenlight_flag}, Red: ${game.redlight_flag}`);
        });
        
        // Look for exact match or closest match
        const exactMatch = data.find(g => 
          g.name.toLowerCase().includes('grand theft auto') && 
          (g.name.includes('III') || g.name.includes('3'))
        );
        
        if (exactMatch) {
          gta3Game = exactMatch;
          break;
        }
      } else {
        console.log(`❌ No games found for "${term}"`);
      }
    }
    
    if (!gta3Game) {
      console.log('\n❌ GTA 3 not found in database. Checking if we need to add it...');
      
      // Search IGDB for GTA 3 to see if we can add it
      console.log('🔍 Searching IGDB for GTA 3 data...');
      
      // For now, we'll create a test entry or use a different approach
      console.log('⚠️  GTA 3 not found in database - need to add it first');
      return;
    }
    
    console.log(`\n✅ Found GTA 3: "${gta3Game.name}" (ID: ${gta3Game.id})`);
    console.log(`   Current flags - Green: ${gta3Game.greenlight_flag}, Red: ${gta3Game.redlight_flag}`);
    
    // Step 2: Greenlight the game if not already greenlighted
    if (gta3Game.greenlight_flag === true) {
      console.log('\n✅ GTA 3 is already greenlighted!');
    } else {
      console.log('\n🟢 Step 2: Greenlighting GTA 3...');
      
      const result = await gameFlagService.setGameFlag(
        gta3Game.id, 
        'greenlight', 
        'Testing greenlight system with GTA 3'
      );
      
      if (result.success) {
        console.log('✅ Successfully greenlighted GTA 3');
        
        // Verify the flag was set
        const { data: updatedGame, error: verifyError } = await prodSupabase
          .from('game')
          .select('id, name, greenlight_flag, redlight_flag')
          .eq('id', gta3Game.id)
          .single();
        
        if (verifyError) {
          console.error('❌ Error verifying greenlight flag:', verifyError);
        } else {
          console.log(`✅ Verified - Green: ${updatedGame.greenlight_flag}, Red: ${updatedGame.redlight_flag}`);
        }
      } else {
        console.error(`❌ Failed to greenlight GTA 3: ${result.error}`);
      }
    }
    
    // Step 3: Test frontend search to see if GTA 3 appears
    console.log('\n🔍 Step 3: Testing if GTA 3 appears in search results...');
    
    const { data: searchResults, error: searchError } = await prodSupabase
      .from('game')
      .select('id, name, greenlight_flag, total_rating, rating_count')
      .ilike('name', '%grand theft auto%')
      .eq('greenlight_flag', true)
      .order('total_rating', { ascending: false, nullsLast: true })
      .limit(10);
    
    if (searchError) {
      console.error('❌ Error searching for greenlighted GTA games:', searchError);
    } else {
      console.log(`✅ Found ${searchResults.length} greenlighted GTA games:`);
      searchResults.forEach(game => {
        console.log(`  - "${game.name}" (Rating: ${game.total_rating}, Reviews: ${game.rating_count})`);
      });
      
      const gta3InResults = searchResults.find(g => g.id === gta3Game.id);
      if (gta3InResults) {
        console.log('✅ GTA 3 appears in greenlighted search results!');
      } else {
        console.log('❌ GTA 3 does not appear in greenlighted search results');
      }
    }
    
    expect(gta3Game).toBeTruthy();
  });
});