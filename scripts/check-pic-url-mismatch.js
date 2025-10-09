import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Count games with cover_url but no pic_url
const { count: hasCoverNoPic } = await supabase
  .from('game')
  .select('*', { count: 'exact', head: true })
  .not('cover_url', 'is', null)
  .is('pic_url', null);

// Count games with both
const { count: hasBoth } = await supabase
  .from('game')
  .select('*', { count: 'exact', head: true })
  .not('cover_url', 'is', null)
  .not('pic_url', 'is', null);

// Count games with neither
const { count: hasNeither } = await supabase
  .from('game')
  .select('*', { count: 'exact', head: true })
  .is('cover_url', null)
  .is('pic_url', null);

console.log('Cover URL vs Pic URL Status:');
console.log(`Games with cover_url AND pic_url: ${hasBoth}`);
console.log(`Games with cover_url but NO pic_url: ${hasCoverNoPic} ⚠️`);
console.log(`Games with NO cover_url and NO pic_url: ${hasNeither}`);

console.log('\n--- Sample games with cover_url but no pic_url ---');
const { data: samples } = await supabase
  .from('game')
  .select('id, igdb_id, name, cover_url, pic_url')
  .not('cover_url', 'is', null)
  .is('pic_url', null)
  .limit(10);

samples?.forEach(game => {
  console.log(`${game.name} (igdb_id: ${game.igdb_id})`);
  console.log(`  cover_url: ${game.cover_url}`);
  console.log(`  pic_url: ${game.pic_url || 'NULL'}`);
});
