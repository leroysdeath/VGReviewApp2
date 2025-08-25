import { createClient } from '@supabase/supabase-js';
import { sanitizeSearchTerm } from '../utils/sqlSecurity';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Use a unique storage key to avoid conflicts
    storageKey: 'vgreviewapp-auth-token'
  },
  global: {
    headers: {
      'X-Client-Info': 'vgreviewapp-web'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Helper functions for common database operations
export const supabaseHelpers = {
  // User operations
  async getUser(id: number) {
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUserByEmail(email: string) {
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Game operations
  async getGame(id: number) {
    const { data, error } = await supabase
      .from('game')
      .select(`
        *,
        platform_games(
          platform(*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async searchGames(query: string, limit = 20) {
    // PROFESSIONAL SECURITY FIX: Use PostgreSQL full-text search with complete SQL injection immunity
    if (!query || typeof query !== 'string') {
      return [];
    }
    
    const trimmedQuery = query.trim();
    
    // Basic validation - the database function handles all security
    if (trimmedQuery.length < 2 || trimmedQuery.length > 100) {
      return [];
    }
    
    try {
      // Use secure database function that's immune to SQL injection
      const { data, error } = await supabase
        .rpc('search_games_secure', {
          search_query: trimmedQuery,
          limit_count: Math.min(limit, 100)
        });
      
      if (error) {
        console.error('Secure search error:', error);
        throw error;
      }
      
      // Transform results to include platform data if needed
      if (data && data.length > 0) {
        const gameIds = data.map(game => game.id);
        const { data: platformData, error: platformError } = await supabase
          .from('platform_games')
          .select(`
            game_id,
            platform(*)
          `)
          .in('game_id', gameIds);
        
        if (platformError) {
          console.warn('Platform data fetch error:', platformError);
        }
        
        // Merge platform data with search results
        return data.map(game => ({
          ...game,
          platform_games: platformData?.filter(p => p.game_id === game.id) || []
        }));
      }
      
      return data || [];
    } catch (error) {
      console.error('Secure game search failed:', error);
      throw error;
    }
  },

  async getPopularGames(limit = 20) {
    const { data, error } = await supabase
      .from('game')
      .select(`
        *,
        platform_games(
          platform(*)
        ),
        ratings:rating!rating_game_id_fkey(rating)
      `)
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  // Rating operations
  async getUserRatings(userId: number, limit = 20) {
    const { data, error } = await supabase
      .from('rating')
      .select(`
        *,
        game(*),
        user(*)
      `)
      .eq('user_id', userId)
      .order('post_date_time', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  async getGameRatings(gameId: number, limit = 20) {
    const { data, error } = await supabase
      .from('rating')
      .select(`
        *,
        user(*)
      `)
      .eq('game_id', gameId)
      .order('post_date_time', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  async createRating(ratingData: {
    user_id: number;
    game_id: number;
    rating: number;
    review?: string;
    finished: boolean;
    completion_status?: string;
  }) {
    const { data, error } = await supabase
      .from('rating')
      .insert({
        ...ratingData,
        completion_status: ratingData.completion_status || 'started', // ✅ Explicitly set completion status
        post_date_time: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateRating(id: number, updates: {
    rating?: number;
    review?: string;
    finished?: boolean;
  }) {
    const { data, error } = await supabase
      .from('rating')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteRating(id: number) {
    const { error } = await supabase
      .from('rating')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Platform operations
  async getPlatforms() {
    const { data, error } = await supabase
      .from('platform')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  // Statistics - optimized with computed columns
  async getUserStats(userId: number) {
    const { data: userData, error } = await supabase
      .from('user')
      .select('total_reviews, completed_games_count, started_games_count')
      .eq('id', userId)
      .single();
    
    if (error) throw error;

    // For average rating, we still need to calculate this from actual ratings
    // since it's more complex than a simple count
    const { data: ratings, error: ratingsError } = await supabase
      .from('rating')
      .select('rating')
      .eq('user_id', userId);
    
    if (ratingsError) throw ratingsError;

    const totalGames = ratings.length;
    const averageRating = totalGames > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalGames 
      : 0;

    return {
      totalGames,
      completedGames: userData.completed_games_count || 0,
      averageRating,
      totalReviews: userData.total_reviews || 0
    };
  },

  async getGameStats(gameId: number) {
    const { data: ratings, error } = await supabase
      .from('rating')
      .select('rating')
      .eq('game_id', gameId);
    
    if (error) throw error;

    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings 
      : 0;

    // Generate rating distribution
    const distribution = Array.from({ length: 10 }, (_, i) => ({
      rating: i + 1,
      count: 0
    }));

    ratings.forEach(rating => {
      const ratingIndex = Math.floor(rating.rating) - 1;
      if (ratingIndex >= 0 && ratingIndex < 10) {
        distribution[ratingIndex].count++;
      }
    });

    return {
      averageRating,
      totalRatings,
      ratingDistribution: distribution.reverse()
    };
  }
};