require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function findGame(searchTerm) {
  const { data, error } = await supabase.from('game').select('id, igdb_id, name, platforms').ilike('name', `%${searchTerm}%`).limit(10);
  if (error) { console.error('Error:', error); return; }
  if (data.length === 0) { console.log(`No games found matching "${searchTerm}"`); return; }
  console.log(`Found ${data.length} games matching "${searchTerm}":\n`);
  data.forEach(g => console.log(`- ${g.name} (IGDB: ${g.igdb_id})`));
}
findGame(process.argv[2] || 'goldeneye');
