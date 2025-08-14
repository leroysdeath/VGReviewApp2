// netlify/functions/igdb-search.js
const https = require('https');
const { URL, URLSearchParams } = require('url');

// Simple fetch implementation for Node.js
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
      res.on('data', chunk => data += chunk);
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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const accessToken = process.env.TWITCH_APP_ACCESS_TOKEN;

    if (!clientId || !accessToken) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Missing API credentials',
          debug: { hasClientId: !!clientId, hasAccessToken: !!accessToken }
        })
      };
    }

    let requestData = {};

    // Parse request data
    if (event.body) {
      try {
        requestData = JSON.parse(event.body);
      } catch (e) {
        console.error('Failed to parse request body:', e);
      }
    }

    // Extract query parameters
    const queryParams = event.queryStringParameters || {};

    // Determine request type and extract relevant data
    let query = null;
    let gameId = null;
    let requestType = 'search'; // default
    let endpoint = 'games'; // default endpoint
    let customRequestBody = null;

    // Check if this is a bulk scraping request
    if (requestData.isBulkRequest && requestData.endpoint) {
      requestType = 'bulk';
      endpoint = requestData.endpoint;
      customRequestBody = requestData.requestBody;
    }
    // Check if this is a game ID lookup request
    else if (requestData.type === 'getById' || requestData.gameId) {
      requestType = 'getById';
      gameId = requestData.gameId || queryParams.gameId || queryParams.id;
    } else {
      // This is a search request
      query = requestData.searchTerm || requestData.query || requestData.q ||
              queryParams.query || queryParams.q || queryParams.search || queryParams.term;
    }

    console.log('=== IGDB REQUEST DEBUG ===');
    console.log('HTTP Method:', event.httpMethod);
    console.log('Request Type:', requestType);
    console.log('Endpoint:', endpoint);
    console.log('Query:', query);
    console.log('Game ID:', gameId);
    console.log('Request Data:', requestData);
    console.log('Query Params:', queryParams);
    console.log('=========================');

    const igdbUrl = `https://api.igdb.com/v4/${endpoint}`;
    let requestBody = '';
    let limit = requestData.limit || queryParams.limit || 20;

    if (requestType === 'bulk') {
      // Handle bulk scraping request with custom request body
      if (!customRequestBody) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Request body is required for bulk requests',
            debug: { requestData, queryParams }
          })
        };
      }

      requestBody = customRequestBody;
      console.log('Making IGDB bulk request for endpoint:', endpoint);
    } else if (requestType === 'getById') {
      // Handle individual game lookup by ID
      if (!gameId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Game ID is required for getById request',
            debug: { requestData, queryParams }
          })
        };
      }

      requestBody = `
fields name, cover.url, first_release_date, rating, summary, platforms.name, genres.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
where id = ${gameId};
      `.trim();

      console.log('Making IGDB request for game ID:', gameId);
    } else {
      // Handle search request
      if (!query || query.trim().length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Search query is required',
            debug: {
              receivedParams: queryParams,
              receivedBody: event.body ? 'Present' : 'Missing',
              extractedQuery: query,
              message: 'No valid search term found in request'
            }
          })
        };
      }

      query = query.trim();
      requestBody = `
fields name, cover.url, first_release_date, rating, summary, platforms.name, genres.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
search "${query}";
limit ${limit};
      `.trim();

      console.log('Making IGDB search request for query:', query);
    }

    const response = await fetch(igdbUrl, {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain',
      },
      body: requestBody,
    });

    console.log('IGDB response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('IGDB API error:', response.status, errorText);

      if (response.status === 401) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            error: 'Authentication failed - check your API credentials',
            details: errorText
          })
        };
      }

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: 'IGDB API error',
          status: response.status,
          details: errorText
        })
      };
    }

    const data = await response.json();
    console.log('IGDB data received:', data.length, 'games');

    // Transform the data to ensure cover URLs are complete and add developer/publisher info
    const transformedData = data.map(game => {
      // Extract developer and publisher from involved_companies
      let developer = 'Unknown';
      let publisher = 'Unknown';

      if (game.involved_companies && game.involved_companies.length > 0) {
        const dev = game.involved_companies.find(ic => ic.developer && ic.company);
        const pub = game.involved_companies.find(ic => ic.publisher && ic.company);

        if (dev && dev.company && dev.company.name) {
          developer = dev.company.name;
        }
        if (pub && pub.company && pub.company.name) {
          publisher = pub.company.name;
        }
      }

      return {
        ...game,
        developer,
        publisher,
        cover: game.cover ? {
          ...game.cover,
          url: game.cover.url?.startsWith('//')
            ? `https:${game.cover.url}`
            : game.cover.url
        } : null
      };
    });

    // Return the appropriate response format
    if (requestType === 'getById') {
      // For individual game requests, return the game directly or null
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(transformedData.length > 0 ? transformedData[0] : null)
      };
    } else if (requestType === 'bulk') {
      // For bulk requests, return the raw data array
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(transformedData)
      };
    } else {
      // For search requests, return the full response with metadata
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          query: query,
          count: transformedData.length,
          games: transformedData
        })
      };
    }

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      })
    };
  }
};
