import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

// TypeScript interfaces for IGDB API responses
interface IGDBCover {
  id: number;
  url: string;
}

interface IGDBPlatform {
  id: number;
  name: string;
}

interface IGDBGenre {
  id: number;
  name: string;
}

interface IGDBGame {
  id: number;
  name: string;
  summary?: string;
  cover?: IGDBCover;
  platforms?: IGDBPlatform[];
  first_release_date?: number;
  rating?: number;
  genres?: IGDBGenre[];
}

interface SearchRequest {
  searchTerm: string;
  limit?: number;
}

interface ErrorResponse {
  error: string;
  message: string;
  status?: number;
}

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Helper function to create error responses
const createErrorResponse = (
  status: number, 
  error: string, 
  message: string
): { statusCode: number; headers: any; body: string } => {
  return {
    statusCode: status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      error,
      message,
      status,
    } as ErrorResponse),
  };
};

// Helper function to create success response
const createSuccessResponse = (data: any): { statusCode: number; headers: any; body: string } => {
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
const validateEnvironment = (): { clientId: string; accessToken: string } | null => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const accessToken = process.env.TWITCH_APP_ACCESS_TOKEN;

  if (!clientId || !accessToken) {
    return null;
  }

  // Check for placeholder values
  if (clientId === 'your_client_id' || accessToken === 'your_access_token') {
    return null;
  }

  return { clientId, accessToken };
};

// Build IGDB Apicalypse query
const buildSearchQuery = (searchTerm: string, limit: number = 20): string => {
  return `
    fields name, summary, cover.url, platforms.name, first_release_date, rating, genres.name;
    search "${searchTerm}";
    where rating_count > 5;
    limit ${limit};
  `.trim();
};

// Transform IGDB response to our format
const transformIGDBGame = (game: IGDBGame) => {
  return {
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
};

// Main handler function
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  console.log('IGDB Search function called:', {
    method: event.httpMethod,
    headers: event.headers,
    body: event.body ? 'present' : 'empty'
  });

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return createErrorResponse(
      405,
      'Method Not Allowed',
      'Only POST requests are allowed'
    );
  }

  try {
    // Validate environment variables
    const env = validateEnvironment();
    if (!env) {
      console.error('Missing or invalid environment variables');
      return createErrorResponse(
        500,
        'Configuration Error',
        'IGDB API credentials not properly configured. Please set TWITCH_CLIENT_ID and TWITCH_APP_ACCESS_TOKEN environment variables.'
      );
    }

    // Parse request body
    if (!event.body) {
      return createErrorResponse(
        400,
        'Bad Request',
        'Request body is required'
      );
    }

    let requestData: SearchRequest;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      return createErrorResponse(
        400,
        'Bad Request',
        'Invalid JSON in request body'
      );
    }

    // Validate request data
    if (!requestData.searchTerm || typeof requestData.searchTerm !== 'string') {
      return createErrorResponse(
        400,
        'Bad Request',
        'searchTerm is required and must be a string'
      );
    }

    if (requestData.searchTerm.trim().length === 0) {
      return createErrorResponse(
        400,
        'Bad Request',
        'searchTerm cannot be empty'
      );
    }

    const limit = requestData.limit && requestData.limit > 0 ? Math.min(requestData.limit, 50) : 20;
    const query = buildSearchQuery(requestData.searchTerm.trim(), limit);

    console.log('Making IGDB API request:', {
      searchTerm: requestData.searchTerm,
      limit,
      query: query.substring(0, 100) + '...'
    });

    // Make request to IGDB API
    const igdbResponse = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': env.clientId,
        'Authorization': `Bearer ${env.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'text/plain',
      },
      body: query,
    });

    console.log('IGDB API response status:', igdbResponse.status);

    // Handle different error status codes
    if (!igdbResponse.ok) {
      const errorText = await igdbResponse.text();
      console.error(`IGDB API error: ${igdbResponse.status} - ${errorText}`);

      switch (igdbResponse.status) {
        case 401:
          return createErrorResponse(
            401,
            'Authentication Failed',
            'Invalid IGDB credentials. Please check your Client ID and Access Token.'
          );
        case 429:
          return createErrorResponse(
            429,
            'Rate Limit Exceeded',
            'Too many requests to IGDB API. Please try again later.'
          );
        case 403:
          return createErrorResponse(
            403,
            'Access Forbidden',
            'Access to IGDB API is forbidden. Please check your API permissions.'
          );
        case 500:
        case 502:
        case 503:
        case 504:
          return createErrorResponse(
            503,
            'Service Unavailable',
            'IGDB API is temporarily unavailable. Please try again later.'
          );
        default:
          return createErrorResponse(
            igdbResponse.status,
            'IGDB API Error',
            `IGDB API returned an error: ${errorText || 'Unknown error'}`
          );
      }
    }

    // Parse response
    let games: IGDBGame[];
    try {
      games = await igdbResponse.json();
    } catch (parseError) {
      console.error('Failed to parse IGDB response:', parseError);
      return createErrorResponse(
        502,
        'Invalid Response',
        'Received invalid response from IGDB API'
      );
    }

    // Transform and return results
    const transformedGames = games.map(transformIGDBGame);
    
    console.log(`Successfully processed ${transformedGames.length} games`);
    
    return createSuccessResponse({
      games: transformedGames,
      total: transformedGames.length,
      searchTerm: requestData.searchTerm,
      limit,
    });

  } catch (error) {
    console.error('Unexpected error in IGDB search function:', error);
    
    return createErrorResponse(
      500,
      'Internal Server Error',
      'An unexpected error occurred while processing your request'
    );
  }
};