import { supabase } from './supabase';
import { getCurrentUserId, ensureGameExists } from './reviewService';
import type { Game } from '../types/database';

export interface CollectionItem {
  id: number;
  user_id: number;
  game_id?: number;
  igdb_id: number;
  added_at: string;
  game?: Partial<Game>;
}

export interface WishlistItem extends CollectionItem {
  priority?: number;
  notes?: string;
}

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface CollectionWishlistStatus {
  inCollection: boolean;
  inWishlist: boolean;
}

class CollectionWishlistService {
  /**
   * Private helper to add game to collection or wishlist
   */
  private async ensureGameAndAdd(
    table: 'user_collection' | 'user_wishlist',
    igdbId: number,
    gameData?: Partial<Game>,
    additionalData?: { priority?: number; notes?: string }
  ): Promise<ServiceResponse<any>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      // Ensure game exists in database if gameData is provided
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

      // Check if game exists in database by IGDB ID
      if (!gameId) {
        const { data: existingGame } = await supabase
          .from('game')
          .select('id')
          .eq('igdb_id', igdbId)
          .single();
        
        if (existingGame) {
          gameId = existingGame.id;
        }
      }

      // Prepare data for insertion
      const insertData: any = {
        user_id: userId,
        igdb_id: igdbId,
        ...(gameId && { game_id: gameId }),
        ...additionalData
      };

      // Upsert the record
      const { data, error } = await supabase
        .from(table)
        .upsert(insertData, {
          onConflict: 'user_id,igdb_id'
        })
        .select()
        .single();

      if (error) {
        console.error(`Error adding to ${table}:`, error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Added to ${table}:`, data);
      return { success: true, data };
    } catch (error) {
      console.error(`Failed to add to ${table}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add game'
      };
    }
  }

  /**
   * Private helper to remove game from collection or wishlist
   */
  private async removeFromTable(
    table: 'user_collection' | 'user_wishlist',
    igdbId: number
  ): Promise<ServiceResponse<void>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId)
        .eq('igdb_id', igdbId);

      if (error) {
        console.error(`Error removing from ${table}:`, error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Removed from ${table}, igdb_id:`, igdbId);
      return { success: true };
    } catch (error) {
      console.error(`Failed to remove from ${table}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove game'
      };
    }
  }

  /**
   * Add game to user's collection
   */
  async addToCollection(igdbId: number, gameData?: Partial<Game>): Promise<ServiceResponse<CollectionItem>> {
    return this.ensureGameAndAdd('user_collection', igdbId, gameData);
  }

  /**
   * Remove game from user's collection
   */
  async removeFromCollection(igdbId: number): Promise<ServiceResponse<void>> {
    return this.removeFromTable('user_collection', igdbId);
  }

  /**
   * Add game to user's wishlist
   */
  async addToWishlist(
    igdbId: number, 
    gameData?: Partial<Game>,
    priority?: number,
    notes?: string
  ): Promise<ServiceResponse<WishlistItem>> {
    return this.ensureGameAndAdd('user_wishlist', igdbId, gameData, { priority, notes });
  }

  /**
   * Remove game from user's wishlist
   */
  async removeFromWishlist(igdbId: number): Promise<ServiceResponse<void>> {
    return this.removeFromTable('user_wishlist', igdbId);
  }

  /**
   * Check if game is in user's collection
   */
  async isInCollection(igdbId: number): Promise<boolean> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return false;

      const { count } = await supabase
        .from('user_collection')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('igdb_id', igdbId);

      return (count || 0) > 0;
    } catch (error) {
      console.error('Error checking collection status:', error);
      return false;
    }
  }

  /**
   * Check if game is in user's wishlist
   */
  async isInWishlist(igdbId: number): Promise<boolean> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return false;

      const { count } = await supabase
        .from('user_wishlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('igdb_id', igdbId);

      return (count || 0) > 0;
    } catch (error) {
      console.error('Error checking wishlist status:', error);
      return false;
    }
  }

  /**
   * Check both collection and wishlist status in one call
   */
  async checkBothStatuses(igdbId: number): Promise<CollectionWishlistStatus> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return { inCollection: false, inWishlist: false };
      }

      // Parallel queries for performance
      const [collectionResult, wishlistResult] = await Promise.all([
        supabase
          .from('user_collection')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('igdb_id', igdbId),
        supabase
          .from('user_wishlist')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('igdb_id', igdbId)
      ]);

      return {
        inCollection: (collectionResult.count || 0) > 0,
        inWishlist: (wishlistResult.count || 0) > 0
      };
    } catch (error) {
      console.error('Error checking collection/wishlist status:', error);
      return { inCollection: false, inWishlist: false };
    }
  }

  /**
   * Get user's collection with game details
   */
  async getCollection(userId: number): Promise<ServiceResponse<CollectionItem[]>> {
    try {
      const { data, error } = await supabase
        .from('user_collection')
        .select(`
          *,
          game:game_id (
            id,
            igdb_id,
            name,
            cover_url,
            genre,
            release_date,
            slug
          )
        `)
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Error fetching collection:', error);
        return { success: false, error: error.message, data: [] };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Failed to get collection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get collection',
        data: []
      };
    }
  }

  /**
   * Get user's wishlist with game details
   */
  async getWishlist(userId: number): Promise<ServiceResponse<WishlistItem[]>> {
    try {
      const { data, error } = await supabase
        .from('user_wishlist')
        .select(`
          *,
          game:game_id (
            id,
            igdb_id,
            name,
            cover_url,
            genre,
            release_date,
            slug
          )
        `)
        .eq('user_id', userId)
        .order('priority', { ascending: false })
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Error fetching wishlist:', error);
        return { success: false, error: error.message, data: [] };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Failed to get wishlist:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get wishlist',
        data: []
      };
    }
  }

  /**
   * Get both collection and wishlist IDs in parallel (optimized)
   */
  async getCollectionAndWishlistIds(userId: number): Promise<{
    collectionIds: Set<number>;
    wishlistIds: Set<number>;
  }> {
    try {
      const [collectionResult, wishlistResult] = await Promise.all([
        supabase
          .from('user_collection')
          .select('igdb_id')
          .eq('user_id', userId),
        supabase
          .from('user_wishlist')
          .select('igdb_id')
          .eq('user_id', userId)
      ]);

      return {
        collectionIds: new Set(collectionResult.data?.map(item => item.igdb_id) || []),
        wishlistIds: new Set(wishlistResult.data?.map(item => item.igdb_id) || [])
      };
    } catch (error) {
      console.error('Error fetching collection/wishlist IDs:', error);
      return {
        collectionIds: new Set(),
        wishlistIds: new Set()
      };
    }
  }

  /**
   * Toggle game in collection
   */
  async toggleCollection(igdbId: number, gameData?: Partial<Game>): Promise<ServiceResponse<boolean>> {
    const isInCollection = await this.isInCollection(igdbId);
    
    if (isInCollection) {
      const result = await this.removeFromCollection(igdbId);
      return { ...result, data: false };
    } else {
      const result = await this.addToCollection(igdbId, gameData);
      return { ...result, data: true };
    }
  }

  /**
   * Toggle game in wishlist
   */
  async toggleWishlist(igdbId: number, gameData?: Partial<Game>): Promise<ServiceResponse<boolean>> {
    const isInWishlist = await this.isInWishlist(igdbId);
    
    if (isInWishlist) {
      const result = await this.removeFromWishlist(igdbId);
      return { ...result, data: false };
    } else {
      const result = await this.addToWishlist(igdbId, gameData);
      return { ...result, data: true };
    }
  }

  /**
   * Move game from wishlist to collection
   */
  async moveFromWishlistToCollection(igdbId: number, gameData?: Partial<Game>): Promise<ServiceResponse<void>> {
    try {
      const [removeResult, addResult] = await Promise.all([
        this.removeFromWishlist(igdbId),
        this.addToCollection(igdbId, gameData)
      ]);

      if (!removeResult.success || !addResult.success) {
        return {
          success: false,
          error: removeResult.error || addResult.error || 'Failed to move game'
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to move game'
      };
    }
  }
}

// Export singleton instance
export const collectionWishlistService = new CollectionWishlistService();