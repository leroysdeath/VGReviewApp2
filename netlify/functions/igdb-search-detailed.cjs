// Optimized Netlify function for IGDB detailed searches
// Full fields for search results page
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
    // Moderate caching for detailed search
    'Cache-Control': 'public, max-age=1800, s-maxage=3600'
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

    // Extract search query and options
    const query = requestData.searchTerm || requestData.query || requestData.q ||
                  queryParams.query || queryParams.q || queryParams.search || queryParams.term;

    const limit = requestData.limit || queryParams.limit || 20;
    const offset = requestData.offset || queryParams.offset || 0;

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

    // MINIMAL FIELDS - Same as autocomplete, only what SearchResultsPage displays
    // Significantly reduces payload size for faster response
    const minimalFields = `
      fields name, slug, cover.url, first_release_date,
             platforms.name, category;
      search "${query.trim()}";
      limit ${limit};
      offset ${offset};
      where category = (0,4,8,9,10,11) & version_parent = null;
    `;

    console.log(`📚 SEARCH: "${query}" - Fetching ${limit} results with minimal fields`);

    // Make request to IGDB API with standard timeout (10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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
      console.error('IGDB Detailed Search Error:', response.status, errorText);
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

    // Transform data - same minimal structure as autocomplete
    const transformedData = (data || []).map(game => ({
      id: game.id,
      name: game.name,
      slug: game.slug,
      cover_url: game.cover?.url ?
        `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : null,
      release_date: game.first_release_date ?
        new Date(game.first_release_date * 1000).toISOString().split('T')[0] : null,
      platforms: game.platforms?.map(p => p.name).filter(Boolean) || [],
      category: game.category
    }));

    console.log(`✅ SEARCH: Returned ${transformedData.length} results`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        games: transformedData,
        query: query,
        total: transformedData.length,
        hasMore: transformedData.length === limit,
        type: 'detailed'
      })
    };

  } catch (error) {
    console.error('Detailed search function error:', error);

    // Handle timeout specifically
    if (error.name === 'AbortError') {
      return {
        statusCode: 408,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Request timeout - IGDB API took too long to respond',
          details: 'Detailed search request aborted after 10 seconds'
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