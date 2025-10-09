import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Count all pokemon games
const { count: totalCount } = await supabase
  .from('game')
  .select('*', { count: 'exact', head: true })
  .or('name.ilike.%pokemon%,name.ilike.%pokémon%');

console.log(`Total Pokemon games: ${totalCount}`);

// Count with covers
const { count: withCovers } = await supabase
  .from('game')
  .select('*', { count: 'exact', head: true })
  .or('name.ilike.%pokemon%,name.ilike.%pokémon%')
  .not('cover_url', 'is', null);

console.log(`With covers: ${withCovers}`);

// Get some samples
const { data: samples } = await supabase
  .from('game')
  .select('id, igdb_id, name, cover_url, pic_url')
  .or('name.ilike.%pokemon%,name.ilike.%pokémon%')
  .limit(10);

console.log('\nSample games:');
samples?.forEach(game => {
  console.log(`- ${game.name}`);
  console.log(`  igdb_id: ${game.igdb_id || 'NULL'}, cover: ${game.cover_url ? 'YES' : 'NO'}`);
});
