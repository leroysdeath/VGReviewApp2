import { supabase } from './supabase';
import { getCurrentUserId } from './reviewService';

export interface GameProgress {
  id: number;
  user_id: number;
  game_id: number;
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
      .eq('game_id', gameId)
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
      .eq('game_id', gameId)
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
      .eq('game_id', gameId)
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
