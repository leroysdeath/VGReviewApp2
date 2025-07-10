// netlify/functions/igdb-search.ts
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

interface IGDBSearchRequest {
  searchTerm: string;
  limit?: number;
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
    const { searchTerm, limit = 10 }: IGDBSearchRequest = JSON.parse(event.body || '{}');

    if (!searchTerm) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Search term is required' }),
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

    // Clean search term
    const cleanSearchTerm = searchTerm.replace(/"/g, '\\"');
    
    const query = `
      fields name, summary, cover.url, platforms.name, first_release_date, rating, genres.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      search "${cleanSearchTerm}";
      limit ${Math.min(limit, 50)};
      where category = 0;
    `;

    console.log('IGDB Query:', query);

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
    console.log('IGDB Response count:', data?.length || 0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data || []),
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