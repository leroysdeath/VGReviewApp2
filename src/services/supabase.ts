import { createClient } from '@supabase/supabase-js';
import { sanitizeSearchTerm } from '../utils/sqlSecurity';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

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
    // CRITICAL SECURITY FIX: Comprehensive input validation
    if (!query || typeof query !== 'string') {
      return [];
    }
    
    const trimmedQuery = query.trim();
    
    // Validate query length and content
    if (trimmedQuery.length < 2 || trimmedQuery.length > 100) {
      return [];
    }
    
    // Block potentially malicious patterns
    const dangerousPatterns = [
      /['"`;\\]/g,           // SQL injection characters
      /--/g,                 // SQL comments
      /\/\*/g,               // Block comments
      /\*\//g,               // Block comment end
      /union\s+select/gi,    // Union injection
      /drop\s+table/gi,      // Drop table
      /delete\s+from/gi,     // Delete injection
      /insert\s+into/gi,     // Insert injection
      /update\s+set/gi       // Update injection
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmedQuery)) {
        console.warn('Blocked potentially malicious search query:', trimmedQuery);
        return [];
      }
    }
    
    // SECURITY FIX: Use proper escaping for LIKE wildcards and special chars
    const escapedQuery = trimmedQuery
      .replace(/[%_\\]/g, '\\$&')        // Escape LIKE wildcards
      .replace(/[&<>"']/g, '');          // Remove HTML/JS injection chars
    
    try {
      const { data, error } = await supabase
        .from('game')
        .select(`
          *,
          platform_games(
            platform(*)
          )
        `)
        .or(`name.ilike.%${escapedQuery}%,description.ilike.%${escapedQuery}%,genre.ilike.%${escapedQuery}%`)
        .limit(Math.min(limit, 100));
      
      if (error) {
        console.error('Search query error:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Game search failed:', error);
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

  // Statistics
  async getUserStats(userId: number) {
    const { data: ratings, error } = await supabase
      .from('rating')
      .select('rating, finished')
      .eq('user_id', userId);
    
    if (error) throw error;

    const totalGames = ratings.length;
    const completedGames = ratings.filter(r => r.finished).length;
    const averageRating = totalGames > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalGames 
      : 0;
    const totalReviews = ratings.filter(r => r.review && r.review.trim().length > 0).length;

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