import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkGoldenEye() {
  console.log('Checking GoldenEye in database...\n');
  
  const { data: bySlug, error: slugError } = await supabase
    .from('game')
    .select('id, igdb_id, game_id, name, slug, summary, developer, publisher, cover_url, platforms')
    .eq('slug', 'goldeneye-007')
    .single();
  
  console.log('By slug "goldeneye-007":');
  if (slugError) {
    console.log('Error:', slugError.message);
  } else if (bySlug) {
    console.log('Found:', {
      db_id: bySlug.id,
      igdb_id: bySlug.igdb_id,
      game_id: bySlug.game_id,
      name: bySlug.name,
      has_summary: !!bySlug.summary,
      has_developer: !!bySlug.developer,
      has_publisher: !!bySlug.publisher,
      has_cover: !!bySlug.cover_url,
      platforms_count: bySlug.platforms ? bySlug.platforms.length : 0
    });
  } else {
    console.log('Not found');
  }
  
  console.log('\nSearching for any GoldenEye entries...\n');
  
  const { data: search, error: searchError } = await supabase
    .from('game')
    .select('id, igdb_id, game_id, name, slug, platforms')
    .ilike('name', '%goldeneye%')
    .limit(10);
  
  if (searchError) {
    console.log('Search error:', searchError.message);
  } else if (search && search.length > 0) {
    console.log(`Found ${search.length} GoldenEye entries:`);
    search.forEach((game, i) => {
      console.log(`\n${i+1}. ${game.name}`);
      console.log(`   DB ID: ${game.id}, IGDB ID: ${game.igdb_id}, game_id: ${game.game_id}`);
      console.log(`   Slug: ${game.slug}`);
      const platformCount = game.platforms ? game.platforms.length : 0;
      console.log(`   Platforms: ${platformCount} platforms`);
    });
  } else {
    console.log('No GoldenEye entries found');
  }
}

checkGoldenEye().catch(console.error);
