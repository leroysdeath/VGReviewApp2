import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Check Pokemon Blue details
const { data } = await supabase
  .from('game')
  .select('id, igdb_id, name, cover_url, pic_url')
  .eq('igdb_id', 1511)
  .single();

console.log('Pokemon Blue Version:');
console.log(JSON.stringify(data, null, 2));

// Check if it's in the missing covers list
const { data: missing } = await supabase
  .from('game')
  .select('id, igdb_id, name, cover_url')
  .is('cover_url', null)
  .not('igdb_id', 'is', null)
  .eq('igdb_id', 1511);

console.log('\nIs in missing covers list?', missing && missing.length > 0 ? 'YES' : 'NO');
