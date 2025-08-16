import { supabase } from './supabase'

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
    url?: string
  }>
  videos?: Array<{
    id: number
    video_id: string
  }>
}

class IGDBService {
  private mapDatabaseGameToIGDBGame(dbGame: any): IGDBGame {
    return {
      id: dbGame.igdb_id || dbGame.id,
      name: dbGame.name,
      summary: dbGame.summary || dbGame.description,
      rating: dbGame.igdb_rating,
      first_release_date: dbGame.release_date ? new Date(dbGame.release_date).getTime() / 1000 : undefined,
      cover: dbGame.cover_url || dbGame.pic_url ? {
        id: 0,
        image_id: this.extractImageId(dbGame.cover_url || dbGame.pic_url),
        url: dbGame.cover_url || dbGame.pic_url
      } : undefined,
      genres: dbGame.genres ? dbGame.genres.map((g: string, index: number) => ({
        id: index,
        name: g
      })) : dbGame.genre ? [{
        id: 0,
        name: dbGame.genre
      }] : [],
      platforms: dbGame.platforms ? dbGame.platforms.map((p: string, index: number) => ({
        id: index,
        name: p
      })) : [],
      screenshots: dbGame.screenshots ? dbGame.screenshots.map((url: string, index: number) => ({
        id: index,
        image_id: this.extractImageId(url),
        url
      })) : [],
      videos: []
    }
  }

  private extractImageId(url: string | null | undefined): string {
    if (!url) return ''
    const match = url.match(/\/([a-z0-9]+)\.(jpg|png)$/i)
    return match ? match[1] : ''
  }

  async searchGames(searchTerm: string, limit: number = 20): Promise<IGDBGame[]> {
    try {
      const { data, error } = await supabase
        .from('game')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .limit(limit)

      if (error) {
        console.error('Error searching games:', error)
        return []
      }

      return (data || []).map(game => this.mapDatabaseGameToIGDBGame(game))
    } catch (error) {
      console.error('Error searching games:', error)
      return []
    }
  }

  async getGameById(id: number): Promise<IGDBGame | null> {
    try {
      const { data: gameByIgdbId, error: igdbError } = await supabase
        .from('game')
        .select('*')
        .eq('igdb_id', id)
        .single()

      if (!igdbError && gameByIgdbId) {
        return this.mapDatabaseGameToIGDBGame(gameByIgdbId)
      }

      const { data: gameById, error: idError } = await supabase
        .from('game')
        .select('*')
        .eq('id', id)
        .single()

      if (idError) {
        console.error('Error getting game by ID:', error)
        return null
      }

      return gameById ? this.mapDatabaseGameToIGDBGame(gameById) : null
    } catch (error) {
      console.error('Error getting game by ID:', error)
      return null
    }
  }

  async getGameDetails(id: number): Promise<IGDBGame | null> {
    try {
      const { data, error } = await supabase
        .from('game')
        .select(`
          *,
          platform_games (
            platform:platform_id (
              name
            )
          )
        `)
        .or(`igdb_id.eq.${id},id.eq.${id}`)
        .single()

      if (error) {
        console.error('Error getting game details:', error)
        return null
      }

      if (data && data.platform_games) {
        const platforms = data.platform_games
          .filter((pg: any) => pg.platform)
          .map((pg: any, index: number) => ({
            id: index,
            name: pg.platform.name
          }))
        
        const gameData = { ...data, platforms }
        delete gameData.platform_games
        
        return this.mapDatabaseGameToIGDBGame(gameData)
      }

      return data ? this.mapDatabaseGameToIGDBGame(data) : null
    } catch (error) {
      console.error('Error getting game details:', error)
      return null
    }
  }

  async getPopularGames(limit: number = 20): Promise<IGDBGame[]> {
    try {
      const { data, error } = await supabase
        .from('game')
        .select('*')
        .not('igdb_rating', 'is', null)
        .order('igdb_rating', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error getting popular games:', error)
        return []
      }

      return (data || []).map(game => this.mapDatabaseGameToIGDBGame(game))
    } catch (error) {
      console.error('Error getting popular games:', error)
      return []
    }
  }

  async getGamesByGenre(genre: string, limit: number = 20): Promise<IGDBGame[]> {
    try {
      const { data, error } = await supabase
        .from('game')
        .select('*')
        .or(`genre.ilike.%${genre}%,genres.cs.{${genre}}`)
        .limit(limit)

      if (error) {
        console.error('Error getting games by genre:', error)
        return []
      }

      return (data || []).map(game => this.mapDatabaseGameToIGDBGame(game))
    } catch (error) {
      console.error('Error getting games by genre:', error)
      return []
    }
  }

  getGameCover(game: IGDBGame | null): string {
    if (!game) return ''
    
    if (game.cover?.url) {
      return game.cover.url
    }
    
    if (game.cover?.image_id) {
      return this.getCoverImageUrl(game.cover.image_id)
    }
    
    return ''
  }

  getCoverImageUrl(imageId: string, size: 'cover_small' | 'cover_big' | 'cover_large' = 'cover_big'): string {
    if (!imageId) return ''
    
    if (imageId.startsWith('http')) {
      return imageId
    }
    
    return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`
  }
}

export const igdbService = new IGDBService()