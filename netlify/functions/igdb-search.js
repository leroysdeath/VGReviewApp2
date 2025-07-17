exports.handler = async (event, context) => {
  console.log('🎮 IGDB Function called:', event.httpMethod, event.path);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(event.body || '{}');
      console.log('📥 Request data:', requestData);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { searchTerm, limit = 10 } = requestData;
    
    if (!searchTerm || searchTerm.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Search term is required' })
      };
    }

    // Check environment variables
    const clientId = process.env.TWITCH_CLIENT_ID;
    const accessToken = process.env.TWITCH_APP_ACCESS_TOKEN;
    
    console.log('🔑 Environment check:', {
      hasClientId: !!clientId,
      hasAccessToken: !!accessToken,
      clientIdLength: clientId?.length,
      tokenLength: accessToken?.length
    });

    if (!clientId || !accessToken) {
      console.error('❌ Missing IGDB credentials');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          details: 'IGDB credentials not configured. Check Netlify environment variables.',
          missing: {
            clientId: !clientId,
            accessToken: !accessToken
          }
        })
      };
    }

if (clientId.includes('your_client_id') || accessToken.includes('your_access_token')) {
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({ 
      error: 'Placeholder credentials detected',
      details: 'Replace placeholder values with actual Twitch credentials'
    })
  };
}
    
    // Prepare IGDB query
    const cleanSearchTerm = searchTerm.trim().replace(/"/g, '\\"');
    const query = `fields name, summary; search "${cleanSearchTerm}"; limit 10;`;    
    console.log('🔍 IGDB Query:', query);

    // Make request to IGDB API
    const igdbResponse = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
      body: query
    });

    console.log('📡 IGDB Response:', {
      status: igdbResponse.status,
      statusText: igdbResponse.statusText,
      ok: igdbResponse.ok
    });

    if (!igdbResponse.ok) {
      const errorText = await igdbResponse.text();
      console.error('❌ IGDB API Error:', {
        status: igdbResponse.status,
        statusText: igdbResponse.statusText,
        body: errorText
      });
      
      // Handle specific error cases
      if (igdbResponse.status === 401) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            error: 'IGDB authentication failed',
            details: 'Access token may be expired. Generate a new one.',
            solution: 'Run: curl -X POST "https://id.twitch.tv/oauth2/token" -d "client_id=YOUR_ID&client_secret=YOUR_SECRET&grant_type=client_credentials"'
          })
        };
      }
      
      if (igdbResponse.status === 429) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({ 
            error: 'Rate limit exceeded',
            details: 'Too many requests to IGDB API'
          })
        };
      }

      return {
        statusCode: igdbResponse.status,
        headers,
        body: JSON.stringify({ 
          error: `IGDB API error: ${igdbResponse.status}`,
          details: errorText,
          statusText: igdbResponse.statusText
        })
      };
    }

    // Parse response
    const data = await igdbResponse.json();
    console.log('✅ IGDB Success:', {
      resultsCount: data?.length || 0,
      firstResult: data?.[0]?.name || 'No results'
    });

    // Process cover URLs
    const processedData = data.map(game => ({
      ...game,
      cover: game.cover ? {
        ...game.cover,
        url: game.cover.url ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : null
      } : null,
      screenshots: game.screenshots?.map(screenshot => ({
        ...screenshot,
        url: screenshot.url ? `https:${screenshot.url.replace('t_thumb', 't_screenshot_med')}` : null
      })) || []
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(processedData)
    };

  } catch (error) {
    console.error('💥 Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
