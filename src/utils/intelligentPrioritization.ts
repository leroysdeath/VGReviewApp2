/**
 * Phase 3: Intelligent Result Prioritization System
 * Enhanced sorting with relevance scoring, quality metrics, and search intent detection
 */

import { 
  GamePriority, 
  CategoryPriority, 
  calculateGamePriority,
  sortGamesByPriority 
} from './gamePrioritization';

interface Game {
  id: number;
  name: string;
  summary?: string;
  description?: string;
  developer?: string;
  publisher?: string;
  category?: number;
  genres?: string[];
  rating?: number;
  igdb_rating?: number;
  total_rating?: number;
  user_rating_count?: number;
  avg_user_rating?: number;
  release_date?: string;
  first_release_date?: number;
  platforms?: string[] | Array<{name: string}>;
  popularity?: number;
  follows?: number;
  hypes?: number;
  cover?: { url?: string };
}

interface IntelligentScore {
  relevanceScore: number;
  qualityScore: number;
  popularityScore: number;
  recencyBonus: number;
  intentMatchScore: number;
  totalScore: number;
  breakdown: {
    titleMatch: number;
    genreMatch: number;
    developerMatch: number;
    metadataQuality: number;
    userEngagement: number;
    criticalAcclaim: number;
    platformRelevance: number;
  };
}

export enum SearchIntent {
  SPECIFIC_GAME = 'specific_game',        // "The Legend of Zelda Breath of the Wild" 
  FRANCHISE_BROWSE = 'franchise_browse',  // "mario games"
  GENRE_DISCOVERY = 'genre_discovery',    // "rpg", "action games"  
  DEVELOPER_SEARCH = 'developer_search',  // "nintendo games"
  YEAR_SEARCH = 'year_search',           // "2023 games"
  PLATFORM_SEARCH = 'platform_search'   // "ps5 games"
}

/**
 * Detect user's search intent based on query patterns
 */
export function detectSearchIntent(query: string): SearchIntent {
  const lowerQuery = query.toLowerCase().trim();
  
  // Specific game patterns (long queries with specific terms)
  if (lowerQuery.length > 15 && 
      (lowerQuery.includes('the ') || lowerQuery.includes(': ') || lowerQuery.includes(' of '))) {
    return SearchIntent.SPECIFIC_GAME;
  }
  
  // Year search patterns
  const yearMatch = lowerQuery.match(/\b(19|20)\d{2}\b/);
  if (yearMatch || lowerQuery.includes('new games') || lowerQuery.includes('latest')) {
    return SearchIntent.YEAR_SEARCH;
  }
  
  // Platform patterns (but nintendo is special - only if not "nintendo games")
  const platformKeywords = ['pc', 'ps5', 'ps4', 'xbox', 'switch', 'steam', 'mobile'];
  if (platformKeywords.some(platform => lowerQuery.includes(platform))) {
    return SearchIntent.PLATFORM_SEARCH;
  }
  
  // Nintendo as platform only if it's not "nintendo games" which should be developer
  if (lowerQuery.includes('nintendo') && !lowerQuery.includes('games')) {
    return SearchIntent.PLATFORM_SEARCH;
  }
  
  // Developer patterns (check before genre to prioritize developer searches)
  const developerKeywords = ['sony', 'microsoft', 'valve', 'ubisoft', 'ea ', 'activision'];
  if (developerKeywords.some(dev => lowerQuery.includes(dev))) {
    return SearchIntent.DEVELOPER_SEARCH;
  }
  
  // Special case: nintendo games should be developer search, but mario games should be franchise
  if (lowerQuery.includes('nintendo') && lowerQuery.includes('games')) {
    return SearchIntent.DEVELOPER_SEARCH;
  }
  
  // Genre patterns (but exclude franchise + games patterns)
  const genreKeywords = ['rpg', 'action', 'adventure', 'strategy', 'simulation', 'sports', 'racing', 'puzzle'];
  const franchiseKeywords = ['mario', 'zelda', 'pokemon', 'sonic', 'call of duty', 'final fantasy'];
  
  if (lowerQuery.includes('games')) {
    // Check if it's franchise + games pattern
    if (franchiseKeywords.some(franchise => lowerQuery.includes(franchise))) {
      return SearchIntent.FRANCHISE_BROWSE;
    }
    // Otherwise, if it contains genre keywords, it's genre discovery
    if (genreKeywords.some(genre => lowerQuery.includes(genre))) {
      return SearchIntent.GENRE_DISCOVERY;
    }
  } else if (genreKeywords.some(genre => lowerQuery.includes(genre))) {
    return SearchIntent.GENRE_DISCOVERY;
  }
  
  // Franchise browsing (short queries that are likely franchise names)
  if (lowerQuery.length <= 15 && !lowerQuery.includes(' ')) {
    return SearchIntent.FRANCHISE_BROWSE;
  }
  
  // Default to franchise browse for multi-word queries
  return SearchIntent.FRANCHISE_BROWSE;
}

/**
 * Calculate relevance score based on query matching
 */
function calculateRelevanceScore(game: Game, query: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerName = game.name.toLowerCase();
  const lowerSummary = (game.summary || '').toLowerCase();
  const lowerDescription = (game.description || '').toLowerCase();
  
  let score = 0;
  
  // Title matching (highest weight)
  if (lowerName === lowerQuery) {
    score += 1000; // Exact match
  } else if (lowerName.startsWith(lowerQuery)) {
    score += 800; // Starts with query
  } else if (lowerName.includes(lowerQuery)) {
    score += 600; // Contains query
  } else {
    // Partial word matching
    const queryWords = lowerQuery.split(' ').filter(w => w.length > 2);
    const nameWords = lowerName.split(' ');
    const matchingWords = queryWords.filter(qw => 
      nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
    );
    score += (matchingWords.length / queryWords.length) * 400;
  }
  
  // Content matching (medium weight)
  if (lowerSummary.includes(lowerQuery)) {
    score += 200;
  }
  if (lowerDescription.includes(lowerQuery)) {
    score += 150;
  }
  
  // Genre matching (low weight)
  if (game.genres) {
    const genreMatch = game.genres.some(genre => 
      genre.toLowerCase().includes(lowerQuery) || lowerQuery.includes(genre.toLowerCase())
    );
    if (genreMatch) score += 100;
  }
  
  // Developer/Publisher matching (medium weight)
  if ((game.developer?.toLowerCase().includes(lowerQuery)) || 
      (game.publisher?.toLowerCase().includes(lowerQuery))) {
    score += 300;
  }
  
  return Math.min(score, 1000); // Cap at 1000
}

/**
 * Calculate quality score based on ratings, metadata completeness, and engagement
 */
function calculateQualityScore(game: Game): number {
  let score = 0;
  
  // Critical acclaim (40% of quality score)
  const criticRating = game.igdb_rating || game.total_rating || game.rating || 0;
  if (criticRating > 0) {
    score += (criticRating / 100) * 400; // Normalize to 0-400
  }
  
  // User ratings (30% of quality score)
  if (game.avg_user_rating && game.user_rating_count) {
    const userScore = (game.avg_user_rating / 10) * 300; // Normalize to 0-300
    const confidenceBonus = Math.min(game.user_rating_count / 100, 1) * 50; // More ratings = more confidence
    score += userScore + confidenceBonus;
  }
  
  // Metadata completeness (20% of quality score)
  let metadataScore = 0;
  if (game.summary && game.summary.length > 50) metadataScore += 50;
  if (game.description && game.description.length > 100) metadataScore += 50;
  if (game.cover?.url) metadataScore += 25;
  if (game.genres && game.genres.length > 0) metadataScore += 25;
  if (game.developer) metadataScore += 25;
  if (game.release_date || game.first_release_date) metadataScore += 25;
  score += metadataScore;
  
  // Engagement metrics (10% of quality score)
  const engagement = (game.follows || 0) + (game.hypes || 0) + (game.user_rating_count || 0);
  score += Math.min(engagement / 10, 100); // Cap engagement bonus
  
  return Math.min(score, 1000); // Cap at 1000
}

/**
 * Calculate popularity score based on user engagement and community metrics
 */
function calculatePopularityScore(game: Game): number {
  const userRatingCount = game.user_rating_count || 0;
  const follows = game.follows || 0;
  const hypes = game.hypes || 0;
  const popularity = game.popularity || 0;
  
  // Combine different popularity metrics
  const engagementScore = Math.min((userRatingCount * 2) + follows + hypes, 500);
  const popularityScore = Math.min(popularity / 10, 300);
  
  return engagementScore + popularityScore;
}

/**
 * Calculate recency bonus for newer games
 */
function calculateRecencyBonus(game: Game): number {
  const releaseDate = game.release_date 
    ? new Date(game.release_date)
    : game.first_release_date 
    ? new Date(game.first_release_date * 1000)
    : null;
    
  if (!releaseDate || isNaN(releaseDate.getTime())) return 0;
  
  const now = new Date();
  const ageInYears = (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  
  // Newer games get higher bonus, with diminishing returns
  if (ageInYears < 1) return 200; // Very recent
  if (ageInYears < 2) return 150; // Recent
  if (ageInYears < 5) return 100; // Somewhat recent
  if (ageInYears < 10) return 50;  // Moderately old
  return 0; // Old games get no recency bonus
}

/**
 * Calculate intent match score based on detected search intent
 */
function calculateIntentMatchScore(game: Game, query: string, intent: SearchIntent): number {
  let score = 0;
  
  switch (intent) {
    case SearchIntent.SPECIFIC_GAME:
      // Boost exact matches heavily for specific game searches
      if (game.name.toLowerCase() === query.toLowerCase()) {
        score += 500;
      }
      // Penalize DLC/mods for specific searches
      if (game.category === 1 || game.category === 5) {
        score -= 200;
      }
      break;
      
    case SearchIntent.FRANCHISE_BROWSE:
      // Boost main games in franchise browsing
      if (game.category === 0) {
        score += 200; // Main games
      } else if (game.category === 2 || game.category === 4) {
        score += 100; // Expansions
      }
      // Slight penalty for DLC in franchise browsing
      if (game.category === 1) {
        score -= 50;
      }
      break;
      
    case SearchIntent.GENRE_DISCOVERY:
      // Boost popular and highly-rated games for genre discovery
      if (game.user_rating_count && game.user_rating_count > 100) {
        score += 150;
      }
      if (game.avg_user_rating && game.avg_user_rating > 8) {
        score += 100;
      }
      break;
      
    case SearchIntent.YEAR_SEARCH:
      // Recency bonus is already handled separately
      score += calculateRecencyBonus(game) * 0.5; // Additional boost for year searches
      break;
      
    case SearchIntent.PLATFORM_SEARCH:
    case SearchIntent.DEVELOPER_SEARCH:
      // Base scoring works well for these
      break;
  }
  
  return score;
}

/**
 * Calculate comprehensive intelligent score for a game
 */
export function calculateIntelligentScore(game: Game, query: string): IntelligentScore {
  const intent = detectSearchIntent(query);
  
  // Calculate component scores
  const relevanceScore = calculateRelevanceScore(game, query);
  const qualityScore = calculateQualityScore(game);
  const popularityScore = calculatePopularityScore(game);
  const recencyBonus = calculateRecencyBonus(game);
  const intentMatchScore = calculateIntentMatchScore(game, query, intent);
  
  // Calculate breakdown for debugging
  const breakdown = {
    titleMatch: Math.min(relevanceScore * 0.6, 600),
    genreMatch: Math.min(relevanceScore * 0.2, 200),
    developerMatch: Math.min(relevanceScore * 0.2, 200),
    metadataQuality: qualityScore * 0.3,
    userEngagement: popularityScore * 0.4,
    criticalAcclaim: qualityScore * 0.4,
    platformRelevance: intentMatchScore * 0.3
  };
  
  // Weight the scores based on search intent
  let totalScore = 0;
  
  switch (intent) {
    case SearchIntent.SPECIFIC_GAME:
      totalScore = (relevanceScore * 0.6) + (qualityScore * 0.25) + (popularityScore * 0.1) + (intentMatchScore * 0.05);
      break;
      
    case SearchIntent.FRANCHISE_BROWSE:
      totalScore = (relevanceScore * 0.4) + (qualityScore * 0.3) + (popularityScore * 0.2) + (intentMatchScore * 0.1);
      break;
      
    case SearchIntent.GENRE_DISCOVERY:
      totalScore = (relevanceScore * 0.2) + (qualityScore * 0.4) + (popularityScore * 0.3) + (recencyBonus * 0.1);
      break;
      
    case SearchIntent.YEAR_SEARCH:
      totalScore = (recencyBonus * 0.4) + (qualityScore * 0.3) + (popularityScore * 0.2) + (relevanceScore * 0.1);
      break;
      
    default:
      totalScore = (relevanceScore * 0.35) + (qualityScore * 0.3) + (popularityScore * 0.25) + (intentMatchScore * 0.1);
  }
  
  return {
    relevanceScore,
    qualityScore,
    popularityScore,
    recencyBonus,
    intentMatchScore,
    totalScore: Math.round(totalScore),
    breakdown
  };
}

/**
 * Phase 3: Enhanced intelligent sorting with comprehensive prioritization
 */
export function sortGamesIntelligently(games: Game[], query?: string): Game[] {
  if (!query || !query.trim()) {
    // No query - use existing priority system with quality boost
    return sortGamesByPriority(games);
  }

  const intent = detectSearchIntent(query);
  console.log(`🧠 PHASE 3 INTELLIGENT SORT: Query "${query}" detected as ${intent} (${games.length} games)`);

  return [...games].sort((a, b) => {
    // Get existing priority scores for fallback
    const aPriority = calculateGamePriority(a);
    const bPriority = calculateGamePriority(b);
    
    // Calculate intelligent scores
    const aIntelligent = calculateIntelligentScore(a, query);
    const bIntelligent = calculateIntelligentScore(b, query);
    
    // Primary sort: Intelligent total score
    if (aIntelligent.totalScore !== bIntelligent.totalScore) {
      return bIntelligent.totalScore - aIntelligent.totalScore;
    }
    
    // Secondary sort: Category priority (main games before DLC)
    if (aPriority.categoryPriority !== bPriority.categoryPriority) {
      return bPriority.categoryPriority - aPriority.categoryPriority;
    }
    
    // Tertiary sort: Game priority score
    if (aPriority.score !== bPriority.score) {
      return bPriority.score - aPriority.score;
    }
    
    // Final sort: Quality metrics
    const aQuality = (a.avg_user_rating || 0) + ((a.user_rating_count || 0) / 100);
    const bQuality = (b.avg_user_rating || 0) + ((b.user_rating_count || 0) / 100);
    return bQuality - aQuality;
  });
}

/**
 * Get top results with detailed scoring information for debugging
 */
export function getIntelligentSearchResults(games: Game[], query: string, limit = 20) {
  const sorted = sortGamesIntelligently(games, query);
  const intent = detectSearchIntent(query);
  
  const results = sorted.slice(0, limit).map(game => ({
    game,
    score: calculateIntelligentScore(game, query),
    priority: calculateGamePriority(game)
  }));
  
  return {
    intent,
    results,
    totalGames: games.length,
    summary: {
      avgRelevance: results.reduce((sum, r) => sum + r.score.relevanceScore, 0) / results.length,
      avgQuality: results.reduce((sum, r) => sum + r.score.qualityScore, 0) / results.length,
      topCategories: results.slice(0, 5).map(r => r.game.category)
    }
  };
}