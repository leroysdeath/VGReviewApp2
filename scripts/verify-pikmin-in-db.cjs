require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verifyPikmin() {
  console.log('🔍 Checking database for Pikmin Switch games...\n');

  try {
    const { data, error } = await supabase
      .from('game')
      .select('id, igdb_id, name, platforms, release_date')
      .or('igdb_id.eq.254334,igdb_id.eq.254335,igdb_id.eq.254343');

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    if (data.length === 0) {
      console.log('❌ No Pikmin Switch games found in database');
      return;
    }

    console.log(`✅ Found ${data.length} Pikmin Switch games:\n`);
    data.forEach(game => {
      console.log(`   📦 ${game.name}`);
      console.log(`      IGDB ID: ${game.igdb_id}`);
      console.log(`      DB ID: ${game.id}`);
      console.log(`      Platforms: ${game.platforms?.join(', ')}`);
      console.log(`      Release: ${game.release_date}`);
      console.log('');
    });

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

verifyPikmin();
