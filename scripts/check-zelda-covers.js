import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Check the specific Zelda bundle
const game = await supabase
  .from('game')
  .select('id, igdb_id, name, cover_url')
  .eq('igdb_id', 176087)
  .single();

console.log('Zelda Ocarina + Master Quest bundle:');
console.log('Database cover_url:', game.data?.cover_url || 'NULL');

// Now check what search returns
const searchResult = await supabase.rpc('secure_game_search', {
  search_query: 'zelda ocarina master quest',
  search_limit: 10,
  use_phrase_search: false,
  genre_filters: null,
  platform_filters: null,
  release_year_filter: null,
  min_rating_filter: null
});

const searchGame = searchResult.data?.find(g => g.igdb_id === 176087);
console.log('\nSearch result cover_url:', searchGame?.cover_url || 'NULL');
console.log('\nMismatch?', (game.data?.cover_url !== searchGame?.cover_url));
