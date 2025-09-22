/**
 * Centralized game quality metrics evaluation system
 * Single source of truth for all quality thresholds and checks
 */

// Import the Game interface if needed
interface Game {
  id: number;
  name: string;
  total_rating?: number;
  rating_count?: number;
  follows?: number;
  hypes?: number;
  category?: number;
  // Other fields as needed
}

export interface QualityThresholds {
  rating: number;
  reviewCount?: number;
  follows: number;
}

/**
 * Standardized quality thresholds used throughout the application
 *
 * STRONG: Used for primary quality overrides and category filtering
 * - Requires both high rating WITH sufficient reviews, OR high follower count
 * - More restrictive to ensure only truly popular games bypass filters
 *
 * GOOD: Used for secondary filtering (e.g., collection name filtering)
 * - Requires either good rating OR decent follower count
 * - More lenient for name-based filtering
 */
export const QUALITY_THRESHOLDS = {
  // High-quality games that should bypass most filters
  STRONG: {
    rating: 70,
    reviewCount: 50,
    follows: 1000
  },
  // Good quality games for name-based filtering
  GOOD: {
    rating: 75,
    follows: 500
  }
} as const;

/**
 * Check if a game meets strong quality metrics
 * Used for category filtering and primary quality overrides
 *
 * @param game - The game to evaluate
 * @returns true if the game has strong quality metrics
 */
export function hasStrongQualityMetrics(game: Game): boolean {
  // Check if the game has high rating with sufficient reviews
  const hasHighRating = !!(
    game.total_rating &&
    game.total_rating > QUALITY_THRESHOLDS.STRONG.rating &&
    game.rating_count &&
    game.rating_count > (QUALITY_THRESHOLDS.STRONG.reviewCount || 0)
  );

  // Check if the game is very popular by follower count
  const isVeryPopular = !!(
    game.follows &&
    game.follows > QUALITY_THRESHOLDS.STRONG.follows
  );

  return hasHighRating || isVeryPopular;
}

/**
 * Check if a game meets good quality metrics
 * Used for secondary filtering (e.g., collection names)
 *
 * @param game - The game to evaluate
 * @returns true if the game has good quality metrics
 */
export function hasGoodQualityMetrics(game: Game): boolean {
  // Check if the game has good rating (no review count requirement)
  const hasGoodRating = !!(
    game.total_rating &&
    game.total_rating > QUALITY_THRESHOLDS.GOOD.rating
  );

  // Check if the game is popular by follower count
  const isPopular = !!(
    game.follows &&
    game.follows > QUALITY_THRESHOLDS.GOOD.follows
  );

  return hasGoodRating || isPopular;
}

/**
 * Get quality tier for a game
 * Useful for debugging, logging, and conditional logic
 *
 * @param game - The game to evaluate
 * @returns The quality tier of the game
 */
export function getQualityTier(game: Game): 'STRONG' | 'GOOD' | 'LOW' {
  if (hasStrongQualityMetrics(game)) return 'STRONG';
  if (hasGoodQualityMetrics(game)) return 'GOOD';
  return 'LOW';
}

/**
 * Get a human-readable quality description for logging
 *
 * @param game - The game to describe
 * @returns A string describing the game's quality metrics
 */
export function getQualityDescription(game: Game): string {
  const tier = getQualityTier(game);
  const rating = game.total_rating || 0;
  const reviews = game.rating_count || 0;
  const follows = game.follows || 0;

  return `${tier} quality (Rating: ${rating}, Reviews: ${reviews}, Follows: ${follows})`;
}

/**
 * Check if a game should bypass filters based on quality alone
 * This is for games that are so popular they should always appear
 *
 * @param game - The game to evaluate
 * @param allowMods - Whether to allow mod bypasses (default: false)
 * @returns true if the game should bypass filters
 */
export function shouldBypassFiltersForQuality(game: Game, allowMods: boolean = false): boolean {
  // Never bypass for mods unless explicitly allowed
  if (game.category === 5 && !allowMods) {
    return false;
  }

  return hasStrongQualityMetrics(game);
}

/**
 * Determine if a collection/remaster/port should be kept based on quality
 *
 * @param game - The game to evaluate
 * @param categoryName - Human-readable category name for logging
 * @returns Object with decision and log message
 */
export function evaluateCategoryQuality(
  game: Game,
  categoryName: string
): { keep: boolean; logMessage: string } {
  const hasStrong = hasStrongQualityMetrics(game);

  if (hasStrong) {
    return {
      keep: true,
      logMessage: `⭐ QUALITY ${categoryName.toUpperCase()}: Keeping popular ${categoryName.toLowerCase()} "${game.name}" (Rating: ${game.total_rating}, Follows: ${game.follows})`
    };
  }

  return {
    keep: false,
    logMessage: `📦 ${categoryName.toUpperCase()} FILTER: Filtering low-quality ${categoryName.toLowerCase()} "${game.name}" (Category ${game.category})`
  };
}

/**
 * Evaluate if a game with collection-like name should be kept
 *
 * @param game - The game to evaluate
 * @param indicatorFound - The collection indicator found in the name
 * @returns Object with decision and log message
 */
export function evaluateCollectionNameQuality(
  game: Game,
  indicatorFound: string
): { keep: boolean; logMessage: string } {
  // Use GOOD quality threshold for name-based filtering (more lenient)
  const hasGood = hasGoodQualityMetrics(game);

  if (hasGood) {
    return {
      keep: true,
      logMessage: `⭐ QUALITY COLLECTION NAME: Keeping "${game.name}" - high quality metrics override name filter`
    };
  }

  return {
    keep: false,
    logMessage: `📦 COLLECTION NAME FILTER: Filtering low-quality collection "${game.name}" (contains "${indicatorFound}")`
  };
}

// Export the Game interface for use in other files
export type { Game };