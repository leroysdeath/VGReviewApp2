// supabase/functions/igdb-cache/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
}

interface IGDBRequest {
  endpoint: string
  query?: string
  gameId?: number
  searchTerm?: string
  filters?: any
  forceRefresh?: boolean
  ttl?: number
}

interface CacheEntry {
  id: string
  cache_key: string
  endpoint: string
  query_params: any
  response_data: any
  expires_at: string
  hit_count: number
  last_accessed: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { endpoint, query, gameId, searchTerm, filters, forceRefresh = false, ttl = 3600 } = await req.json() as IGDBRequest

    // Generate cache key
    const cacheKey = generateCacheKey(endpoint, { query, gameId, searchTerm, filters })

    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
      const cachedResult = await getCachedData(supabaseClient, cacheKey)
      if (cachedResult) {
        // Update access statistics
        await updateCacheAccess(supabaseClient, cachedResult.id)
        
        console.log(`Cache hit for key: ${cacheKey}`)
        return new Response(
          JSON.stringify({
            data: cachedResult.response_data,
            cached: true,
            cacheKey,
            timestamp: cachedResult.last_accessed
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }
    }

    // Fetch fresh data from IGDB
    const freshData = await fetchFromIGDB(endpoint, { query, gameId, searchTerm, filters })

    if (freshData) {
      // Store in cache
      await storeCacheData(supabaseClient, {
        cacheKey,
        endpoint,
        queryParams: { query, gameId, searchTerm, filters },
        responseData: freshData,
        ttl
      })

      console.log(`Fresh data cached for key: ${cacheKey}`)
      return new Response(
        JSON.stringify({
          data: freshData,
          cached: false,
          cacheKey,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else {
      throw new Error('No data received from IGDB')
    }

  } catch (error) {
    console.error('Error in IGDB cache function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        cached: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// Helper Functions
function generateCacheKey(endpoint: string, params: any): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result: any, key: string) => {
      if (params[key] !== undefined && params[key] !== null) {
        result[key] = params[key]
      }
      return result
    }, {})
  
  return `${endpoint}:${btoa(JSON.stringify(sortedParams))}`
}

async function getCachedData(supabase: any, cacheKey: string): Promise<CacheEntry | null> {
  try {
    const { data, error } = await supabase
      .from('igdb_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Cache lookup error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error getting cached data:', error)
    return null
  }
}

async function updateCacheAccess(supabase: any, cacheId: string): Promise<void> {
  try {
    await supabase
      .from('igdb_cache')
      .update({ 
        hit_count: supabase.raw('hit_count + 1'),
        last_accessed: new Date().toISOString() 
      })
      .eq('id', cacheId)
  } catch (error) {
    console.error('Error updating cache access:', error)
    // Don't throw - this is not critical
  }
}

async function storeCacheData(supabase: any, {
  cacheKey,
  endpoint,
  queryParams,
  responseData,
  ttl
}: {
  cacheKey: string
  endpoint: string
  queryParams: any
  responseData: any
  ttl: number
}): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()

    const { error } = await supabase
      .from('igdb_cache')
      .upsert({
        cache_key: cacheKey,
        endpoint,
        query_params: queryParams,
        response_data: responseData,
        expires_at: expiresAt,
        hit_count: 0,
        last_accessed: new Date().toISOString()
      })

    if (error) {
      console.error('Error storing cache data:', error)
    }
  } catch (error) {
    console.error('Error in storeCacheData:', error)
    // Don't throw - caching failure shouldn't break the request
  }
}

async function fetchFromIGDB(endpoint: string, params: any): Promise<any> {
  const clientId = Deno.env.get('TWITCH_CLIENT_ID')
  const accessToken = Deno.env.get('TWITCH_APP_ACCESS_TOKEN')

  if (!clientId || !accessToken) {
    throw new Error('Missing IGDB credentials')
  }

  let igdbQuery = ''
  
  // Build IGDB query based on endpoint and parameters
  switch (endpoint) {
    case 'games':
      if (params.gameId) {
        igdbQuery = `
          fields name,slug,summary,cover.url,screenshots.url,genres.name,platforms.name,
                 release_dates.date,rating,rating_count,involved_companies.company.name,
                 involved_companies.publisher,videos.video_id;
          where id = ${params.gameId};
        `
      } else if (params.searchTerm) {
        igdbQuery = `
          fields name,slug,summary,cover.url,first_release_date,rating,genres.name,platforms.name;
          search "${params.searchTerm}";
          limit ${params.filters?.limit || 20};
        `
      } else if (params.query) {
        igdbQuery = params.query
      }
      break
      
    case 'search':
      igdbQuery = `
        fields name,slug,cover.url,first_release_date,rating,genres.name;
        search "${params.searchTerm}";
        limit ${params.filters?.limit || 10};
      `
      break
      
    case 'popular':
      igdbQuery = `
        fields name,slug,cover.url,first_release_date,rating,genres.name,platforms.name;
        where rating > 75 & rating_count > 100;
        sort rating desc;
        limit ${params.filters?.limit || 20};
      `
      break
      
    default:
      throw new Error(`Unsupported endpoint: ${endpoint}`)
  }

  console.log(`Fetching from IGDB: ${endpoint}`, { query: igdbQuery })

  const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: igdbQuery
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('IGDB API error:', response.status, errorText)
    throw new Error(`IGDB API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  console.log(`IGDB response: ${data.length} items`)
  
  return data
}
