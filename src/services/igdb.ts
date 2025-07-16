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
  }
  genres?: Array<{
    id: number
    name: string
  }>
  platforms?: Array<{
    id: number
    name: string
  }>
}

class IGDBService {
  private async makeRequest(endpoint: string, query: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('igdb-proxy', {
      body: {
        endpoint,
        body: query
      }
    })

    if (error) {
      throw new Error(`IGDB API Error: ${error.message}`)
    }

    return data
  }

  async searchGames(searchTerm: string, limit: number = 20): Promise<IGDBGame[]> {
    const query = `
      search "${searchTerm}";
      fields id, name, summary, rating, first_release_date, cover.image_id, genres.name, platforms.name;
      limit ${limit};
    `
    
    return this.makeRequest('games', query)
  }

  async getGameById(id: number): Promise<IGDBGame> {
    const query = `
      fields id, name, summary, rating, first_release_date, cover.image_id, genres.name, platforms.name, screenshots.image_id, videos.video_id;
      where id = ${id};
    `
    
    const results = await this.makeRequest('games', query)
    return results[0]
  }

  async getPopularGames(limit: number = 20): Promise<IGDBGame[]> {
    const query = `
      fields id, name, summary, rating, first_release_date, cover.image_id, genres.name, platforms.name;
      where rating > 70 & rating_count > 100;
      sort rating desc;
      limit ${limit};
    `
    
    return this.makeRequest('games', query)
  }

  async getGamesByGenre(genreId: number, limit: number = 20): Promise<IGDBGame[]> {
    const query = `
      fields id, name, summary, rating, first_release_date, cover.image_id, genres.name, platforms.name;
      where genres = ${genreId};
      sort rating desc;
      limit ${limit};
    `
    
    return this.makeRequest('games', query)
  }

  // Helper method to get cover image URL
  getCoverImageUrl(imageId: string, size: 'cover_small' | 'cover_big' | 'cover_large' = 'cover_big'): string {
    return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`
  }
}

export const igdbService = new IGDBService()
