import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Count total games
const { count: totalGames } = await supabase
  .from('game')
  .select('*', { count: 'exact', head: true });

// Count games with IGDB ID but no cover
const { count: missingCovers } = await supabase
  .from('game')
  .select('*', { count: 'exact', head: true })
  .not('igdb_id', 'is', null)
  .is('cover_url', null);

// Count games with IGDB ID and cover
const { count: withCovers } = await supabase
  .from('game')
  .select('*', { count: 'exact', head: true })
  .not('igdb_id', 'is', null)
  .not('cover_url', 'is', null);

console.log('Database Cover Status:');
console.log(`Total games: ${totalGames}`);
console.log(`Games with IGDB ID and cover: ${withCovers}`);
console.log(`Games with IGDB ID but NO cover: ${missingCovers}`);
console.log(`Missing cover percentage: ${((missingCovers / (withCovers + missingCovers)) * 100).toFixed(2)}%`);

// Get some high-profile games missing covers
console.log('\n--- Sample of games missing covers ---');
const { data: samples } = await supabase
  .from('game')
  .select('igdb_id, name, first_release_date')
  .not('igdb_id', 'is', null)
  .is('cover_url', null)
  .order('igdb_id', { ascending: true })
  .limit(20);

samples?.forEach(game => {
  console.log(`${game.name} (igdb_id: ${game.igdb_id})`);
});
