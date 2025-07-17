// netlify/functions/igdb-test.js - Create this as a new file for testing
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

  // Accept both GET and POST
  const query = event.queryStringParameters?.query || 'mario';
  
  try {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const accessToken = process.env.TWITCH_APP_ACCESS_TOKEN;
    
    // Debug info
    console.log('Environment check:', {
      hasClientId: !!clientId,
      hasAccessToken: !!accessToken,
      clientIdLength: clientId?.length,
      query: query
    });
    
    if (!clientId || !accessToken) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Missing credentials',
          hasClientId: !!clientId,
          hasAccessToken: !!accessToken
        })
      };
    }

    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain',
      },
      body: `fields name, cover.url; search "${query}"; limit 5;`
    });

    console.log('IGDB Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: 'IGDB API Error',
          status: response.status,
          message: errorText
        })
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        query: query,
        count: data.length,
        games: data
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Server error',
        message: error.message
      })
    };
  }
};
