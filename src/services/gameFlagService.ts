import { supabase } from './supabase';

export interface FlaggedGame {
  id: number;
  name: string;
  developer?: string;
  publisher?: string;
  category?: number;
  greenlight_flag: boolean;
  redlight_flag: boolean;
  flag_reason?: string;
  flagged_by?: string;
  flagged_at?: string;
  flagged_by_email?: string;
  flag_status: 'greenlight' | 'redlight' | 'none';
  conflict_status: 'potential_conflict' | 'normal';
}

export interface FlagSummary {
  total_flagged: number;
  greenlight_count: number;
  redlight_count: number;
  recent_flags_24h: number;
  most_recent_flag?: string;
}

export type FlagType = 'greenlight' | 'redlight' | 'clear';

class GameFlagService {
  /**
   * Set a manual flag on a game
   */
  async setGameFlag(
    gameId: number,
    flagType: FlagType,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error } = await supabase.rpc('set_game_flag', {
        p_game_id: gameId,
        p_flag_type: flagType,
        p_reason: reason,
        p_user_id: userId
      });

      if (error) {
        console.error('Error setting game flag:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error setting game flag:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all flagged games for admin review
   */
  async getFlaggedGames(): Promise<{ success: boolean; data?: FlaggedGame[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('game_flags_admin')
        .select('*')
        .order('flagged_at', { ascending: false });

      if (error) {
        console.error('Error fetching flagged games:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Error fetching flagged games:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get flagging summary statistics
   */
  async getFlagSummary(): Promise<{ success: boolean; data?: FlagSummary; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('get_flagged_games_summary');

      if (error) {
        console.error('Error fetching flag summary:', error);
        return { success: false, error: error.message };
      }

      // RPC returns array with single row
      const summary = data?.[0];
      if (!summary) {
        return { success: false, error: 'No summary data returned' };
      }

      return { 
        success: true, 
        data: {
          total_flagged: summary.total_flagged,
          greenlight_count: summary.greenlight_count,
          redlight_count: summary.redlight_count,
          recent_flags_24h: summary.recent_flags_24h,
          most_recent_flag: summary.most_recent_flag
        }
      };
    } catch (error: any) {
      console.error('Error fetching flag summary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search for games to flag (for the admin interface)
   */
  async searchGamesForFlagging(
    query: string,
    limit: number = 20
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      // Use a simplified, efficient search that focuses only on name
      // to avoid timeout issues with large table scans
      const { data, error } = await supabase
        .from('game')
        .select(`
          id,
          name,
          developer,
          publisher,
          category,
          greenlight_flag,
          redlight_flag,
          flag_reason,
          flagged_at,
          total_rating,
          rating_count,
          follows,
          popularity_score
        `)
        .ilike('name', `%${query}%`)
        .order('total_rating', { ascending: false, nullsLast: true })
        .limit(limit);

      if (error) {
        console.error('Error searching games for flagging:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Error searching games for flagging:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get games with potential flag conflicts
   */
  async getConflictingFlags(): Promise<{ success: boolean; data?: FlaggedGame[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('game_flags_admin')
        .select('*')
        .eq('conflict_status', 'potential_conflict')
        .order('flagged_at', { ascending: false });

      if (error) {
        console.error('Error fetching conflicting flags:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Error fetching conflicting flags:', error);
      return { success: false, error: error.message };
    }
  }
}

export const gameFlagService = new GameFlagService();