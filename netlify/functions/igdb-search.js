// netlify/functions/igdb-search.js
exports.handler = async (event, context) => {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow GET and POST methods
  if (!['GET', 'POST'].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed. Use GET or POST.' }),
    };
  }

  try {
    // Get environment variables
    const clientId = process.env.TWITCH_CLIENT_ID;
    const accessToken = process.env.TWITCH_APP_ACCESS_TOKEN;
    
    // Validate environment variables
    if (!clientId || !accessToken) {
      console.error('Missing environment variables:', { 
        hasClientId: !!clientId, 
        hasAccessToken: !!accessToken 
      });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Missing API credentials',
          debug: {
            hasClientId: !!clientId,
            hasAccessToken: !!accessToken
          }
        }),
      };
    }

    // Get search query from URL params (GET) or request body (POST)
    let query;
    
    if (event.httpMethod === 'GET') {
      query = event.queryStringParameters?.query || event.queryStringParameters?.q;
    } else if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      query = body.query || body.q;
    }
    
    if (!query) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Search query is required' }),
      };
    }

    // Construct IGDB API request
    const igdbUrl = 'https://api.igdb.com/v4/games';
    const requestBody = `
      fields name, cover.url, first_release_date, rating, summary, platforms.name, genres.name;
      search "${query}";
      limit 20;
    `.trim();

    console.log('Making IGDB request:', { query, clientId: clientId.substring(0, 8) + '...' });

    // Make request to IGDB API
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
      
      // Handle specific error cases
      if (response.status === 401) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            error: 'Authentication failed - check your API credentials',
            details: errorText
          }),
        };
      }
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'IGDB API error',
          status: response.status,
          details: errorText
        }),
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
      body: JSON.stringify(transformedData),
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      }),
    };
  }
};
