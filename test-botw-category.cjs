// Test script to check Breath of the Wild's category
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

async function testBotwCategory() {
  try {
    const clientId = process.env.VITE_IGDB_CLIENT_ID;
    const accessToken = process.env.VITE_IGDB_ACCESS_TOKEN;

    if (!clientId || !accessToken) {
      console.error('Missing API credentials in environment');
      return;
    }

    console.log('Checking Breath of the Wild category value...\n');

    const igdbUrl = 'https://api.igdb.com/v4/games';
    
    // Get BotW with all fields to see what's actually returned
    const query = `fields *; where id = 7346;`;

    console.log('Query:', query);

    const response = await fetch(igdbUrl, {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain'
      },
      body: query
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('IGDB API Error:', response.status, errorText);
      return;
    }

    const games = await response.json();
    
    if (games.length > 0) {
      const botw = games[0];
      console.log('\n✅ Found Breath of the Wild (ID: 7346)');
      console.log('-----------------------------------');
      console.log('Name:', botw.name);
      console.log('Category value:', botw.category);
      console.log('Category type:', typeof botw.category);
      console.log('Category name:', getCategoryName(botw.category));
      console.log('Has category field:', 'category' in botw);
      console.log('-----------------------------------');
      
      // Check if category field exists in response
      console.log('\nAll fields returned:');
      const fields = Object.keys(botw).sort();
      fields.forEach(field => {
        const value = botw[field];
        if (field === 'category' || field === 'name' || field === 'id') {
          console.log(`  ${field}: ${JSON.stringify(value)}`);
        }
      });
      
      // Raw JSON for debugging
      console.log('\nRaw JSON for category field:');
      console.log(JSON.stringify({ category: botw.category }, null, 2));
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
testBotwCategory();