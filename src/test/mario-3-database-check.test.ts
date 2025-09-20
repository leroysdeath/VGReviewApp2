import { createClient } from '@supabase/supabase-js';

describe('Mario Bros 3 Database Check', () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  test('should search for Mario Bros 3 in database with multiple variations', async () => {
    console.log('🔍 Searching database for Mario Bros 3 variations...');
    
    const variations = [
      'Super Mario Bros. 3',
      'Super Mario Bros 3', 
      'Super Mario Brothers 3',
      'Mario Bros. 3',
      'Mario Bros 3',
      'Mario 3'
    ];

    for (const variation of variations) {
      console.log(`\n📝 Searching for: "${variation}"`);
      
      try {
        const { data, error } = await supabase
          .from('game')
          .select('id, name, greenlight_flag, redlight_flag, category, developer, publisher')
          .ilike('name', `%${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}%`)
          .limit(10);

        if (error) {
          console.error(`❌ Error: ${error.message}`);
        } else if (data && data.length > 0) {
          console.log(`✅ Found ${data.length} matches:`);
          data.forEach(game => {
            console.log(`  - "${game.name}" (ID: ${game.id})`);
            console.log(`    Green: ${game.greenlight_flag}, Red: ${game.redlight_flag}`);
            console.log(`    Category: ${game.category}, Dev: ${game.developer}`);
          });
        } else {
          console.log(`❌ No matches found`);
        }
      } catch (err) {
        console.error(`💥 Query failed: ${err}`);
      }
    }
  }, 30000);

  test('should search for any Mario games with "3" in the name', async () => {
    console.log('\n🎮 Searching for Mario games containing "3"...');
    
    try {
      const { data, error } = await supabase
        .from('game')
        .select('id, name, greenlight_flag, redlight_flag, category')
        .ilike('name', '%mario%')
        .ilike('name', '%3%')
        .limit(20);

      if (error) {
        console.error(`❌ Error: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log(`✅ Found ${data.length} Mario games with "3":`);
        data.forEach(game => {
          console.log(`  - "${game.name}" (Green: ${game.greenlight_flag}, Red: ${game.redlight_flag})`);
        });
      } else {
        console.log('❌ No Mario games with "3" found');
      }
    } catch (err) {
      console.error(`💥 Query failed: ${err}`);
    }
  }, 30000);

  test('should list all green-flagged games to verify system is working', async () => {
    console.log('\n🟢 Checking all green-flagged games...');
    
    try {
      const { data, error } = await supabase
        .from('game')
        .select('id, name, greenlight_flag, redlight_flag')
        .eq('greenlight_flag', true)
        .limit(20);

      if (error) {
        console.error(`❌ Error: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log(`✅ Found ${data.length} green-flagged games:`);
        data.forEach(game => {
          console.log(`  - "${game.name}" (ID: ${game.id})`);
        });
      } else {
        console.log('❌ No green-flagged games found');
      }
    } catch (err) {
      console.error(`💥 Query failed: ${err}`);
    }
  }, 30000);
});