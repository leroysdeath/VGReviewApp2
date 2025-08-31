// IGDB Sync Service - Syncs new games from IGDB to Supabase
import { supabase } from './supabase';
import { igdbService } from './igdbService';
import type { IGDBGame } from './igdbService';

interface SyncOptions {
  daysBack?: number; // How many days back to check for updates
  limit?: number; // Maximum games to sync per run
  dryRun?: boolean; // If true, only log what would be synced without actually doing it
}

interface SyncResult {
  success: boolean;
  totalChecked: number;
  newGamesFound: number;
  gamesAdded: number;
  errors: string[];
  newGames: Array<{
    igdb_id: number;
    name: string;
    added: boolean;
    error?: string;
  }>;
}

class IGDBSyncService {
  private readonly SYNC_LOG_TABLE = 'igdb_sync_log';
  
  /**
   * Main sync function - checks IGDB for new/updated games and adds them to Supabase
   */
  async syncNewGames(options: SyncOptions = {}): Promise<SyncResult> {
    const {
      daysBack = 7, // Check last 7 days by default
      limit = 100,
      dryRun = false
    } = options;

    console.log(`🔄 Starting IGDB sync (${dryRun ? 'DRY RUN' : 'LIVE'})`);
    console.log(`📅 Checking games updated in last ${daysBack} days`);
    console.log(`🎯 Max games to process: ${limit}`);

    const result: SyncResult = {
      success: false,
      totalChecked: 0,
      newGamesFound: 0,
      gamesAdded: 0,
      errors: [],
      newGames: []
    };

    try {
      // Step 1: Get recently updated games from IGDB
      const recentGames = await this.getRecentlyUpdatedGames(daysBack, limit);
      result.totalChecked = recentGames.length;
      console.log(`📦 Found ${recentGames.length} recently updated games in IGDB`);

      if (recentGames.length === 0) {
        console.log('✅ No recent games found to sync');
        result.success = true;
        return result;
      }

      // Step 2: Check which games are already in our database
      const existingGames = await this.checkExistingGames(recentGames.map(g => g.id));
      const existingIds = new Set(existingGames.map(g => g.igdb_id));
      
      // Step 3: Filter to only new games
      const newGames = recentGames.filter(game => !existingIds.has(game.id));
      result.newGamesFound = newGames.length;
      console.log(`🆕 Found ${newGames.length} new games not in our database`);

      if (newGames.length === 0) {
        console.log('✅ All recent games are already in database');
        result.success = true;
        return result;
      }

      // Step 4: Add new games to database (unless dry run)
      for (const game of newGames) {
        try {
          const gameResult = {
            igdb_id: game.id,
            name: game.name,
            added: false
          };

          if (dryRun) {
            console.log(`🧪 [DRY RUN] Would add: ${game.name} (ID: ${game.id})`);
            gameResult.added = true;
          } else {
            const added = await this.addGameToDatabase(game);
            gameResult.added = added;
            
            if (added) {
              result.gamesAdded++;
              console.log(`✅ Added: ${game.name} (ID: ${game.id})`);
            } else {
              console.log(`❌ Failed to add: ${game.name} (ID: ${game.id})`);
            }
          }

          result.newGames.push(gameResult);
        } catch (error) {
          const errorMsg = `Error processing ${game.name}: ${error}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
          
          result.newGames.push({
            igdb_id: game.id,
            name: game.name,
            added: false,
            error: errorMsg
          });
        }
      }

      // Step 5: Log the sync operation
      if (!dryRun) {
        await this.logSyncOperation(result);
      }

      result.success = true;
      console.log(`🎉 Sync completed! Added ${result.gamesAdded}/${result.newGamesFound} new games`);

    } catch (error) {
      const errorMsg = `Sync failed: ${error}`;
      result.errors.push(errorMsg);
      console.error(`💥 ${errorMsg}`);
    }

    return result;
  }

  /**
   * Get games that have been updated in IGDB recently
   */
  private async getRecentlyUpdatedGames(daysBack: number, limit: number): Promise<IGDBGame[]> {
    try {
      // Calculate timestamp for X days ago
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - daysBack);
      const timestamp = Math.floor(daysAgo.getTime() / 1000);

      console.log(`🔍 Fetching games updated since: ${daysAgo.toISOString()}`);

      // Use IGDB API to get recently updated games
      // Note: IGDB uses 'updated_at' field for tracking updates
      const response = await fetch('/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isBulkRequest: true,
          endpoint: 'games',
          requestBody: `fields name, summary, first_release_date, rating, cover.url, genres.name, platforms.name, involved_companies.company.name, updated_at; where updated_at > ${timestamp} & category = 0; sort updated_at desc; limit ${limit};`
        })
      });

      if (!response.ok) {
        throw new Error(`IGDB API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'IGDB API request failed');
      }

      return data.games || [];
    } catch (error) {
      console.error('Error fetching recent games from IGDB:', error);
      throw error;
    }
  }

  /**
   * Check which games already exist in our Supabase database
   */
  private async checkExistingGames(igdbIds: number[]): Promise<Array<{ igdb_id: number }>> {
    try {
      if (igdbIds.length === 0) return [];

      console.log(`🔍 Checking ${igdbIds.length} games against local database`);

      const { data, error } = await supabase
        .from('game') // Use 'game' table (singular)
        .select('igdb_id')
        .in('igdb_id', igdbIds);

      if (error) {
        console.error('Error checking existing games:', error);
        throw error;
      }

      console.log(`📊 Found ${data?.length || 0} existing games in database`);
      return data || [];
    } catch (error) {
      console.error('Error checking existing games:', error);
      throw error;
    }
  }

  /**
   * Add a new game to the Supabase database
   */
  private async addGameToDatabase(igdbGame: IGDBGame): Promise<boolean> {
    try {
      // Transform IGDB game to our database format
      const gameData = {
        igdb_id: igdbGame.id,
        name: igdbGame.name,
        summary: igdbGame.summary,
        description: igdbGame.summary,
        release_date: igdbGame.first_release_date 
          ? new Date(igdbGame.first_release_date * 1000).toISOString() 
          : null,
        igdb_rating: igdbGame.rating || null,
        cover_url: igdbGame.cover?.url 
          ? igdbGame.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://') 
          : null,
        genre: igdbGame.genres?.[0]?.name || null,
        genres: igdbGame.genres?.map(g => g.name) || [],
        developer: igdbGame.involved_companies?.[0]?.company?.name || null,
        publisher: igdbGame.involved_companies?.[0]?.company?.name || null,
        platforms: igdbGame.platforms?.map(p => p.name) || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('game')
        .insert([gameData]);

      if (error) {
        console.error(`Error inserting game ${igdbGame.name}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error adding game to database:`, error);
      return false;
    }
  }

  /**
   * Log sync operation to database for tracking
   */
  private async logSyncOperation(result: SyncResult): Promise<void> {
    try {
      const logData = {
        sync_date: new Date().toISOString(),
        total_checked: result.totalChecked,
        new_games_found: result.newGamesFound,
        games_added: result.gamesAdded,
        errors_count: result.errors.length,
        errors: result.errors,
        success: result.success
      };

      // Try to insert into sync log table (might not exist)
      const { error } = await supabase
        .from(this.SYNC_LOG_TABLE)
        .insert([logData]);

      if (error) {
        console.warn('Could not log sync operation (table might not exist):', error);
      } else {
        console.log('✅ Sync operation logged to database');
      }
    } catch (error) {
      console.warn('Could not log sync operation:', error);
    }
  }

  /**
   * Get recent sync history
   */
  async getSyncHistory(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from(this.SYNC_LOG_TABLE)
        .select('*')
        .order('sync_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Could not fetch sync history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.warn('Could not fetch sync history:', error);
      return [];
    }
  }

  /**
   * Create the sync log table if it doesn't exist
   */
  async createSyncLogTable(): Promise<void> {
    console.log('📝 Creating sync log table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS igdb_sync_log (
        id SERIAL PRIMARY KEY,
        sync_date TIMESTAMP WITH TIME ZONE NOT NULL,
        total_checked INTEGER NOT NULL DEFAULT 0,
        new_games_found INTEGER NOT NULL DEFAULT 0,
        games_added INTEGER NOT NULL DEFAULT 0,
        errors_count INTEGER NOT NULL DEFAULT 0,
        errors JSONB,
        success BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (error) {
        console.error('Error creating sync log table:', error);
        throw error;
      }

      console.log('✅ Sync log table created/verified');
    } catch (error) {
      console.error('Could not create sync log table:', error);
      throw error;
    }
  }
}

export const igdbSyncService = new IGDBSyncService();
export type { SyncOptions, SyncResult };