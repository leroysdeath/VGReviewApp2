import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Environment variables for IGDB API
const IGDB_CLIENT_ID = Deno.env.get('IGDB_CLIENT_ID')
const IGDB_ACCESS_TOKEN = Deno.env.get('IGDB_ACCESS_TOKEN')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate credentials
    if (!IGDB_CLIENT_ID || !IGDB_ACCESS_TOKEN) {
      console.error('Missing IGDB credentials')
      return new Response(
        JSON.stringify({ 
          error: 'IGDB API credentials not configured',
          message: 'Please configure IGDB_CLIENT_ID and IGDB_ACCESS_TOKEN in Supabase environment variables'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check for placeholder values
    if (IGDB_CLIENT_ID === 'your_igdb_client_id' || IGDB_ACCESS_TOKEN === 'your_igdb_access_token') {
      console.error('IGDB credentials are placeholder values')
      return new Response(
        JSON.stringify({ 
          error: 'Invalid IGDB credentials',
          message: 'IGDB credentials are still set to placeholder values'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { endpoint, query } = await req.json()
    
    if (!endpoint || !query) {
      return new Response(
        JSON.stringify({ error: 'Missing endpoint or query' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`IGDB API request: ${endpoint}`)
    console.log(`Query: ${query}`)

    // Make request to IGDB API
    const igdbResponse = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: 'POST',
      headers: {
        'Client-ID': IGDB_CLIENT_ID,
        'Authorization': `Bearer ${IGDB_ACCESS_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'text/plain',
      },
      body: query,
    })

    console.log(`IGDB API response status: ${igdbResponse.status}`)

    if (!igdbResponse.ok) {
      const errorText = await igdbResponse.text()
      console.error(`IGDB API error: ${igdbResponse.status} - ${errorText}`)
      
      if (igdbResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Authentication failed',
            message: 'Invalid IGDB credentials. Please check your Client ID and Access Token.'
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          error: 'IGDB API error',
          status: igdbResponse.status,
          message: errorText
        }),
        { 
          status: igdbResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await igdbResponse.json()
    
    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        } 
      }
    )

  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})