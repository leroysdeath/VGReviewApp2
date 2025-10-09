import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

console.log('Syncing cover_url to pic_url...\n');

// Use raw SQL
const { data, error } = await supabase.rpc('exec_sql', {
  sql: 'UPDATE game SET pic_url = cover_url WHERE cover_url IS NOT NULL AND pic_url IS NULL'
});

if (error) {
  console.log('RPC not available, trying direct query...');
  
  // Get games that need updating
  const { data: games } = await supabase
    .from('game')
    .select('id, cover_url')
    .not('cover_url', 'is', null)
    .is('pic_url', null)
    .limit(1000);
  
  console.log(`Found ${games?.length || 0} games to update`);
  
  let count = 0;
  for (const game of games || []) {
    const { error: updateError } = await supabase
      .from('game')
      .update({ pic_url: game.cover_url })
      .eq('id', game.id);
    
    if (!updateError) count++;
  }
  
  console.log(`✅ Updated ${count} games`);
} else {
  console.log('✅ Synced successfully');
}
