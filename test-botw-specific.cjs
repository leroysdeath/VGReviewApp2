// Test script to search specifically for Breath of the Wild
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

async function testBotwSearch() {
  try {
    const clientId = process.env.VITE_IGDB_CLIENT_ID;
    const accessToken = process.env.VITE_IGDB_ACCESS_TOKEN;

    if (!clientId || !accessToken) {
      console.error('Missing API credentials in environment');
      return;
    }

    console.log('Testing IGDB search for Breath of the Wild...\n');

    const igdbUrl = 'https://api.igdb.com/v4/games';
    
    // Search specifically for "breath of the wild"
    const searches = [
      {
        name: 'Direct search "breath of the wild"',
        query: `fields id, name, category, alternative_names.name, first_release_date, rating; search "breath of the wild"; limit 20;`
      },
      {
        name: 'Search "legend of zelda breath"',
        query: `fields id, name, category, alternative_names.name, first_release_date, rating; search "legend of zelda breath"; limit 20;`
      },
      {
        name: 'Search with where name contains',
        query: `fields id, name, category, alternative_names.name, first_release_date, rating; where name ~ *"Breath of the Wild"*; limit 20;`
      },
      {
        name: 'Search by IGDB ID 7346',
        query: `fields id, name, category, alternative_names.name, first_release_date, rating, url; where id = 7346;`
      }
    ];

    for (const search of searches) {
      console.log(`\n--- ${search.name} ---`);
      console.log('Query:', search.query);

      const response = await fetch(igdbUrl, {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'text/plain'
        },
        body: search.query
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('IGDB API Error:', response.status, errorText);
        continue;
      }

      const games = await response.json();
      console.log(`Found ${games.length} games:`);

      games.forEach((game, index) => {
        const categoryName = getCategoryName(game.category);
        console.log(`  ${index + 1}. [ID: ${game.id}] ${game.name} (Category: ${categoryName})`);
        if (game.alternative_names?.length > 0) {
          console.log(`     Alt names: ${game.alternative_names.map(a => a.name).join(', ')}`);
        }
        if (game.url) {
          console.log(`     URL: ${game.url}`);
        }
      });
    }

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
testBotwSearch();