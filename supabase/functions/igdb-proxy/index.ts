import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// These should be set in your Supabase project's environment variables
const IGDB_CLIENT_ID = Deno.env.get('IGDB_CLIENT_ID')
const IGDB_ACCESS_TOKEN = Deno.env.get('IGDB_ACCESS_TOKEN')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if credentials are available
    if (!IGDB_CLIENT_ID || !IGDB_ACCESS_TOKEN) {
      console.error('Missing IGDB credentials in environment variables')
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
    if (IGDB_CLIENT_ID === 'your_client_id_here' || IGDB_ACCESS_TOKEN === 'your_access_token_here') {
      console.error('IGDB credentials are still using placeholder values')
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

    // Extract the endpoint from the URL
    const url = new URL(req.url)
    const endpoint = url.pathname.replace('/functions/v1/igdb-proxy/', '')
    
    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'No endpoint specified' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the request body for POST requests
    const body = req.method === 'POST' ? await req.text() : undefined

    console.log(`Proxying request to IGDB: ${endpoint}`)
    console.log(`Request method: ${req.method}`)
    if (body) console.log(`Request body: ${body}`)

    // Make the request to IGDB API
    const igdbResponse = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: req.method,
      headers: {
        'Client-ID': IGDB_CLIENT_ID,
        'Authorization': `Bearer ${IGDB_ACCESS_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'text/plain',
      },
      body: body,
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
          'Content-Type': 'application/json' 
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