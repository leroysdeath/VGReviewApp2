require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function checkPikmin() {
  const { data, error } = await supabase.from('game').select('id, igdb_id, name, platforms, release_date').ilike('name', '%pikmin%').order('release_date', { ascending: false });
  if (error) { console.error('Error:', error); return; }
  console.log('Pikmin games in database:\n');
  data.forEach(game => console.log(`${game.name} (IGDB: ${game.igdb_id}) - ${game.platforms} - ${game.release_date}`));
  console.log(`\nTotal: ${data.length} games`);
}
checkPikmin();
