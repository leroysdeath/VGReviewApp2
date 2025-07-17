// netlify/functions/igdb-search.js - Replace your existing function with this
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

    // COMPREHENSIVE query extraction - handles ANY way the frontend might send it
    let query = null;
    
    // Method 1: URL query parameters (most common)
    if (event.queryStringParameters) {
      const params = event.queryStringParameters;
      query = params.query || params.q || params.search || params.term || 
              params.searchTerm || params.keyword || params.name || params.game;
    }
    
    // Method 2: POST body
    if (!query && event.body) {
      try {
        const body = JSON.parse(event.body);
        query = body.query || body.q || body.search || body.term || 
                body.searchTerm || body.keyword || body.name || body.game;
      } catch (e) {
        // If body isn't JSON, maybe it's just the search term
        query = event.body.trim();
      }
    }
    
    // Method 3: From URL path (sometimes used in REST APIs)
    if (!query) {
      const pathParts = event.path.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart !== 'igdb-search' && lastPart.length > 0) {
        query = decodeURIComponent(lastPart);
      }
    }

    // Method 4: Check for common variations in headers (rare but possible)
    if (!query && event.headers) {
      query = event.headers['x-search-query'] || event.headers['search-term'];
    }

    // Log everything for debugging
    console.log('=== IGDB SEARCH DEBUG ===');
    console.log('HTTP Method:', event.httpMethod);
    console.log('Path:', event.path);
    console.log('Query Parameters:', event.queryStringParameters);
    console.log('Body:', event.body);
    console.log('Extracted Query:', query);
    console.log('========================');

    if (!query || query.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Search query is required',
          debug: {
            receivedParams: event.queryStringParameters,
            receivedBody: event.body ? 'Present' : 'Missing',
            extractedQuery: query,
            message: 'No valid search term found in request'
          }
        })
      };
    }

    // Clean up the query
    query = query.trim();
    
    // Construct IGDB API request
    const igdbUrl = 'https://api.igdb.com/v4/games';
    const requestBody = `
      fields name, cover.url, first_release_date, rating, summary, platforms.name, genres.name;
      search "${query}";
      limit 20;
    `.trim();

    console.log('Making IGDB request for query:', query);

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

    // Transform the data to ensure cover URLs are complete
    const transformedData = data.map(game => ({
      ...game,
      cover: game.cover ? {
        ...game.cover,
        url: game.cover.url?.startsWith('//') 
          ? `https:${game.cover.url}` 
          : game.cover.url
      } : null
    }));

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
