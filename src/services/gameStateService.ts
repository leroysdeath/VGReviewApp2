import { supabase } from './supabase';
import { getCurrentUserId, ensureGameExists } from './reviewService';
import { collectionWishlistService } from './collectionWishlistService';
import type { Game } from '../types/database';
import type { GameState, GameStateStatus, GameStateError, STATE_TRANSITIONS } from '../types/gameState';

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string | GameStateError;
}

class GameStateService {
  /**
   * Get the current state of a game for the authenticated user
   */
  async getGameState(igdbId: number): Promise<ServiceResponse<GameStateStatus>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'User not authenticated'
          }
        };
      }

      // Check all states in parallel
      const [collectionCheck, wishlistCheck, progressCheck] = await Promise.all([
        supabase
          .from('user_collection')
          .select('id')
          .eq('user_id', userId)
          .eq('igdb_id', igdbId)
          .single(),
        supabase
          .from('user_wishlist')
          .select('id')
          .eq('user_id', userId)
          .eq('igdb_id', igdbId)
          .single(),
        supabase
          .from('game_progress')
          .select('started, completed')
          .eq('user_id', userId)
          .eq('igdb_id', igdbId)
          .single()
      ]);

      const inCollection = !collectionCheck.error && !!collectionCheck.data;
      const inWishlist = !wishlistCheck.error && !!wishlistCheck.data;
      const isStarted = progressCheck.data?.started || false;
      const isCompleted = progressCheck.data?.completed || false;

      // Determine current state (priority: completed > started > collection > wishlist > none)
      let currentState: GameState = 'none';
      if (isCompleted) {
        currentState = 'completed';
      } else if (isStarted) {
        currentState = 'started';
      } else if (inCollection) {
        currentState = 'collection';
      } else if (inWishlist) {
        currentState = 'wishlist';
      }

      const status: GameStateStatus = {
        inWishlist,
        inCollection,
        isStarted,
        isCompleted,
        currentState,
        canTransitionTo: STATE_TRANSITIONS[currentState] || []
      };

      return { success: true, data: status };
    } catch (error) {
      console.error('Error getting game state:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get game state'
      };
    }
  }

  /**
   * Transition a game to a new state
   */
  async transitionGameState(
    igdbId: number,
    toState: GameState,
    gameData?: Partial<Game>
  ): Promise<ServiceResponse<GameStateStatus>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          error: {
            code: 'NOT_AUTHENTICATED',
            message: 'User not authenticated'
          }
        };
      }

      // Get current state
      const currentStateResult = await this.getGameState(igdbId);
      if (!currentStateResult.success || !currentStateResult.data) {
        return { success: false, error: 'Failed to get current state' };
      }

      const currentState = currentStateResult.data.currentState;

      // Check if transition is valid
      if (!STATE_TRANSITIONS[currentState].includes(toState)) {
        return {
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot transition from ${currentState} to ${toState}`,
            currentState,
            attemptedState: toState
          }
        };
      }

      // Ensure game exists in database if gameData provided
      if (gameData) {
        await ensureGameExists({
          igdb_id: igdbId,
          name: gameData.name || '',
          cover_url: gameData.cover_url,
          genre: gameData.genre,
          release_date: gameData.release_date
        });
      }

      // Perform the transition
      switch (toState) {
        case 'wishlist':
          await collectionWishlistService.addToWishlist(igdbId, gameData);
          break;

        case 'collection':
          await collectionWishlistService.addToCollection(igdbId, gameData);
          break;

        case 'started':
          await this.markAsStarted(igdbId, gameData);
          break;

        case 'completed':
          await this.markAsCompleted(igdbId, gameData);
          break;

        case 'none':
          await this.removeFromAllStates(igdbId);
          break;

        default:
          return {
            success: false,
            error: `Invalid state: ${toState}`
          };
      }

      // Get updated state
      const updatedStateResult = await this.getGameState(igdbId);
      if (updatedStateResult.success && updatedStateResult.data) {
        return { success: true, data: updatedStateResult.data };
      }

      return { success: true };
    } catch (error) {
      console.error('Error transitioning game state:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transition game state'
      };
    }
  }

  /**
   * Mark a game as started
   */
  private async markAsStarted(igdbId: number, gameData?: Partial<Game>): Promise<ServiceResponse<void>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      // Ensure game exists and get its ID
      let gameId: number | undefined;
      if (gameData) {
        const ensureResult = await ensureGameExists({
          igdb_id: igdbId,
          name: gameData.name || '',
          cover_url: gameData.cover_url,
          genre: gameData.genre,
          release_date: gameData.release_date
        });
        
        if (ensureResult.success && ensureResult.data) {
          gameId = ensureResult.data.id;
        }
      }

      // If no gameId yet, try to find it
      if (!gameId) {
        const { data: existingGame } = await supabase
          .from('game')
          .select('id, slug')
          .eq('igdb_id', igdbId)
          .single();
        
        if (existingGame) {
          gameId = existingGame.id;
        }
      }

      // Upsert into game_progress
      const { error } = await supabase
        .from('game_progress')
        .upsert({
          user_id: userId,
          game_id: gameId,
          igdb_id: igdbId,
          started: true,
          started_date: new Date().toISOString(),
          slug: gameData?.slug
        }, {
          onConflict: 'user_id,igdb_id'
        });

      if (error) {
        console.error('Error marking game as started:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to mark game as started:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark as started'
      };
    }
  }

  /**
   * Mark a game as completed
   */
  private async markAsCompleted(igdbId: number, gameData?: Partial<Game>): Promise<ServiceResponse<void>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      // Ensure game exists and get its ID
      let gameId: number | undefined;
      if (gameData) {
        const ensureResult = await ensureGameExists({
          igdb_id: igdbId,
          name: gameData.name || '',
          cover_url: gameData.cover_url,
          genre: gameData.genre,
          release_date: gameData.release_date
        });
        
        if (ensureResult.success && ensureResult.data) {
          gameId = ensureResult.data.id;
        }
      }

      // If no gameId yet, try to find it
      if (!gameId) {
        const { data: existingGame } = await supabase
          .from('game')
          .select('id, slug')
          .eq('igdb_id', igdbId)
          .single();
        
        if (existingGame) {
          gameId = existingGame.id;
        }
      }

      // Upsert into game_progress
      const { error } = await supabase
        .from('game_progress')
        .upsert({
          user_id: userId,
          game_id: gameId,
          igdb_id: igdbId,
          started: true,
          completed: true,
          started_date: new Date().toISOString(),
          completed_date: new Date().toISOString(),
          slug: gameData?.slug
        }, {
          onConflict: 'user_id,igdb_id'
        });

      if (error) {
        console.error('Error marking game as completed:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to mark game as completed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark as completed'
      };
    }
  }

  /**
   * Remove a game from all states
   */
  private async removeFromAllStates(igdbId: number): Promise<ServiceResponse<void>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      // Remove from all tables in parallel
      const [collectionResult, wishlistResult, progressResult] = await Promise.all([
        supabase
          .from('user_collection')
          .delete()
          .eq('user_id', userId)
          .eq('igdb_id', igdbId),
        supabase
          .from('user_wishlist')
          .delete()
          .eq('user_id', userId)
          .eq('igdb_id', igdbId),
        supabase
          .from('game_progress')
          .delete()
          .eq('user_id', userId)
          .eq('igdb_id', igdbId)
      ]);

      // Check for any errors
      if (collectionResult.error || wishlistResult.error || progressResult.error) {
        const errors = [
          collectionResult.error?.message,
          wishlistResult.error?.message,
          progressResult.error?.message
        ].filter(Boolean).join(', ');
        
        return { success: false, error: errors };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to remove game from all states:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove from all states'
      };
    }
  }

  /**
   * Get games in a specific state for a user
   */
  async getGamesByState(userId: number, state: GameState): Promise<ServiceResponse<any[]>> {
    try {
      let data: any[] = [];

      switch (state) {
        case 'wishlist':
          const wishlistResult = await collectionWishlistService.getWishlist(userId);
          data = wishlistResult.data || [];
          break;

        case 'collection':
          const collectionResult = await collectionWishlistService.getCollection(userId);
          data = collectionResult.data || [];
          break;

        case 'started':
          const { data: startedData } = await supabase
            .from('game_progress')
            .select(`
              *,
              game:game_id (
                id,
                igdb_id,
                name,
                cover_url,
                slug
              )
            `)
            .eq('user_id', userId)
            .eq('started', true)
            .eq('completed', false)
            .order('started_date', { ascending: false });
          data = startedData || [];
          break;

        case 'completed':
          const { data: completedData } = await supabase
            .from('game_progress')
            .select(`
              *,
              game:game_id (
                id,
                igdb_id,
                name,
                cover_url,
                slug
              )
            `)
            .eq('user_id', userId)
            .eq('completed', true)
            .order('completed_date', { ascending: false });
          data = completedData || [];
          break;

        default:
          return { success: false, error: `Invalid state: ${state}` };
      }

      return { success: true, data };
    } catch (error) {
      console.error(`Error getting games by state ${state}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get games',
        data: []
      };
    }
  }
}

// Export singleton instance
export const gameStateService = new GameStateService();