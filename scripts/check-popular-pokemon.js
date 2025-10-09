import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Check popular Pokemon games
const popularPokemon = [
  'Pokemon Red',
  'Pokemon Blue',
  'Pokemon Yellow',
  'Pokemon Gold',
  'Pokemon Silver',
  'Pokemon Sword',
  'Pokemon Shield',
  'Pokemon Legends: Arceus'
];

for (const name of popularPokemon) {
  const { data: games } = await supabase
    .from('game')
    .select('id, igdb_id, name, cover_url, pic_url')
    .ilike('name', name)
    .limit(1);

  if (games?.[0]) {
    const game = games[0];
    console.log(`\n${game.name} (igdb_id: ${game.igdb_id})`);
    console.log(`  cover_url: ${game.cover_url || 'NULL'}`);
    console.log(`  pic_url: ${game.pic_url || 'NULL'}`);
  } else {
    console.log(`\n${name}: NOT FOUND`);
  }
}
