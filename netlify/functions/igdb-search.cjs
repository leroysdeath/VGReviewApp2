// Netlify function to proxy IGDB API requests
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
    'Content-Type': 'application/json'
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
      console.error('Missing API credentials:', { hasClientId: !!clientId, hasAccessToken: !!accessToken });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing API credentials',
          debug: { hasClientId: !!clientId, hasAccessToken: !!accessToken }
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

    // Extract search parameters
    let query = null;
    let gameId = null;
    let requestType = 'search';
    let endpoint = 'games';
    let customRequestBody = null;

    if (requestData.isBulkRequest && requestData.endpoint) {
      requestType = 'bulk';
      endpoint = requestData.endpoint;
      customRequestBody = requestData.requestBody;
    } else if (requestData.type === 'getById' || requestData.gameId) {
      requestType = 'getById';
      gameId = requestData.gameId || queryParams.gameId || queryParams.id;
    } else {
      query = requestData.searchTerm || requestData.query || requestData.q || 
              queryParams.query || queryParams.q || queryParams.search || queryParams.term;
    }

    // Log request details for debugging
    console.log('=========================');
    console.log('IGDB API Request Details:');
    console.log('Request Type:', requestType);
    console.log('Query:', query);
    console.log('Game ID:', gameId);
    console.log('Endpoint:', endpoint);
    console.log('Request Data:', requestData);
    console.log('Query Params:', queryParams);
    console.log('=========================');

    const igdbUrl = `https://api.igdb.com/v4/${endpoint}`;
    let requestBody = '';
    // Determine limit based on request type - autocomplete needs fewer results
    const isAutocomplete = requestData.type === 'autocomplete' || queryParams.type === 'autocomplete';
    let limit = requestData.limit || queryParams.limit || (isAutocomplete ? 6 : 20);

    if (requestType === 'bulk') {
      requestBody = customRequestBody;
    } else if (requestType === 'getById') {
      if (!gameId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Game ID is required for getById requests'
          })
        };
      }
      // MINIMAL FIELDS for GamePage - Only fetch what's actually displayed
      // GamePage shows: name, cover, platforms, release_date, developer, publisher, summary, storyline, dlcs, expansions
      requestBody = `fields name, slug, cover.url, first_release_date, platforms.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, summary, storyline, category, dlcs, expansions; where id = ${gameId};`;
    } else {
      // Search request
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

      // Check if minimal mode is requested (for search results page)
      const isMinimalMode = requestData.minimal || queryParams.minimal === 'true';

      if (isMinimalMode) {
        // MINIMAL FIELDS - Only what SearchResultsPage actually displays
        // Removed version_parent filter to allow remasters and ports (like GoldenEye 007 N64)
        requestBody = `fields name, slug, cover.url, first_release_date, platforms.name, category; search "${query.trim()}"; limit ${limit}; where category = (0,4,8,9,10,11);`;
      } else {
        // FULL FIELDS - For backward compatibility and detailed views
        requestBody = `fields name, summary, storyline, slug, first_release_date, rating, category, cover.url, screenshots.url, genres.name, platforms.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, alternative_names.name, collection.name, franchise.name, franchises.name, parent_game, url, dlcs, expansions, similar_games, hypes, follows, total_rating, total_rating_count, rating_count; search "${query.trim()}"; limit ${limit};`;
      }
    }

    console.log('IGDB Request Body:', requestBody);

    // Make request to IGDB API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(igdbUrl, {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain'
      },
      body: requestBody,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    console.log('IGDB Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('IGDB API Error:', response.status, errorText);
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
    console.log('IGDB Response Data:', data.length, 'games returned');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        games: data || [],
        query: query,
        requestType: requestType
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    
    // Handle timeout specifically
    if (error.name === 'AbortError') {
      return {
        statusCode: 408,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Request timeout - IGDB API took too long to respond',
          details: 'Request aborted after 10 seconds'
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