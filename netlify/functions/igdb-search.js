// IGDB Search Netlify Function - Enhanced with comprehensive debugging
// This function handles IGDB API requests with proper error handling and JSON responses

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Debug logging helper
const debugLog = (message, data = null) => {
  console.log(`🐛 [DEBUG] ${message}`, data || '');
};

// Helper function to create standardized error responses
const createErrorResponse = (statusCode, error, message, details = null) => {
  const errorResponse = {
    error,
    message,
    status: statusCode,
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    errorResponse.details = details;
  }
  
  debugLog('Creating error response', errorResponse);

  console.error(`❌ Error Response [${statusCode}]:`, errorResponse);

  return {
    statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(errorResponse),
  };
};

// Helper function to create success responses
const createSuccessResponse = (data) => {
  console.log('✅ Success Response:', {
  debugLog('Creating success response', { gamesCount: data.games?.length, total: data.total });
    gamesCount: data.games?.length || 0,
    total: data.total || 0,
    searchTerm: data.searchTerm
  });

  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
    },
    body: JSON.stringify(data),
  };
};

// Validate environment variables
const validateEnvironment = () => {
  debugLog('Starting environment validation');
  console.log('🔧 Validating environment variables...');
  
  const clientId = process.env.TWITCH_CLIENT_ID;
  const accessToken = process.env.TWITCH_APP_ACCESS_TOKEN;

  console.log('Environment check:', {
    hasClientId: !!clientId,
    hasAccessToken: !!accessToken,
    clientIdLength: clientId ? clientId.length : 0,
    tokenLength: accessToken ? accessToken.length : 0
  });

  debugLog('Environment variables check', { hasClientId: !!clientId, hasAccessToken: !!accessToken });

  if (!clientId || !accessToken) {
    console.error('❌ Missing environment variables');
    return null;
  }

  // Check for placeholder values
  if (clientId === 'your_client_id' || 
      clientId === 'your_twitch_client_id' ||
      accessToken === 'your_access_token' || 
      accessToken === 'your_twitch_app_access_token') {
    console.error('❌ Environment variables contain placeholder values');
    debugLog('Placeholder values detected', { clientId: clientId?.substring(0, 10), accessToken: accessToken?.substring(0, 10) });
    return null;
  }

  console.log('✅ Environment variables validated');
  return { clientId, accessToken };
};

// Parse and validate request body
const parseRequestBody = (body) => {
  debugLog('Parsing request body', { hasBody: !!body, bodyLength: body?.length });
  if (!body) {
    throw new Error('Request body is required');
  }

  let requestData;
  try {
    requestData = JSON.parse(body);
    debugLog('Successfully parsed JSON', requestData);
    console.log('📝 Parsed request data:', {
      searchTerm: requestData.searchTerm,
      limit: requestData.limit,
      hasSearchTerm: !!requestData.searchTerm
    });
  } catch (parseError) {
    console.error('❌ JSON parse error:', parseError.message);
    debugLog('JSON parse failed', { error: parseError.message, body: body?.substring(0, 200) });
    throw new Error('Invalid JSON in request body');
  }

  // Validate required fields
  if (!requestData.searchTerm || typeof requestData.searchTerm !== 'string') {
    throw new Error('searchTerm is required and must be a string');
  }

  if (requestData.searchTerm.trim().length === 0) {
    throw new Error('searchTerm cannot be empty');
    debugLog('Empty search term detected');
  }

  return {
    searchTerm: requestData.searchTerm.trim(),
    limit: requestData.limit && requestData.limit > 0 ? Math.min(requestData.limit, 50) : 20
  };
};

// Build IGDB Apicalypse query
const buildSearchQuery = (searchTerm, limit) => {
  debugLog('Building IGDB query', { searchTerm, limit });
  const query = `
    fields name, summary, cover.url, platforms.name, first_release_date, rating, genres.name;
    search "${searchTerm}";
    where rating_count > 5;
    limit ${limit};
  `.trim();

  debugLog('Generated query', { query, length: query.length });
  console.log('🔍 Built IGDB query:', {
    searchTerm,
    limit,
    queryLength: query.length
  });

  return query;
};

// Transform IGDB game data to our format
const transformIGDBGame = (game) => {
  debugLog('Transforming IGDB game', { id: game.id, name: game.name });
  const transformed = {
    id: game.id.toString(),
    name: game.name,
    summary: game.summary || '',
    coverImage: game.cover?.url 
      ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}`
      : '',
    platforms: game.platforms?.map(p => p.name) || [],
    releaseDate: game.first_release_date 
      ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
      : '',
    rating: game.rating ? Math.round(game.rating / 10) : 0,
    genres: game.genres?.map(g => g.name) || [],
  };

  debugLog('Transformed game result', transformed);
  return transformed;
};

// Make request to IGDB API
const makeIGDBRequest = async (query, clientId, accessToken) => {
  console.log('📡 Making IGDB API request...');
  debugLog('Starting IGDB API request', { queryLength: query.length, hasClientId: !!clientId, hasAccessToken: !!accessToken });
  
  const requestStart = Date.now();
  
  try {
    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'text/plain',
      },
      body: query,
    });

    const requestDuration = Date.now() - requestStart;
    debugLog('IGDB API request completed', { duration: requestDuration, status: response.status });
    
    console.log('📡 IGDB API response received:', {
      status: response.status,
      statusText: response.statusText,
      duration: `${requestDuration}ms`,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    });

    if (!response.ok) {
      debugLog('IGDB API returned error status', { status: response.status, statusText: response.statusText });
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Unable to read error response';
      }

      debugLog('IGDB API error text', { errorText: errorText?.substring(0, 500) });
      console.error(`❌ IGDB API error: ${response.status} - ${errorText}`);

      // Handle specific HTTP status codes
      switch (response.status) {
        case 401:
          throw new Error('Invalid IGDB credentials. Please check your Client ID and Access Token.');
        case 429:
          throw new Error('Too many requests to IGDB API. Please try again later.');
        case 403:
          throw new Error('Access to IGDB API is forbidden. Please check your API permissions.');
        case 500:
        case 502:
        case 503:
        case 504:
          throw new Error('IGDB API is temporarily unavailable. Please try again later.');
        default:
          throw new Error(`IGDB API returned an error: ${errorText || 'Unknown error'}`);
      }
    }

    // Parse JSON response
    let games;
    try {
      debugLog('Parsing IGDB JSON response');
      games = await response.json();
      console.log('✅ Successfully parsed IGDB response:', {
        gamesCount: games.length,
        firstGameId: games[0]?.id,
        firstGameName: games[0]?.name
      });
    } catch (parseError) {
      console.error('❌ Failed to parse IGDB JSON response:', parseError.message);
      debugLog('IGDB JSON parse failed', { error: parseError.message });
      throw new Error('Received invalid response from IGDB API');
    }

    // Handle empty response
    if (!Array.isArray(games)) {
      console.warn('⚠️ IGDB response is not an array:', typeof games);
      return [];
      debugLog('IGDB response not an array', { type: typeof games, games });
    }

    return games;

  } catch (error) {
    console.error('💥 IGDB request failed:', error.message);
    throw error;
  }
};

// Main handler function using CommonJS exports
exports.handler = async (event, context) => {
  debugLog('Function invoked', { method: event.httpMethod, path: event.path });
  console.log('🚀 IGDB Search function invoked:', {
    method: event.httpMethod,
    path: event.path,
    headers: {
      'content-type': event.headers['content-type'],
      'user-agent': event.headers['user-agent'],
      origin: event.headers.origin
    },
    hasBody: !!event.body,
    bodyLength: event.body ? event.body.length : 0,
    timestamp: new Date().toISOString()
  });

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      debugLog('Handling CORS preflight');
      console.log('✅ Handling CORS preflight request');
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'CORS preflight successful' }),
      };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      debugLog('Invalid HTTP method', { method: event.httpMethod });
      return createErrorResponse(
        405,
        'Method Not Allowed',
        'Only POST requests are allowed',
        { allowedMethods: ['POST', 'OPTIONS'] }
      );
    }

    // Validate environment variables
    const env = validateEnvironment();
    debugLog('Environment validation result', { hasEnv: !!env });
    if (!env) {
      return createErrorResponse(
        500,
        'Configuration Error',
        'IGDB API credentials not properly configured. Please set TWITCH_CLIENT_ID and TWITCH_APP_ACCESS_TOKEN environment variables.',
        { 
          requiredVars: ['TWITCH_CLIENT_ID', 'TWITCH_APP_ACCESS_TOKEN'],
          documentation: 'https://dev.twitch.tv/console/apps'
        }
      );
    }

    // Parse and validate request body
    let requestData;
    try {
      debugLog('Attempting to parse request body');
      requestData = parseRequestBody(event.body);
    } catch (error) {
      return createErrorResponse(
        400,
        'Bad Request',
        error.message,
        { expectedFormat: { searchTerm: 'string', limit: 'number (optional)' } }
      );
    }

    // Build IGDB query
    debugLog('Building IGDB query for request', requestData);
    const query = buildSearchQuery(requestData.searchTerm, requestData.limit);

    // Make IGDB API request
    let games;
    try {
      games = await makeIGDBRequest(query, env.clientId, env.accessToken);
    } catch (error) {
      debugLog('IGDB API request failed', { error: error.message });
      // Determine appropriate status code based on error type
      let statusCode = 502; // Bad Gateway (external API error)
      
      if (error.message.includes('credentials') || error.message.includes('Invalid')) {
        statusCode = 401;
      } else if (error.message.includes('too many requests') || error.message.includes('rate limit')) {
        statusCode = 429;
      } else if (error.message.includes('forbidden') || error.message.includes('permissions')) {
        statusCode = 403;
      } else if (error.message.includes('unavailable') || error.message.includes('temporarily')) {
        statusCode = 503;
      }

      return createErrorResponse(
        statusCode,
        'IGDB API Error',
        error.message,
        { 
          searchTerm: requestData.searchTerm,
          retryAfter: statusCode === 429 ? '60 seconds' : undefined
        }
      );
    }

    // Transform games data
    debugLog('Transforming games data', { count: games.length });
    const transformedGames = games.map(transformIGDBGame);
    
    console.log(`🎮 Successfully processed ${transformedGames.length} games for "${requestData.searchTerm}"`);
    
    // Return success response
    return createSuccessResponse({
      games: transformedGames,
      total: transformedGames.length,
      searchTerm: requestData.searchTerm,
      limit: requestData.limit,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Unexpected error in IGDB search function:', {
    debugLog('Unexpected error in function', { message: error.message, stack: error.stack });
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return createErrorResponse(
      500,
      'Internal Server Error',
      'An unexpected error occurred while processing your request',
      { 
        errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      }
    );
  }
};