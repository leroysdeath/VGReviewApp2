import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Search for Pokemon games with covers
const { data: games } = await supabase
  .from('game')
  .select('id, igdb_id, name, cover_url, pic_url, first_release_date')
  .or('name.ilike.%pokemon%,name.ilike.%pokémon%')
  .not('cover_url', 'is', null)
  .order('first_release_date', { ascending: false, nullsFirst: false })
  .limit(10);

console.log(`Found ${games?.length || 0} Pokémon games with covers:\n`);
games?.forEach(game => {
  console.log(`${game.name} (igdb_id: ${game.igdb_id})`);
  console.log(`  cover_url: ${game.cover_url}`);
  console.log(`  pic_url: ${game.pic_url || 'NULL'}`);
  console.log(`  release: ${game.first_release_date || 'unknown'}\n`);
});
