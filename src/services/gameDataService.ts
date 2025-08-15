import { supabase } from './supabase'
import { sanitizeSearchTerm } from '../utils/sqlSecurity'

export interface IGDBGame {
  id: number
  name: string
  summary?: string
  rating?: number
  first_release_date?: number
  cover?: {
    id: number
    image_id: string
    url?: string
  }
  genres?: Array<{
    id: number
    name: string
  }>
  platforms?: Array<{
    id: number
    name: string
  }>
  screenshots?: Array<{
    id: number
    image_id: string
  }>
  videos?: Array<{
    id: number
    video_id: string
  }>
}

interface CacheRecord {
  id: string
  cache_key: string
  endpoint: string
  query_params: any
  response_data: any
  expires_at: string
  created_at: string
  updated_at: string
  hit_count: number
  last_accessed: string
}

interface SearchFilters {
  genreId?: number
  platformId?: number
  minRating?: number
  releaseYear?: number
}

class GameDataService {
  private async getCachedData(cacheKey: string): Promise<IGDBGame[] | null> {
    try {
      const { data, error } = await supabase
        .from('igdb_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gte('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        return null
      }

      await supabase
        .from('igdb_cache')
        .update({
          hit_count: (data.hit_count || 0) + 1,
          last_accessed: new Date().toISOString()
        })
        .eq('id', data.id)

      return this.parseResponseData(data.response_data)
    } catch (error) {
      console.error('Error fetching cached data:', error)
      return null
    }
  }

  private async searchCachedGames(searchTerm: string): Promise<IGDBGame[]> {
    try {
      // Sanitize the search term to prevent SQL injection
      const sanitizedTerm = sanitizeSearchTerm(searchTerm)
      
      if (!sanitizedTerm) {
        return []
      }
      
      // Use Supabase's built-in text search functions with safe parameterization
      const { data, error } = await supabase
        .from('igdb_cache')
        .select('*')
        .or(`cache_key.ilike.*${sanitizedTerm}*,response_data->0->name.ilike.*${sanitizedTerm}*`)
        .gte('expires_at', new Date().toISOString())
        .limit(50)

      if (error) {
        console.error('Cache search error:', error)
        return []
      }

      if (!data || data.length === 0) {
        return []
      }

      const games: IGDBGame[] = []
      const recordsToUpdate: { id: number; hit_count: number }[] = []
      
      // First pass: collect games and record IDs that need updating
      for (const record of data) {
        const parsedGames = this.parseResponseData(record.response_data)
        if (parsedGames) {
          const filteredGames = parsedGames.filter(game => 
            game.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          games.push(...filteredGames)
          
          // Collect records to update
          recordsToUpdate.push({
            id: record.id,
            hit_count: (record.hit_count || 0) + 1
          })
        }
      }

      // Batch update all cache hits at once
      if (recordsToUpdate.length > 0) {
        const updateTime = new Date().toISOString()
        const recordIds = recordsToUpdate.map(r => r.id)
        
        try {
          // Try to use the optimized RPC function first (if migration has been run)
          await supabase.rpc('increment_cache_hits', {
            cache_ids: recordIds,
            access_time: updateTime
          })
        } catch (rpcError) {
          // Fallback to batch updates if RPC doesn't exist
          console.log('Using fallback batch update method')
          
          // Group records by hit count for efficient batch updates
          const hitCountGroups = recordsToUpdate.reduce((groups, record) => {
            const hitCount = record.hit_count
            if (!groups[hitCount]) {
              groups[hitCount] = []
            }
            groups[hitCount].push(record.id)
            return groups
          }, {} as Record<number, number[]>)
          
          // Execute batch updates for each hit count group
          const updatePromises = Object.entries(hitCountGroups).map(([hitCount, ids]) =>
            supabase
              .from('igdb_cache')
              .update({
                hit_count: parseInt(hitCount),
                last_accessed: updateTime
              })
              .in('id', ids)
          )
          
          // Execute all batch updates in parallel
          await Promise.all(updatePromises)
        }
      }

      return this.deduplicateGames(games)
    } catch (error) {
      console.error('Error searching cached games:', error)
      return []
    }
  }

  private parseResponseData(responseData: any): IGDBGame[] | null {
    try {
      if (!responseData) return null
      
      const games = Array.isArray(responseData) ? responseData : [responseData]
      
      return games.map(game => ({
        id: game.id,
        name: game.name || '',
        summary: game.summary,
        rating: game.rating,
        first_release_date: game.first_release_date,
        cover: game.cover ? {
          id: game.cover.id || game.cover,
          image_id: game.cover.image_id || game.cover.url?.split('/').pop()?.replace('.jpg', ''),
          url: game.cover.url
        } : undefined,
        genres: game.genres || [],
        platforms: game.platforms || [],
        screenshots: game.screenshots || [],
        videos: game.videos || []
      }))
    } catch (error) {
      console.error('Error parsing response data:', error)
      return null
    }
  }

  private deduplicateGames(games: IGDBGame[]): IGDBGame[] {
    const seen = new Set<number>()
    return games.filter(game => {
      if (seen.has(game.id)) {
        return false
      }
      seen.add(game.id)
      return true
    })
  }

  async searchGames(searchTerm: string, filters?: SearchFilters): Promise<IGDBGame[]> {
    try {
      let games = await this.searchCachedGames(searchTerm)
      
      if (filters) {
        games = this.applyFilters(games, filters)
      }
      
      return games.slice(0, 20)
    } catch (error) {
      console.error('Error in searchGames:', error)
      return []
    }
  }

  async getGameById(gameId: number): Promise<IGDBGame | null> {
    try {
      const { data, error } = await supabase
        .from('igdb_cache')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .limit(100)

      if (error) {
        console.error('Error fetching game by ID:', error)
        return null
      }

      for (const record of data || []) {
        const games = this.parseResponseData(record.response_data)
        if (games) {
          const game = games.find(g => g.id === gameId)
          if (game) {
            await supabase
              .from('igdb_cache')
              .update({
                hit_count: (record.hit_count || 0) + 1,
                last_accessed: new Date().toISOString()
              })
              .eq('id', record.id)
            
            return game
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error in getGameById:', error)
      return null
    }
  }

  async getPopularGames(limit: number = 20): Promise<IGDBGame[]> {
    try {
      const cacheKey = `popular_games_${limit}`
      
      let games = await this.getCachedData(cacheKey)
      
      if (!games) {
        const { data, error } = await supabase
          .from('igdb_cache')
          .select('*')
          .gte('expires_at', new Date().toISOString())
          .limit(100)

        if (error) {
          console.error('Error fetching popular games:', error)
          return []
        }

        const allGames: IGDBGame[] = []
        for (const record of data || []) {
          const parsedGames = this.parseResponseData(record.response_data)
          if (parsedGames) {
            allGames.push(...parsedGames)
          }
        }

        games = this.deduplicateGames(allGames)
          .filter(game => game.rating && game.rating > 70)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, limit)
      }

      return games || []
    } catch (error) {
      console.error('Error in getPopularGames:', error)
      return []
    }
  }

  async getGamesByGenre(genreId: number, limit: number = 20): Promise<IGDBGame[]> {
    try {
      const { data, error } = await supabase
        .from('igdb_cache')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .limit(100)

      if (error) {
        console.error('Error fetching games by genre:', error)
        return []
      }

      const allGames: IGDBGame[] = []
      for (const record of data || []) {
        const parsedGames = this.parseResponseData(record.response_data)
        if (parsedGames) {
          const genreGames = parsedGames.filter(game => 
            game.genres?.some(g => g.id === genreId)
          )
          allGames.push(...genreGames)
        }
      }

      return this.deduplicateGames(allGames)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, limit)
    } catch (error) {
      console.error('Error in getGamesByGenre:', error)
      return []
    }
  }

  private applyFilters(games: IGDBGame[], filters: SearchFilters): IGDBGame[] {
    return games.filter(game => {
      if (filters.genreId && !game.genres?.some(g => g.id === filters.genreId)) {
        return false
      }
      if (filters.platformId && !game.platforms?.some(p => p.id === filters.platformId)) {
        return false
      }
      if (filters.minRating && (!game.rating || game.rating < filters.minRating)) {
        return false
      }
      if (filters.releaseYear && game.first_release_date) {
        const releaseYear = new Date(game.first_release_date * 1000).getFullYear()
        if (releaseYear !== filters.releaseYear) {
          return false
        }
      }
      return true
    })
  }

  getCoverImageUrl(imageId: string, size: 'cover_small' | 'cover_big' | 'cover_large' = 'cover_big'): string {
    if (!imageId) return ''
    return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`
  }
}

export const gameDataService = new GameDataService()