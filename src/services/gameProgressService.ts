import { supabase } from './supabase';
import { getCurrentUserId } from './reviewService';

export interface GameProgress {
  id: number;
  user_id: number;
  game_id: number;
  igdb_id: number;
  started: boolean;
  completed: boolean;
  started_date?: string;
  completed_date?: string;
  created_at: string;
  updated_at: string;
}

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get game progress for current user
 */
export const getGameProgress = async (gameId: number): Promise<ServiceResponse<GameProgress | null>> => {
  try {
    console.log('🎮 Getting game progress for gameId:', gameId);
    
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    console.log('👤 Current user ID:', userId);

    // Look up the game in our database to get the internal game ID
    const { data: gameRecord, error: gameError } = await supabase
      .from('game')
      .select('id')
      .eq('igdb_id', gameId)
      .single();

    if (gameError && gameError.code !== 'PGRST116') {
      console.error('❌ Error looking up game:', gameError);
      return { success: false, error: `Game lookup failed: ${gameError.message}` };
    }

    if (!gameRecord) {
      console.log('ℹ️ Game not found in database, no progress exists');
      return { success: true, data: null };
    }

    console.log('🔍 Looking up progress for internal game ID:', gameRecord.id);

    const { data, error } = await supabase
      .from('game_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameRecord.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching game progress:', error);
      return { success: false, error: `Failed to fetch game progress: ${error.message}` };
    }

    console.log('✅ Game progress result:', data);
    return { success: true, data: data || null };
  } catch (error) {
    console.error('💥 Unexpected error getting game progress:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get game progress'
    };
  }
};

/**
 * Mark game as started
 */
export const markGameStarted = async (gameId: number): Promise<ServiceResponse<GameProgress>> => {
  try {
    console.log('🎯 Marking game as started for gameId:', gameId);
    
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Look up the game in our database
    const { data: gameRecord, error: gameError } = await supabase
      .from('game')
      .select('id')
      .eq('igdb_id', gameId)
      .single();

    if (gameError && gameError.code !== 'PGRST116') {
      return { success: false, error: `Game lookup failed: ${gameError.message}` };
    }

    if (!gameRecord) {
      return { success: false, error: 'Game must be added to database first' };
    }

    const now = new Date().toISOString();

    // Check if progress record already exists
    const { data: existingProgress } = await supabase
      .from('game_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameRecord.id)
      .single();

    let result;

    if (existingProgress) {
      // Update existing record
      const { data, error } = await supabase
        .from('game_progress')
        .update({
          started: true,
          started_date: existingProgress.started_date || now,
          updated_at: now
        })
        .eq('user_id', userId)
        .eq('game_id', gameRecord.id)
        .select('*')
        .single();

      result = { data, error };
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('game_progress')
        .insert({
          user_id: userId,
          game_id: gameRecord.id,
          igdb_id: gameId, // Store the IGDB ID for reference
          started: true,
          completed: false,
          started_date: now,
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      result = { data, error };
    }

    if (result.error) {
      console.error('❌ Error marking game as started:', result.error);
      return { success: false, error: `Failed to mark game as started: ${result.error.message}` };
    }

    console.log('✅ Successfully marked game as started:', result.data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('💥 Unexpected error marking game as started:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark game as started'
    };
  }
};

/**
 * Mark game as completed
 */
export const markGameCompleted = async (gameId: number): Promise<ServiceResponse<GameProgress>> => {
  try {
    console.log('🏁 Marking game as completed for gameId:', gameId);
    
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Look up the game in our database
    const { data: gameRecord, error: gameError } = await supabase
      .from('game')
      .select('id')
      .eq('igdb_id', gameId)
      .single();

    if (gameError && gameError.code !== 'PGRST116') {
      return { success: false, error: `Game lookup failed: ${gameError.message}` };
    }

    if (!gameRecord) {
      return { success: false, error: 'Game must be added to database first' };
    }

    const now = new Date().toISOString();

    // Check if progress record already exists
    const { data: existingProgress } = await supabase
      .from('game_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameRecord.id)
      .single();

    let result;

    if (existingProgress) {
      // Update existing record - mark as both started and completed
      const { data, error } = await supabase
        .from('game_progress')
        .update({
          started: true, // Auto-mark as started if completing
          completed: true,
          started_date: existingProgress.started_date || now,
          completed_date: now,
          updated_at: now
        })
        .eq('user_id', userId)
        .eq('game_id', gameRecord.id)
        .select('*')
        .single();

      result = { data, error };
    } else {
      // Create new record - mark as both started and completed
      const { data, error } = await supabase
        .from('game_progress')
        .insert({
          user_id: userId,
          game_id: gameRecord.id,
          igdb_id: gameId, // Store the IGDB ID for reference
          started: true,
          completed: true,
          started_date: now,
          completed_date: now,
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      result = { data, error };
    }

    if (result.error) {
      console.error('❌ Error marking game as completed:', result.error);
      return { success: false, error: `Failed to mark game as completed: ${result.error.message}` };
    }

    console.log('✅ Successfully marked game as completed:', result.data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('💥 Unexpected error marking game as completed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark game as completed'
    };
  }
};

/**
 * Toggle game started state (only if not locked by review)
 */
export const toggleGameStarted = async (gameId: number, hasReview: boolean = false): Promise<ServiceResponse<GameProgress | null>> => {
  try {
    if (hasReview) {
      return { success: false, error: 'Cannot change progress state - game has a review' };
    }

    console.log('🔄 Toggling started state for gameId:', gameId);

    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get current progress
    const progressResult = await getGameProgress(gameId);
    if (!progressResult.success) {
      return progressResult;
    }

    const currentProgress = progressResult.data;

    if (!currentProgress || !currentProgress.started) {
      // Mark as started
      return markGameStarted(gameId);
    } else {
      // Unmark started (remove the record or update to false)
      const { data: gameRecord } = await supabase
        .from('game')
        .select('id')
        .eq('igdb_id', gameId)
        .single();

      if (!gameRecord) {
        return { success: false, error: 'Game not found in database' };
      }

      // Remove the progress record entirely if unmarking
      const { error } = await supabase
        .from('game_progress')
        .delete()
        .eq('user_id', userId)
        .eq('game_id', gameRecord.id);

      if (error) {
        console.error('❌ Error removing game progress:', error);
        return { success: false, error: `Failed to unmark game: ${error.message}` };
      }

      console.log('✅ Successfully unmarked game as started');
      return { success: true, data: null };
    }
  } catch (error) {
    console.error('💥 Unexpected error toggling game started:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle game state'
    };
  }
};

/**
 * Toggle game completed state (only if not locked by review)
 */
export const toggleGameCompleted = async (gameId: number, hasReview: boolean = false): Promise<ServiceResponse<GameProgress | null>> => {
  try {
    if (hasReview) {
      return { success: false, error: 'Cannot change progress state - game has a review' };
    }

    console.log('🔄 Toggling completed state for gameId:', gameId);

    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get current progress
    const progressResult = await getGameProgress(gameId);
    if (!progressResult.success) {
      return progressResult;
    }

    const currentProgress = progressResult.data;

    if (!currentProgress || !currentProgress.completed) {
      // Mark as completed
      return markGameCompleted(gameId);
    } else {
      // Unmark completed - revert to just started
      const { data: gameRecord } = await supabase
        .from('game')
        .select('id')
        .eq('igdb_id', gameId)
        .single();

      if (!gameRecord) {
        return { success: false, error: 'Game not found in database' };
      }

      const now = new Date().toISOString();

      // Update to remove completed status but keep started
      const { data, error } = await supabase
        .from('game_progress')
        .update({
          completed: false,
          completed_date: null,
          updated_at: now
        })
        .eq('user_id', userId)
        .eq('game_id', gameRecord.id)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error updating game progress:', error);
        return { success: false, error: `Failed to unmark game as completed: ${error.message}` };
      }

      console.log('✅ Successfully unmarked game as completed');
      return { success: true, data };
    }
  } catch (error) {
    console.error('💥 Unexpected error toggling game completed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle game state'
    };
  }
};

/**
 * Get user's game statistics
 */
export const getUserGameStats = async (): Promise<ServiceResponse<{
  totalGames: number;
  startedGames: number;
  completedGames: number;
}>> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('game_progress')
      .select('started, completed')
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: `Failed to fetch game stats: ${error.message}` };
    }

    const stats = {
      totalGames: data.length,
      startedGames: data.filter(p => p.started).length,
      completedGames: data.filter(p => p.completed).length
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error getting user game stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get game stats'
    };
  }
};
