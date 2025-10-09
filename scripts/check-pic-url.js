import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const { data } = await supabase
  .from('game')
  .select('id, igdb_id, name, cover_url, pic_url')
  .eq('igdb_id', 176087)
  .single();

console.log('Zelda bundle columns:');
console.log('  cover_url:', data?.cover_url || 'NULL');
console.log('  pic_url:', data?.pic_url || 'NULL');
