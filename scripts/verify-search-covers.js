import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Check what secure_game_search returns for pic_url
const searchResult = await supabase.rpc('secure_game_search', {
  search_query: 'pokemon blue',
  search_limit: 5,
  use_phrase_search: false,
  genre_filters: null,
  platform_filters: null,
  release_year_filter: null,
  min_rating_filter: null
});

console.log('Search function results for "pokemon blue":\n');
searchResult.data?.forEach((game, idx) => {
  console.log(`${idx + 1}. ${game.name}`);
  console.log(`   cover_url: ${game.cover_url || 'NULL'}`);
  console.log(`   pic_url: ${game.pic_url || 'NULL'}`);
  console.log('');
});

// Now check the raw database for Pokemon Blue
const { data: rawData } = await supabase
  .from('game')
  .select('id, name, cover_url, pic_url')
  .eq('igdb_id', 1511)
  .single();

console.log('Raw database for Pokemon Blue:');
console.log(JSON.stringify(rawData, null, 2));
