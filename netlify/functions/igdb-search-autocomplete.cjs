// Optimized Netlify function for IGDB autocomplete searches
// Minimal fields, faster response times
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

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    // Aggressive caching for autocomplete
    'Cache-Control': 'public, max-age=3600, s-maxage=7200'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Get API credentials from environment variables
    const clientId = process.env.TWITCH_CLIENT_ID;
    const accessToken = process.env.TWITCH_APP_ACCESS_TOKEN;

    if (!clientId || !accessToken) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing API credentials'
        })
      };
    }

    // Parse request data
    let requestData = {};
    if (event.body) {
      try {
        requestData = JSON.parse(event.body);
      } catch (e) {
        console.error('Failed to parse request body:', e);
      }
    }

    const queryParams = event.queryStringParameters || {};

    // Extract search query
    const query = requestData.searchTerm || requestData.query || requestData.q ||
                  queryParams.query || queryParams.q || queryParams.search || queryParams.term;

    if (!query || query.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Search query is required'
        })
      };
    }

    // MINIMAL FIELDS - Same as search results page display
    // Only fetch what we actually show in the UI
    const minimalFields = `
      fields name, slug, cover.url, first_release_date,
             platforms.name, category;
      search "${query.trim()}";
      limit 6;
      where category = (0,4,8,9,10,11) & version_parent = null;
    `;

    console.log(`🚀 AUTOCOMPLETE: "${query}" - Fetching 6 results with minimal fields`);

    // Make request to IGDB API with shorter timeout (5 seconds for autocomplete)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain'
      },
      body: minimalFields.trim(),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('IGDB Autocomplete Error:', response.status, errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: `IGDB API error: ${response.status}`,
          details: errorText
        })
      };
    }

    const data = await response.json();

    // Transform data for consistent format
    const transformedData = (data || []).map(game => ({
      id: game.id,
      name: game.name,
      slug: game.slug,
      cover_url: game.cover?.url ?
        `https:${game.cover.url.replace('t_thumb', 't_cover_small')}` : null,
      release_date: game.first_release_date ?
        new Date(game.first_release_date * 1000).toISOString().split('T')[0] : null,
      platforms: game.platforms?.map(p => p.name).filter(Boolean) || [],
      category: game.category
    }));

    console.log(`✅ AUTOCOMPLETE: Returned ${transformedData.length} results`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        games: transformedData,
        query: query,
        type: 'autocomplete'
      })
    };

  } catch (error) {
    console.error('Autocomplete function error:', error);

    // Handle timeout specifically
    if (error.name === 'AbortError') {
      return {
        statusCode: 408,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Request timeout - IGDB API took too long to respond',
          details: 'Autocomplete request aborted after 5 seconds'
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};