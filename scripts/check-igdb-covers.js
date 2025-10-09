import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_ACCESS_TOKEN = process.env.TWITCH_APP_ACCESS_TOKEN;

async function checkIGDBCovers(igdbIds) {
  const response = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${TWITCH_ACCESS_TOKEN}`,
      'Accept': 'application/json'
    },
    body: `fields name, cover.url, cover.image_id; where id = (${igdbIds.join(',')});`
  });

  const data = await response.json();
  return data;
}

// Check the games with NULL covers
const gamesToCheck = [
  { name: 'Pokemon Blue Version', igdb_id: 1511 },
  { name: 'Zelda BOTW Bundle', igdb_id: 237895 },
  { name: "Zelda's Eternal Youth", igdb_id: 268684 }
];

console.log('Checking IGDB for cover data...\n');

const igdbIds = gamesToCheck.map(g => g.igdb_id);
const results = await checkIGDBCovers(igdbIds);

results.forEach(game => {
  const original = gamesToCheck.find(g => g.igdb_id === game.id);
  console.log(`${original.name} (${game.id})`);
  console.log(`  IGDB name: ${game.name}`);
  console.log(`  Has cover in IGDB: ${game.cover ? 'YES' : 'NO'}`);
  if (game.cover) {
    console.log(`  Cover URL: https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`);
  }
  console.log('');
});
