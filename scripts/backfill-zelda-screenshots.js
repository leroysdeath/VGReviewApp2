#!/usr/bin/env node

// Quick script to backfill screenshots for Zelda games only
import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

global.fetch = fetch;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

function transformScreenshotUrls(igdbScreenshots) {
  if (!igdbScreenshots || !Array.isArray(igdbScreenshots)) return [];

  return igdbScreenshots
    .map(screenshot => {
      if (!screenshot.url) return null;
      const urlParts = screenshot.url.split('/');
      const imageFile = urlParts[urlParts.length - 1];
      const imageId = imageFile.replace('.jpg', '');
      return `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${imageId}.jpg`;
    })
    .filter(url => url !== null);
}

async function fetchScreenshotsFromIGDB(igdbIds) {
  const idsString = igdbIds.join(',');
  const requestBody = `fields id, screenshots.url; where id = (${idsString}); limit ${igdbIds.length};`;

  const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      isBulkRequest: true,
      endpoint: 'games',
      requestBody: requestBody
    })
  });

  const data = await response.json();
  return data.games || [];
}

async function main() {
  console.log('🎮 Fetching top 10 Zelda games...\n');

  // Get top 10 Zelda games
  const { data: games, error } = await supabase
    .from('game')
    .select('id, igdb_id, name, screenshots')
    .ilike('name', '%zelda%')
    .not('igdb_id', 'is', null)
    .limit(10);

  if (error) {
    console.error('❌ Error fetching games:', error);
    process.exit(1);
  }

  console.log(`Found ${games.length} Zelda games:\n`);
  games.forEach((g, i) => console.log(`  ${i + 1}. ${g.name} (ID: ${g.igdb_id})`));

  // Fetch screenshots from IGDB
  console.log('\n📸 Fetching screenshots from IGDB...\n');
  const igdbIds = games.map(g => g.igdb_id);
  const igdbGames = await fetchScreenshotsFromIGDB(igdbIds);

  // Update database
  let updated = 0;
  for (const igdbGame of igdbGames) {
    if (igdbGame.screenshots && igdbGame.screenshots.length > 0) {
      const game = games.find(g => g.igdb_id === igdbGame.id);
      const urls = transformScreenshotUrls(igdbGame.screenshots);

      if (urls.length > 0) {
        const { error: updateError } = await supabase
          .from('game')
          .update({ screenshots: urls })
          .eq('igdb_id', igdbGame.id);

        if (!updateError) {
          console.log(`✅ ${game.name}: ${urls.length} screenshots`);
          updated++;
        } else {
          console.log(`❌ ${game.name}: ${updateError.message}`);
        }
      }
    }
  }

  console.log(`\n🎉 Updated ${updated} games with screenshots!`);
  console.log('\nTest these games in the UI:');
  games.forEach((g, i) => console.log(`  ${i + 1}. ${g.name}`));
}

main().catch(console.error);
