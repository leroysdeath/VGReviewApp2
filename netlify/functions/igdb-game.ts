// netlify/functions/igdb-game.ts
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

interface IGDBGameRequest {
  gameId: string;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { gameId }: IGDBGameRequest = JSON.parse(event.body || '{}');

    if (!gameId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Game ID is required' }),
      };
    }

    const numericId = parseInt(gameId);
    if (isNaN(numericId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid game ID format' }),
      };
    }

    // Get credentials from Netlify environment variables
    const clientId = process.env.VITE_IGDB_CLIENT_ID || process.env.TWITCH_CLIENT_ID;
    const accessToken = process.env.VITE_IGDB_ACCESS_TOKEN || process.env.TWITCH_APP_ACCESS_TOKEN;

    if (!clientId || !accessToken) {
      console.error('IGDB credentials not found in environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' }),
      };
    }

    const query = `
      fields name, summary, cover.url, platforms.name, first_release_date, rating, rating_count, genres.name, screenshots.url, videos.video_id, websites.url, websites.category, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      where id = ${numericId};
    `;

    console.log('IGDB Game Query:', query);

    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'text/plain'
      },
      body: query
    });

    if (!response.ok) {
      console.error('IGDB API Error:', response.status, response.statusText);
      
      if (response.status === 401) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'IGDB authentication failed' }),
        };
      }
      
      if (response.status === 429) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({ error: 'Rate limit exceeded' }),
        };
      }

      throw new Error(`IGDB API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('IGDB Game Response:', data?.length || 0, 'games found');

    if (!data || data.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Game not found' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data[0]),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

export { handler };