import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const coverUrl = 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5vvd.jpg';

const { error } = await supabase
  .from('game')
  .update({
    pic_url: coverUrl
  })
  .eq('igdb_id', 176087);

if (error) {
  console.log('Error:', error);
} else {
  console.log('✅ Updated pic_url for Zelda bundle');
  
  // Verify
  const { data } = await supabase.rpc('secure_game_search', {
    search_query: 'zelda ocarina master quest',
    search_limit: 5,
    use_phrase_search: false,
    genre_filters: null,
    platform_filters: null,
    release_year_filter: null,
    min_rating_filter: null
  });
  
  const game = data?.find(g => g.igdb_id === 176087);
  console.log('Search result now shows cover_url:', game?.cover_url || 'NULL');
}
