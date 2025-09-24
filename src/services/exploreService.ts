import { supabase } from './supabase';

export interface ExploreGame {
  id: number;
  igdb_id?: number;
  name: string;
  description?: string;
  summary?: string;
  release_date?: string;
  cover_url?: string;
  platforms?: string[];
  avg_user_rating?: number;
  user_rating_count?: number;
  category?: number;
  greenlight_flag?: boolean;
  redlight_flag?: boolean;
}

export type SortOption = 'unified_score';

/**
 * Calculates a unified score that combines rating quality, review volume, and views
 * Higher scores indicate games with good ratings, community engagement, and visibility
 */
function calculateUnifiedScore(avgRating: number, reviewCount: number, views: number): number {
  if (reviewCount === 0 || avgRating === 0) return 0;
  
  // Normalize rating to 0-1 scale (assuming 1-10 rating scale)
  const normalizedRating = Math.max(0, (avgRating - 1) / 9);
  
  // Apply logarithmic scaling to review count to prevent dominance by outliers
  // This gives diminishing returns for very high review counts
  const reviewScore = Math.log10(reviewCount + 1) / Math.log10(100); // Normalize to ~0-1 range
  
  // Apply logarithmic scaling to views (currently 0, but ready for future use)
  const viewScore = views > 0 ? Math.log10(views + 1) / Math.log10(10000) : 0; // Normalize to ~0-1 range
  
  // Combine factors with weights:
  // - Rating quality: 50% (most important - good games should rank high)
  // - Review volume: 35% (community engagement matters)
  // - Views: 15% (visibility/popularity, ready for when view tracking is added)
  const unifiedScore = (normalizedRating * 0.5) + (reviewScore * 0.35) + (viewScore * 0.15);
  
  return unifiedScore;
}

/**
 * Legacy buzz score calculation for backwards compatibility
 */
function calculateBuzzScore(avgRating: number, reviewCount: number): number {
  return calculateUnifiedScore(avgRating, reviewCount, 0);
}

/**
 * Fetches games with review metrics using efficient database queries
 * Optimized to minimize database load and API calls
 */
export async function fetchGamesWithReviewMetrics(
  sortBy: SortOption = 'unified_score',
  limit: number = 40
): Promise<ExploreGame[]> {
  try {
    // Use a more efficient query that gets pre-aggregated data
    // This avoids fetching all ratings and doing calculations in JS
    const { data: gamesWithStats, error } = await supabase
      .rpc('get_games_with_review_stats', {
        sort_by: sortBy,
        result_limit: limit
      });

    if (error) {
      // Fallback to a simpler query if the RPC doesn't exist
      console.warn('RPC function not available, using fallback query');
      return fetchGamesWithReviewMetricsFallback(sortBy, limit);
    }

    return gamesWithStats || [];
  } catch (err) {
    console.error('Error fetching games with metrics:', err);
    // Use fallback method
    return fetchGamesWithReviewMetricsFallback(sortBy, limit);
  }
}

/**
 * Fallback method using more efficient queries
 * Fetches games with computed columns for performance
 */
async function fetchGamesWithReviewMetricsFallback(
  sortBy: SortOption,
  limit: number
): Promise<ExploreGame[]> {
  try {
    // First, get all ratings and aggregate by game
    const { data: allRatings, error: ratingsError } = await supabase
      .from('rating')
      .select('game_id, rating');

    if (ratingsError) throw ratingsError;
    if (!allRatings || allRatings.length === 0) return [];

    // Calculate stats per game
    const gameStatsMap = new Map<number, { count: number; total: number; views?: number }>();
    
    allRatings.forEach(rating => {
      const stats = gameStatsMap.get(rating.game_id) || { count: 0, total: 0, views: 0 };
      stats.count++;
      stats.total += rating.rating;
      gameStatsMap.set(rating.game_id, stats);
    });

    // Get unique game IDs that have ratings
    const gameIdsWithRatings = Array.from(gameStatsMap.keys());

    if (gameIdsWithRatings.length === 0) return [];

    // Now fetch the game details for games that have ratings
    const { data: games, error: gamesError } = await supabase
      .from('game')
      .select(`
        id,
        igdb_id,
        name,
        description,
        summary,
        release_date,
        cover_url,
        platforms,
        category,
        greenlight_flag,
        redlight_flag
      `)
      .in('id', gameIdsWithRatings)
      .not('redlight_flag', 'eq', true);

    if (gamesError) throw gamesError;
    if (!games || games.length === 0) return [];

    // Combine games with their stats and calculate buzz score
    const gamesWithMetrics: ExploreGame[] = games
      .map(game => {
        const stats = gameStatsMap.get(game.id);
        if (!stats) return null;
        
        const reviewCount = stats.count;
        const avgRating = stats.total / stats.count;
        const views = stats.views || 0; // TODO: Add actual view count from database
        
        return {
          ...game,
          user_rating_count: reviewCount,
          avg_user_rating: avgRating,
          unified_score: calculateUnifiedScore(avgRating, reviewCount, views)
        };
      })
      .filter(game => game !== null) as ExploreGame[];

    // Sort by unified score (highest first)
    const sorted = gamesWithMetrics.sort((a, b) => {
      return (b as any).unified_score - (a as any).unified_score;
    });

    return sorted.slice(0, limit);
  } catch (err) {
    console.error('Fallback query error:', err);
    return [];
  }
}

/**
 * Creates the RPC function in the database for optimized queries
 * This should be added as a migration
 */
export const CREATE_RPC_FUNCTION = `
-- Create a function to get games with review statistics
CREATE OR REPLACE FUNCTION get_games_with_review_stats(
  sort_by TEXT DEFAULT 'most_reviewed',
  result_limit INT DEFAULT 40
)
RETURNS TABLE (
  id INT,
  igdb_id INT,
  name TEXT,
  description TEXT,
  summary TEXT,
  release_date DATE,
  cover_url TEXT,
  platforms TEXT[],
  category INT,
  greenlight_flag BOOLEAN,
  redlight_flag BOOLEAN,
  avg_user_rating NUMERIC,
  user_rating_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.igdb_id,
    g.name,
    g.description,
    g.summary,
    g.release_date,
    g.cover_url,
    g.platforms,
    g.category,
    g.greenlight_flag,
    g.redlight_flag,
    AVG(r.rating)::NUMERIC as avg_user_rating,
    COUNT(r.id)::BIGINT as user_rating_count
  FROM game g
  INNER JOIN rating r ON g.id = r.game_id
  WHERE g.redlight_flag IS NOT TRUE
  GROUP BY g.id
  HAVING COUNT(r.id) > 0
  ORDER BY 
    CASE 
      WHEN sort_by = 'most_reviewed' THEN COUNT(r.id)
      WHEN sort_by = 'highest_rated' THEN AVG(r.rating)
      ELSE COUNT(r.id)
    END DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;
`;