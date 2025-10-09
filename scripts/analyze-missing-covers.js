import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Check if pic_url exists for games with missing cover_url
const { data: missingCoverUrl } = await supabase
  .from('game')
  .select('igdb_id, name, cover_url, pic_url')
  .not('igdb_id', 'is', null)
  .is('cover_url', null)
  .limit(10);

console.log('Games with NULL cover_url:');
console.log('Do they have pic_url?\n');

missingCoverUrl?.forEach(game => {
  console.log(`${game.name} (igdb_id: ${game.igdb_id})`);
  console.log(`  cover_url: ${game.cover_url || 'NULL'}`);
  console.log(`  pic_url: ${game.pic_url || 'NULL'}`);
  console.log('');
});

// Check a game that we KNOW has a cover in the database
console.log('\n--- Games with covers (for comparison) ---');
const { data: withCovers } = await supabase
  .from('game')
  .select('igdb_id, name, cover_url, pic_url')
  .not('cover_url', 'is', null)
  .limit(5);

withCovers?.forEach(game => {
  console.log(`${game.name} (igdb_id: ${game.igdb_id})`);
  console.log(`  cover_url: ${game.cover_url}`);
  console.log(`  pic_url: ${game.pic_url || 'NULL'}`);
  console.log('');
});
