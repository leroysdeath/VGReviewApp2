import { supabase } from './supabase';

interface IGDBGame {
  id: number;
  name: string;
  summary?: string;
  cover?: {
    id: number;
    url: string;
  };
  first_release_date?: number;
  genres?: Array<{ id: number; name: string }>;
  platforms?: Array<{ id: number; name: string }>;
  total_rating?: number;
  follows?: number;
  hypes?: number;
  popularity?: number;
  developer?: string;
  publisher?: string;
}

interface ImportQueueItem {
  igdb_id: number;
  priority: number;
  search_query?: string;
  game_data?: any;
}

export class GameImportService {
  /**
   * Queue games for import from IGDB to local database
   */
  async queueGamesForImport(games: IGDBGame[], searchQuery?: string): Promise<void> {
    if (!games || games.length === 0) return;

    try {
      // Prepare the queue items
      const queueItems = games.map(game => ({
        igdb_id: game.id,
        priority: this.calculatePriority(game),
        search_query: searchQuery,
        game_data: this.prepareGameData(game)
      }));

      // Batch insert to queue using the database function
      for (const item of queueItems) {
        await supabase.rpc('queue_game_for_import', {
          p_igdb_id: item.igdb_id,
          p_priority: item.priority,
          p_search_query: item.search_query,
          p_game_data: item.game_data,
          p_user_id: (await supabase.auth.getUser()).data?.user?.id
        });
      }

      console.log(`Queued ${queueItems.length} games for import`);

      // Trigger import process (non-blocking, with error handling)
      this.processImportQueue().catch(error =>
        console.error('Failed to process import queue:', error)
      );
    } catch (error) {
      console.error('Error queuing games for import:', error);
    }
  }

  /**
   * Calculate priority for import based on game metrics
   */
  private calculatePriority(game: IGDBGame): number {
    let priority = 0;

    // Higher rating = higher priority
    if (game.total_rating) {
      priority += Math.floor(game.total_rating);
    }

    // More followers = higher priority
    if (game.follows) {
      priority += Math.min(game.follows / 100, 50); // Cap at 50 points
    }

    // Recent games get bonus
    if (game.first_release_date) {
      const releaseYear = new Date(game.first_release_date * 1000).getFullYear();
      const currentYear = new Date().getFullYear();
      if (currentYear - releaseYear <= 2) {
        priority += 20; // Recent release bonus
      }
    }

    // Popularity score
    if (game.popularity) {
      priority += Math.min(game.popularity, 30);
    }

    return Math.floor(priority);
  }

  /**
   * Prepare game data for storage
   */
  private prepareGameData(game: IGDBGame): any {
    // Transform cover URL to use larger image
    let coverUrl = '';
    if (game.cover?.url) {
      coverUrl = game.cover.url.replace('t_thumb', 't_cover_big');
      if (!coverUrl.startsWith('https:')) {
        coverUrl = 'https:' + coverUrl;
      }
    }

    return {
      id: game.id,
      name: game.name,
      summary: game.summary,
      cover: coverUrl ? { url: coverUrl } : null,
      first_release_date: game.first_release_date,
      genres: game.genres?.map(g => g.name) || [],
      platforms: game.platforms?.map(p => p.name) || [],
      total_rating: game.total_rating,
      follows: game.follows,
      hypes: game.hypes,
      developer: game.developer,
      publisher: game.publisher
    };
  }

  /**
   * Process the import queue (background task)
   */
  async processImportQueue(): Promise<void> {
    try {
      // Get pending imports
      const { data: pendingImports, error } = await supabase.rpc('get_pending_imports', {
        p_limit: 5
      });

      if (error) {
        console.error('Error fetching pending imports:', error);
        return;
      }

      if (!pendingImports || pendingImports.length === 0) {
        console.log('No pending imports');
        return;
      }

      console.log(`Processing ${pendingImports.length} pending imports`);

      // Process each import
      for (const item of pendingImports) {
        await this.importGame(item);
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error processing import queue:', error);
    }
  }

  /**
   * Import a single game from the queue
   */
  private async importGame(queueItem: any): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('import_game_from_queue', {
        p_queue_id: queueItem.queue_id
      });

      if (error) {
        console.error(`Failed to import game ${queueItem.igdb_id}:`, error);
      } else {
        console.log(`Successfully imported game ${queueItem.igdb_id}`);
      }
    } catch (error) {
      console.error(`Error importing game ${queueItem.igdb_id}:`, error);
    }
  }

  /**
   * Bulk import popular games (for initial population)
   */
  async bulkImportPopularGames(): Promise<void> {
    console.log('Starting bulk import of popular games...');

    const queries = [
      // Top rated games
      {
        endpoint: 'games',
        query: 'fields id,name,summary,cover.*,first_release_date,genres.*,platforms.*,total_rating,follows,hypes; where total_rating > 85; sort total_rating desc; limit 100;'
      },
      // Recent popular games
      {
        endpoint: 'games',
        query: `fields id,name,summary,cover.*,first_release_date,genres.*,platforms.*,total_rating,follows,hypes; where first_release_date > ${Math.floor(Date.now() / 1000) - (365 * 24 * 60 * 60 * 2)} & follows > 50; sort follows desc; limit 100;`
      },
      // Specific franchises that must exist
      {
        endpoint: 'games',
        query: 'search "Grand Theft Auto"; fields id,name,summary,cover.*,first_release_date,genres.*,platforms.*,total_rating,follows,hypes; limit 50;'
      },
      {
        endpoint: 'games',
        query: 'search "The Legend of Zelda"; fields id,name,summary,cover.*,first_release_date,genres.*,platforms.*,total_rating,follows,hypes; limit 50;'
      },
      {
        endpoint: 'games',
        query: 'search "Final Fantasy"; fields id,name,summary,cover.*,first_release_date,genres.*,platforms.*,total_rating,follows,hypes; limit 50;'
      },
      {
        endpoint: 'games',
        query: 'search "Super Mario"; fields id,name,summary,cover.*,first_release_date,genres.*,platforms.*,total_rating,follows,hypes; limit 50;'
      }
    ];

    for (const queryConfig of queries) {
      try {
        // Call IGDB through our proxy
        const response = await supabase.functions.invoke('igdb-proxy', {
          body: queryConfig
        });

        if (response.error) {
          console.error('IGDB proxy error:', response.error);
          continue;
        }

        const { data } = response;
        if (data && Array.isArray(data)) {
          await this.queueGamesForImport(data);
          console.log(`Queued ${data.length} games from query`);
        }

        // Delay between queries
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('Error in bulk import query:', error);
      }
    }

    console.log('Bulk import queuing completed');
  }

  /**
   * Check if a game exists locally
   */
  async gameExistsLocally(igdbId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('game')
        .select('id')
        .eq('igdb_id', igdbId)
        .single();

      return !!data && !error;
    } catch {
      return false;
    }
  }

  /**
   * Request a game to be added (user-initiated)
   */
  async requestGame(query: string): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error } = await supabase.rpc('request_game', {
        p_query: query,
        p_user_id: userId
      });

      if (error) {
        console.error('Error requesting game:', error);
        return false;
      }

      console.log('Game request submitted for:', query);
      return true;
    } catch (error) {
      console.error('Error requesting game:', error);
      return false;
    }
  }

  /**
   * Get import queue status
   */
  async getImportQueueStatus(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('game_import_queue_status')
        .select('*');

      if (error) {
        console.error('Error fetching import queue status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching import queue status:', error);
      return null;
    }
  }
}

// Export singleton instance
export const gameImportService = new GameImportService();