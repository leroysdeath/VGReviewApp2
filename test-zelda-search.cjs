// Test script to check IGDB search for "zelda"
const https = require('https');

// Simple fetch polyfill for Node.js
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const response = {
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data))
        };
        resolve(response);
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testZeldaSearch() {
  try {
    const clientId = process.env.VITE_IGDB_CLIENT_ID;
    const accessToken = process.env.VITE_IGDB_ACCESS_TOKEN;

    if (!clientId || !accessToken) {
      console.error('Missing API credentials in environment');
      return;
    }

    console.log('Testing IGDB search for "zelda"...\n');

    const igdbUrl = 'https://api.igdb.com/v4/games';
    
    // Original search query
    const requestBody = `fields name, summary, storyline, slug, first_release_date, rating, category, cover.url, screenshots.url, genres.name, platforms.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, alternative_names.name, collection.name, franchise.name, franchises.name, parent_game, url, dlcs, expansions, similar_games, hypes, follows, total_rating, total_rating_count, rating_count; search "zelda"; limit 50;`;

    console.log('Request body:', requestBody);
    console.log('\n---\n');

    const response = await fetch(igdbUrl, {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain'
      },
      body: requestBody
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('IGDB API Error:', response.status, errorText);
      return;
    }

    const games = await response.json();
    console.log(`Found ${games.length} games\n`);

    // Check specifically for Breath of the Wild
    const breathOfTheWild = games.find(g => 
      g.name && g.name.toLowerCase().includes('breath of the wild')
    );

    if (breathOfTheWild) {
      console.log('✅ Found Breath of the Wild:');
      console.log('  ID:', breathOfTheWild.id);
      console.log('  Name:', breathOfTheWild.name);
      console.log('  Category:', breathOfTheWild.category);
      console.log('  Rating:', breathOfTheWild.rating);
      console.log('  Alternative names:', breathOfTheWild.alternative_names?.map(a => a.name));
    } else {
      console.log('❌ Breath of the Wild NOT found in results');
    }

    // List all games with their categories
    console.log('\nAll games found:');
    games.forEach((game, index) => {
      const categoryName = getCategoryName(game.category);
      console.log(`${index + 1}. ${game.name} (Category: ${categoryName})`);
    });

    // Check for any bundles/collections/DLC that might be related
    console.log('\nBreath of the Wild related content:');
    const botwRelated = games.filter(g => 
      g.name && g.name.toLowerCase().includes('breath')
    );
    botwRelated.forEach(game => {
      console.log(`  - ${game.name} (Category: ${getCategoryName(game.category)})`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

function getCategoryName(category) {
  const categories = {
    0: 'Main game',
    1: 'DLC',
    2: 'Expansion',
    3: 'Bundle',
    4: 'Standalone expansion',
    5: 'Mod',
    6: 'Episode',
    7: 'Season',
    8: 'Remake',
    9: 'Remaster',
    10: 'Expanded game',
    11: 'Port',
    12: 'Fork',
    13: 'Pack',
    14: 'Update'
  };
  return categories[category] || `Unknown (${category})`;
}

// Load environment variables and run test
require('dotenv').config();
testZeldaSearch();