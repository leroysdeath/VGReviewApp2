// Quick verification script for game ID 32
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cqufmmnguumyhbkhgwdc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdWZtbW5ndXVteWhia2hnd2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MzU3MDUsImV4cCI6MjA2ODIxMTcwNX0.iP9jJM26Xa3-YeeB2YdYnqMK5JZyYcFY5_KXuLAZw-s'
);

async function verifyGame32() {
  console.log('🔍 Verifying game ID 32 update...\n');

  const { data, error } = await supabase
    .from('game')
    .select('*')
    .eq('id', 32)
    .single();

  if (error) {
    console.error('❌ Error fetching game:', error);
    return;
  }

  console.log('✅ Game ID 32 verification:');
  console.log('==========================');
  console.log('ID:', data.id);
  console.log('IGDB ID:', data.igdb_id);
  console.log('Name:', data.name);
  console.log('Developer:', data.developer);
  console.log('Publisher:', data.publisher);
  console.log('Release Date:', data.release_date);
  console.log('Summary:', data.summary ? data.summary.substring(0, 100) + '...' : 'NULL');
  console.log('Cover URL:', data.cover_url ? 'HAS_COVER' : 'NULL');
  console.log('Genres:', Array.isArray(data.genres) ? data.genres.join(', ') : data.genres);
  console.log('Platforms:', Array.isArray(data.platforms) ? data.platforms.join(', ') : data.platforms);
  console.log('IGDB Rating:', data.igdb_rating);
  console.log('Updated At:', data.updated_at);
}

verifyGame32().then(() => {
  console.log('\n✨ Verification completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Verification failed:', error);
  process.exit(1);
});