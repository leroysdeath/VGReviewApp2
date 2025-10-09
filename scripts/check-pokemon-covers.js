import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Check some Pokemon games
const { data: games } = await supabase
  .from('game')
  .select('id, igdb_id, name, cover_url, pic_url')
  .ilike('name', '%pokemon%')
  .limit(5);

console.log('Pokemon games:');
games?.forEach(game => {
  console.log(`\n${game.name} (igdb_id: ${game.igdb_id})`);
  console.log(`  cover_url: ${game.cover_url || 'NULL'}`);
  console.log(`  pic_url: ${game.pic_url || 'NULL'}`);
  console.log(`  Match: ${game.cover_url === game.pic_url}`);
});
