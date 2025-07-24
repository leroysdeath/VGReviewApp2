import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
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

  async getUserByProviderId(providerId: string) {
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('provider_id', providerId)
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
    const { data, error } = await supabase
      .from('game')
      .select(`
        *,
        platform_games(
          platform(*)
        )
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,genre.ilike.%${query}%`)
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  async getPopularGames(limit = 20) {
    const { data, error } = await supabase
      .from('game')
      .select(`
        *,
        platform_games(
          platform(*)
        ),
        ratings:rating(rating)
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
  }) {
    const { data, error } = await supabase
      .from('rating')
      .insert({
        ...ratingData,
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

  // Statistics
  async getUserStats(userId: number) {
    const { data: ratings, error } = await supabase
      .from('rating')
      .select('rating, finished')
      .eq('user_id', userId);
    
    if (error) throw error;

    const totalGames = ratings?.length || 0;
    const completedGames = ratings?.filter(r => r.finished).length || 0;
    const averageRating = totalGames > 0 
      ? ratings!.reduce((sum, r) => sum + r.rating, 0) / totalGames 
      : 0;
    const totalReviews = ratings?.filter(r => r.review && r.review.trim().length > 0).length || 0;

    return {
      totalGames,
      completedGames,
      averageRating,
      totalReviews
    };
  },

  async getGameStats(gameId: number) {
    const { data: ratings, error } = await supabase
      .from('rating')
      .select('rating')
      .eq('game_id', gameId);
    
    if (error) throw error;

    const totalRatings = ratings?.length || 0;
    const averageRating = totalRatings > 0 
      ? ratings!.reduce((sum, r) => sum + r.rating, 0) / totalRatings 
      : 0;

    // Generate rating distribution
    const distribution = Array.from({ length: 10 }, (_, i) => ({
      rating: i + 1,
      count: 0
    }));

    ratings?.forEach(rating => {
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
