import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

console.log('Syncing cover_url to pic_url for games missing pic_url...\n');

// Update games that have cover_url but not pic_url
const { data, error } = await supabase.rpc('sync_cover_to_pic', {}, {
  count: 'exact'
});

if (error) {
  // Function might not exist, do it manually
  console.log('Using manual update...');
  const { error: updateError } = await supabase
    .from('game')
    .update({ pic_url: supabase.raw('cover_url') })
    .not('cover_url', 'is', null)
    .is('pic_url', null);
    
  if (updateError) {
    console.log('Error:', updateError);
  } else {
    console.log('✅ Synced successfully');
  }
} else {
  console.log('✅ Synced', data, 'games');
}
