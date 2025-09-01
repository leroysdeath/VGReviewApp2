import { supabase } from './supabase';
import { IGDBGame } from '../types/igdb';
import { generateSlug } from '../utils/gameUrls';

interface DatabaseGame {
  id?: number;
  game_id: string;
  igdb_id: number;
  name: string;
  slug: string;
  release_date?: string | null;
  description?: string | null;
  summary?: string | null;
  cover_url?: string | null;
  screenshots?: string[] | null;
  developer?: string | null;
  publisher?: string | null;
  genres?: string[] | null;
  platforms?: string[] | null;
  category?: number | null;
  parent_game?: number | null;
  igdb_link?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface SyncMetrics {
  totalSaved: number;
  totalUpdated: number;
  failedSaves: number;
  avgSaveTime: number;
  cacheHitRate: number;
  lastSyncTime: Date | null;
}

class GameSyncService {
  private metrics: SyncMetrics = {
    totalSaved: 0,
    totalUpdated: 0,
    failedSaves: 0,
    avgSaveTime: 0,
    cacheHitRate: 0,
    lastSyncTime: null
  };

  private savedGameIds = new Set<number>();
  private BATCH_SIZE = 50;

  /**
   * Main entry point for saving games from IGDB to database
   */
  async saveGamesFromIGDB(igdbGames: IGDBGame[]): Promise<void> {
    if (!igdbGames || igdbGames.length === 0) {
      console.log('📊 No games to save');
      return;
    }

    const startTime = Date.now();
    console.log(`📊 Saving ${igdbGames.length} games to database...`);

    try {
      // Transform all games to database format
      const transformedGames = igdbGames
        .filter(game => this.validateGame(game))
        .map(game => this.transformIGDBToDatabase(game));

      // Upsert games in batches
      await this.upsertGames(transformedGames);

      // Update metrics
      const saveTime = Date.now() - startTime;
      this.updateMetrics(transformedGames.length, saveTime);

      console.log(`✅ Successfully saved ${transformedGames.length} games in ${saveTime}ms`);
    } catch (error) {
      console.error('❌ Error saving games to database:', error);
      this.metrics.failedSaves++;
      throw error;
    }
  }

  /**
   * Transform IGDB game data to database format
   */
  private transformIGDBToDatabase(igdbGame: IGDBGame): DatabaseGame {
    // Extract developer and publisher from involved_companies
    const developer = igdbGame.involved_companies
      ?.find(c => c.developer)?.company?.name || null;
    const publisher = igdbGame.involved_companies
      ?.find(c => c.publisher)?.company?.name || null;

    return {
      // Required fields (never null)
      igdb_id: igdbGame.id,
      game_id: igdbGame.id.toString(),
      name: igdbGame.name || `Game #${igdbGame.id}`,
      slug: igdbGame.slug || generateSlug(igdbGame.name || `game-${igdbGame.id}`),

      // Date conversion (Unix timestamp to YYYY-MM-DD)
      release_date: igdbGame.first_release_date
        ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
        : null,

      // Content fields
      summary: igdbGame.summary || null,
      description: igdbGame.storyline || null, // Map storyline to description

      // Media with URL transformation
      cover_url: this.transformImageUrl(igdbGame.cover?.url),
      screenshots: igdbGame.screenshots
        ?.map(s => this.transformImageUrl(s.url))
        .filter((url): url is string => url !== null) || null,

      // Companies
      developer,
      publisher,

      // Categories
      genres: igdbGame.genres?.map(g => g.name) || null,
      platforms: igdbGame.platforms?.map(p => p.name) || null,
      category: igdbGame.category || null,
      parent_game: igdbGame.parent_game || null,

      // Links
      igdb_link: igdbGame.url || null,

      // Metadata
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Fix IGDB image URLs and upgrade size
   */
  private transformImageUrl(url?: string): string | null {
    if (!url) return null;

    // Fix protocol (IGDB returns //images.igdb.com/...)
    const httpsUrl = url.startsWith('//') ? `https:${url}` : url;

    // Upgrade image size for better quality
    return httpsUrl
      .replace('t_thumb', 't_cover_big')
      .replace('t_micro', 't_cover_big')
      .replace('t_cover_small', 't_cover_big');
  }

  /**
   * Validate game data before saving
   */
  private validateGame(game: any): boolean {
    return !!(
      game &&
      game.id &&
      game.name &&
      game.name.length > 0 &&
      game.name.length < 500
    );
  }

  /**
   * Upsert games with smart update logic
   */
  async upsertGames(games: DatabaseGame[]): Promise<void> {
    if (games.length === 0) return;

    // Ensure required fields are never null
    const validGames = games.map(game => ({
      ...game,
      game_id: game.game_id || game.igdb_id.toString(),
      name: game.name || 'Unknown Game',
      slug: game.slug || generateSlug(game.name || `game-${game.igdb_id}`)
    }));

    // Get existing games to determine update strategy
    const igdbIds = validGames.map(g => g.igdb_id);
    const { data: existingGames, error: fetchError } = await supabase
      .from('game')
      .select('igdb_id, summary, description, developer, publisher, genres, platforms, updated_at')
      .in('igdb_id', igdbIds);

    if (fetchError) {
      console.error('Error fetching existing games:', fetchError);
    }

    // Separate new games from updates
    const existingMap = new Map((existingGames || []).map(g => [g.igdb_id, g]));
    const newGames: DatabaseGame[] = [];
    const updatableGames: DatabaseGame[] = [];

    for (const game of validGames) {
      const existing = existingMap.get(game.igdb_id);
      
      if (!existing) {
        newGames.push(game);
      } else {
        // Build smart update based on what's missing
        const updates = await this.buildUpdateData(game, existing);
        if (Object.keys(updates).length > 1) { // More than just updated_at
          updatableGames.push({ ...updates, igdb_id: game.igdb_id } as DatabaseGame);
        }
      }
    }

    // Batch insert new games
    if (newGames.length > 0) {
      await this.batchInsert(newGames);
      this.metrics.totalSaved += newGames.length;
    }

    // Batch update existing games
    if (updatableGames.length > 0) {
      await this.batchUpdate(updatableGames);
      this.metrics.totalUpdated += updatableGames.length;
    }

    // Track saved games
    igdbIds.forEach(id => this.savedGameIds.add(id));
  }

  /**
   * Build update data for existing games (only update missing fields)
   */
  private async buildUpdateData(
    newData: DatabaseGame,
    existing: any
  ): Promise<Partial<DatabaseGame>> {
    const updates: Partial<DatabaseGame> = {};

    // Priority 1: Fill NULL fields
    if (!existing.summary && newData.summary) {
      updates.summary = newData.summary;
    }

    if (!existing.description && newData.description) {
      updates.description = newData.description;
    }

    if (!existing.developer && newData.developer) {
      updates.developer = newData.developer;
    }

    if (!existing.publisher && newData.publisher) {
      updates.publisher = newData.publisher;
    }

    // Priority 2: Update empty arrays
    if ((!existing.genres || existing.genres.length === 0) && newData.genres?.length) {
      updates.genres = newData.genres;
    }

    if ((!existing.platforms || existing.platforms.length === 0) && newData.platforms?.length) {
      updates.platforms = newData.platforms;
    }

    // Priority 3: Check if data is stale (>30 days)
    const isStale = existing.updated_at &&
      new Date(existing.updated_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (isStale) {
      // Full update for stale records
      return {
        ...newData,
        updated_at: new Date().toISOString()
      };
    }

    // Always update timestamp if any changes
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
    }

    return updates;
  }

  /**
   * Batch insert new games
   */
  private async batchInsert(games: DatabaseGame[]): Promise<void> {
    // Process in chunks to avoid payload limits
    const chunks = this.chunkArray(games, this.BATCH_SIZE);

    for (const chunk of chunks) {
      try {
        const { error } = await supabase
          .from('game')
          .insert(chunk);

        if (error) {
          console.error('Batch insert error:', error);
          // Try individual inserts as fallback
          await this.individualInsert(chunk);
        }
      } catch (error) {
        console.error('Batch insert failed:', error);
        await this.individualInsert(chunk);
      }
    }
  }

  /**
   * Batch update existing games
   */
  private async batchUpdate(games: DatabaseGame[]): Promise<void> {
    // Supabase doesn't support batch updates well, so we use upsert
    const chunks = this.chunkArray(games, this.BATCH_SIZE);

    for (const chunk of chunks) {
      try {
        const { error } = await supabase
          .from('game')
          .upsert(chunk, {
            onConflict: 'igdb_id',
            ignoreDuplicates: false
          });

        if (error) {
          console.error('Batch update error:', error);
        }
      } catch (error) {
        console.error('Batch update failed:', error);
      }
    }
  }

  /**
   * Individual insert fallback for failed batch operations
   */
  private async individualInsert(games: DatabaseGame[]): Promise<void> {
    for (const game of games) {
      try {
        const { error } = await supabase
          .from('game')
          .insert(game);

        if (error && error.code !== '23505') { // Ignore duplicate key errors
          console.error(`Failed to insert game ${game.name}:`, error);
        }
      } catch (error) {
        console.error(`Failed to insert game ${game.name}:`, error);
      }
    }
  }

  /**
   * Chunk array into smaller batches
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Update sync metrics
   */
  private updateMetrics(gamesProcessed: number, saveTime: number): void {
    this.metrics.lastSyncTime = new Date();
    
    // Calculate average save time
    const totalTime = this.metrics.avgSaveTime * (this.metrics.totalSaved + this.metrics.totalUpdated);
    const newTotal = this.metrics.totalSaved + this.metrics.totalUpdated + gamesProcessed;
    this.metrics.avgSaveTime = (totalTime + saveTime) / newTotal;
  }

  /**
   * Get current sync metrics
   */
  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  /**
   * Log metrics to console
   */
  logMetrics(): void {
    console.log('📊 Game Sync Metrics:', {
      ...this.metrics,
      savedGameIds: this.savedGameIds.size,
      avgSaveTimeMs: Math.round(this.metrics.avgSaveTime)
    });
  }

  /**
   * Get count of games in database
   */
  async getDatabaseGameCount(): Promise<number> {
    const { count, error } = await supabase
      .from('game')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error getting game count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Clear saved game IDs cache
   */
  clearCache(): void {
    this.savedGameIds.clear();
  }
}

// Export singleton instance
export const gameSyncService = new GameSyncService();