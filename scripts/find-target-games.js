import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Find Pokemon Blue and Zelda BOTW Bundle
const targetGames = [
  { name: 'Pokémon Blue Version', igdb_id: 1511 },
  { name: 'The Legend of Zelda: Breath of the Wild and The Legend of Zelda: Breath of the Wild Expansion Pass Bundle', igdb_id: 237895 }
];

console.log('Finding target games in the backfill queue...\n');

for (const target of targetGames) {
  // Find the position in the ordered list
  const { count } = await supabase
    .from('game')
    .select('*', { count: 'exact', head: true })
    .is('cover_url', null)
    .not('igdb_id', 'is', null)
    .lt('igdb_id', target.igdb_id);

  console.log(`${target.name}`);
  console.log(`  IGDB ID: ${target.igdb_id}`);
  console.log(`  Position in queue: ${count + 1}`);
  console.log(`  In first 500: ${count < 500 ? 'YES ✅' : 'NO ❌'}`);
  console.log('');
}
