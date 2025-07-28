import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'


serve(async (req) => {
  console.log('🎮 IGDB Proxy called:', req.method, req.url);
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    // Validate environment variables
    const clientId = Deno.env.get('TWITCH_CLIENT_ID');
    const accessToken = Deno.env.get('TWITCH_APP_ACCESS_TOKEN');
    
    console.log('🔑 Environment check:', {
      hasClientId: !!clientId,
      hasAccessToken: !!accessToken,
      clientIdLength: clientId?.length,
      tokenLength: accessToken?.length
    });

    if (!clientId || !accessToken) {
      console.error('❌ Missing IGDB credentials');
      return new Response(JSON.stringify({
        error: 'Server configuration error',
        details: 'IGDB credentials not configured. Check Supabase Edge Function secrets.',
        missing: {
          clientId: !clientId,
          accessToken: !accessToken
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check for placeholder values
    if (clientId.includes('your_client_id') || accessToken.includes('your_access_token')) {
      return new Response(JSON.stringify({
        error: 'Placeholder credentials detected',
        details: 'Replace placeholder values with actual Twitch credentials'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse and validate request body
    let requestData;
    try {
      requestData = await req.json();
      console.log('📥 Request data:', requestData);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { endpoint, body } = requestData;
    
    // Validate required fields
    if (!endpoint || !body) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        details: 'Both endpoint and body are required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`🔍 IGDB Request to: ${endpoint}`);
    console.log('📤 IGDB Body:', body);

    // Make request to IGDB API
    const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
        // Removed Content-Type header
      },
      body: body
    });

    console.log('📡 IGDB Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ IGDB API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      // Handle specific error cases
      if (response.status === 401) {
        return new Response(JSON.stringify({
          error: 'IGDB authentication failed',
          details: 'Access token may be expired. Generate a new one.',
          solution: 'Run: curl -X POST "https://id.twitch.tv/oauth2/token" -d "client_id=YOUR_ID&client_secret=YOUR_SECRET&grant_type=client_credentials"'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      if (response.status === 429) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          details: 'Too many requests to IGDB API'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({
        error: `IGDB API error: ${response.status}`,
        details: errorText,
        statusText: response.statusText
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse response
    const data = await response.json();
    console.log('✅ IGDB Success:', {
      resultsCount: Array.isArray(data) ? data.length : 'Not an array',
      firstResult: Array.isArray(data) && data[0] ? data[0].name || 'No name field' : 'No results'
    });
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('💥 Function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      stack: Deno.env.get('DENO_ENV') === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
