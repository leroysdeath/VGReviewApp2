import { supabase } from '../utils/supabaseClient'

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
        .select('id, response_data, hit_count')
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
      const searchPattern = `%${searchTerm.toLowerCase()}%`
      
      const { data, error } = await supabase
        .from('igdb_cache')
        .select('id, response_data, hit_count')
        .or(`cache_key.ilike.${searchPattern},response_data->0->name.ilike.${searchPattern}`)
        .gte('expires_at', new Date().toISOString())
        .order('hit_count', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Cache search error:', error)
        return []
      }

      if (!data || data.length === 0) {
        return []
      }

      // Batch update hit counts for better performance
      const updatePromises: Promise<any>[] = []
      const games: IGDBGame[] = []
      
      for (const record of data) {
        const parsedGames = this.parseResponseData(record.response_data)
        if (parsedGames) {
          const filteredGames = parsedGames.filter(game => 
            game.name && game.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          games.push(...filteredGames)

          // Add to batch update
          updatePromises.push(
            supabase
              .from('igdb_cache')
              .update({
                hit_count: (record.hit_count || 0) + 1,
                last_accessed: new Date().toISOString()
              })
              .eq('id', record.id)
          )
        }
      }

      // Execute all updates in parallel
      await Promise.allSettled(updatePromises)

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
      
      return games
        .filter(game => game && typeof game === 'object' && game.id)
        .map(game => ({
          id: Number(game.id),
          name: game.name || '',
          summary: typeof game.summary === 'string' ? game.summary : undefined,
          rating: typeof game.rating === 'number' ? game.rating : undefined,
          first_release_date: typeof game.first_release_date === 'number' ? game.first_release_date : undefined,
          cover: game.cover && typeof game.cover === 'object' ? {
            id: Number(game.cover.id) || Number(game.cover) || 0,
            image_id: game.cover.image_id || game.cover.url?.split('/').pop()?.replace('.jpg', '') || '',
            url: game.cover.url
          } : undefined,
          genres: Array.isArray(game.genres) ? game.genres.filter(g => g && g.id && g.name) : [],
          platforms: Array.isArray(game.platforms) ? game.platforms.filter(p => p && p.id && p.name) : [],
          screenshots: Array.isArray(game.screenshots) ? game.screenshots.filter(s => s && s.id) : [],
          videos: Array.isArray(game.videos) ? game.videos.filter(v => v && v.id) : []
        }))
        .filter(game => game.id && game.name)
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
        .select('id, response_data, hit_count')
        .gte('expires_at', new Date().toISOString())
        .order('hit_count', { ascending: false })
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
          .select('id, response_data, hit_count')
          .gte('expires_at', new Date().toISOString())
          .order('hit_count', { ascending: false })
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
        .select('id, response_data, hit_count')
        .gte('expires_at', new Date().toISOString())
        .order('hit_count', { ascending: false })
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