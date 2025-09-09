/**
 * Hybrid Iconic Game Detection System
 * 
 * Combines manual curation with automated signals to identify flagship/iconic games
 * Uses weighted scoring to determine which games deserve special treatment in search
 */

import { 
  isFlagshipGame, 
  calculateFlagshipScore, 
  detectFranchiseSearch,
  type FlagshipGame 
} from './flagshipGames';

export interface IconicGameScore {
  score: number;
  reasons: string[];
  isFlagship: boolean;
  flagshipData?: FlagshipGame;
}

export interface GameMetrics {
  id: number;
  name: string;
  rating?: number;           // IGDB rating
  metacritic_score?: number; // Metacritic score
  user_rating?: number;      // User rating
  user_rating_count?: number; // Number of user ratings
  follows?: number;          // IGDB follows
  hypes?: number;           // IGDB hypes
  first_release_date?: number; // Release timestamp
  category?: number;         // IGDB category
  franchise?: string;        // Franchise name
  genres?: string[];         // Game genres
  platforms?: string[];      // Platforms
}

/**
 * Calculate comprehensive iconic score for a game
 * Combines manual flagship data with automated quality/popularity signals
 */
export function calculateIconicScore(game: GameMetrics, searchQuery?: string): IconicGameScore {
  const reasons: string[] = [];
  let totalScore = 0;
  
  // Detect franchise context if available
  const detectedFranchise = searchQuery ? detectFranchiseSearch(searchQuery) : null;
  
  // 1. Manual Flagship List (Highest Weight - 100+ points)
  const flagshipData = isFlagshipGame(game.name, detectedFranchise || undefined);
  const flagshipScore = flagshipData ? calculateFlagshipScore(game.name, detectedFranchise || undefined) : 0;
  
  if (flagshipScore > 0) {
    totalScore += flagshipScore;
    reasons.push(`Flagship game: ${flagshipData!.reason}`);
  }
  
  // 2. Historical Significance (Age-based scoring)
  const ageScore = calculateAgeBonus(game.first_release_date);
  if (ageScore > 0) {
    totalScore += ageScore;
    reasons.push(`Classic era bonus (+${ageScore})`);
  }
  
  // 3. Quality Metrics
  const qualityScore = calculateQualityScore(game);
  if (qualityScore > 0) {
    totalScore += qualityScore;
    reasons.push(`High quality scores (+${qualityScore})`);
  }
  
  // 4. Popularity/Engagement Metrics  
  const popularityScore = calculatePopularityScore(game);
  if (popularityScore > 0) {
    totalScore += popularityScore;
    reasons.push(`Strong community engagement (+${popularityScore})`);
  }
  
  // 5. Genre/Platform Significance
  const significanceScore = calculateSignificanceScore(game);
  if (significanceScore > 0) {
    totalScore += significanceScore;
    reasons.push(`Platform/genre significance (+${significanceScore})`);
  }
  
  // 6. Series Context (First game, numbered sequel, etc.)
  const seriesScore = calculateSeriesScore(game, detectedFranchise);
  if (seriesScore > 0) {
    totalScore += seriesScore;
    reasons.push(`Series importance (+${seriesScore})`);
  }
  
  return {
    score: totalScore,
    reasons,
    isFlagship: !!flagshipData,
    flagshipData: flagshipData || undefined
  };
}

/**
 * Calculate age-based bonus for classic games
 */
function calculateAgeBonus(releaseTimestamp?: number): number {
  if (!releaseTimestamp) return 0;
  
  const releaseDate = new Date(releaseTimestamp * 1000);
  const releaseYear = releaseDate.getFullYear();
  
  // Classic eras get bonuses
  if (releaseYear <= 1990) return 25; // Golden age (Arcade/NES era)
  if (releaseYear <= 1995) return 20; // 16-bit era (SNES/Genesis)
  if (releaseYear <= 2000) return 15; // Early 3D era (PSX/N64)
  if (releaseYear <= 2005) return 10; // 6th gen classics (PS2/GC/Xbox)
  if (releaseYear <= 2010) return 5;  // 7th gen early classics
  
  return 0;
}

/**
 * Calculate quality-based scoring from review scores
 */
function calculateQualityScore(game: GameMetrics): number {
  let score = 0;
  
  // Metacritic score (most reliable)
  if (game.metacritic_score) {
    if (game.metacritic_score >= 95) score += 30;      // Universal acclaim
    else if (game.metacritic_score >= 90) score += 25; // Critical masterpiece
    else if (game.metacritic_score >= 85) score += 20; // Highly acclaimed
    else if (game.metacritic_score >= 80) score += 10; // Well received
  }
  
  // IGDB rating (secondary)
  if (game.rating) {
    if (game.rating >= 90) score += 15;      // Outstanding
    else if (game.rating >= 85) score += 10; // Excellent
    else if (game.rating >= 80) score += 5;  // Very good
  }
  
  // User rating (with engagement requirement)
  if (game.user_rating && game.user_rating_count && game.user_rating_count > 1000) {
    if (game.user_rating >= 4.5) score += 10;      // User favorite
    else if (game.user_rating >= 4.0) score += 5;  // Well liked
  }
  
  return score;
}

/**
 * Calculate popularity/engagement scoring
 */
function calculatePopularityScore(game: GameMetrics): number {
  let score = 0;
  
  // IGDB follows (indicates lasting interest)
  if (game.follows) {
    if (game.follows > 100000) score += 25;      // Massive following
    else if (game.follows > 50000) score += 20;  // Large following
    else if (game.follows > 20000) score += 15;  // Strong following
    else if (game.follows > 10000) score += 10;  // Good following
    else if (game.follows > 5000) score += 5;    // Modest following
  }
  
  // User rating count (engagement metric)
  if (game.user_rating_count) {
    if (game.user_rating_count > 50000) score += 15;    // Massive engagement
    else if (game.user_rating_count > 20000) score += 12; // High engagement
    else if (game.user_rating_count > 10000) score += 8;  // Good engagement
    else if (game.user_rating_count > 5000) score += 5;   // Decent engagement
  }
  
  // Hypes (current interest)
  if (game.hypes) {
    if (game.hypes > 1000) score += 10;       // High current interest
    else if (game.hypes > 500) score += 5;    // Moderate interest
  }
  
  return score;
}

/**
 * Calculate platform/genre significance
 */
function calculateSignificanceScore(game: GameMetrics): number {
  let score = 0;
  
  // System seller potential (certain platforms)
  const systemSellerPlatforms = [
    'nintendo entertainment system',
    'super nintendo entertainment system', 
    'nintendo 64',
    'playstation',
    'playstation 2',
    'nintendo switch'
  ];
  
  if (game.platforms?.some(platform => 
    systemSellerPlatforms.some(seller => {
      const platformName = typeof platform === 'string' 
        ? platform 
        : (platform as any)?.name || '';
      return platformName.toLowerCase().includes(seller);
    })
  )) {
    score += 10;
  }
  
  // Genre significance (genre-defining games)
  const significantGenres = [
    'platform', 'fighting', 'role-playing (rpg)', 'shooter', 'racing'
  ];
  
  if (game.genres?.some(genre => 
    significantGenres.some(sig => {
      const genreName = typeof genre === 'string' 
        ? genre 
        : (genre as any)?.name || '';
      return genreName.toLowerCase().includes(sig);
    })
  )) {
    score += 5;
  }
  
  return score;
}

/**
 * Calculate series/franchise context scoring
 */
function calculateSeriesScore(game: GameMetrics, franchise?: string | null): number {
  let score = 0;
  const gameName = game.name.toLowerCase();
  
  // Series originator patterns
  const originatorPatterns = [
    /\b(first|original|1)\b/,
    /\b(the legend of|super).*(?!2|3|4|5|6|7|8|9|ii|iii|iv|v|vi|vii|viii|ix|x)/
  ];
  
  if (originatorPatterns.some(pattern => pattern.test(gameName))) {
    score += 20; // Series originator bonus
  }
  
  // Numbered entries (main series games)
  const numberedPatterns = [
    /\b(2|3|4|5|6|7|ii|iii|iv|v|vi|vii)\b/,
    /\b(zero|x|alpha|beta|gamma)\b/
  ];
  
  if (numberedPatterns.some(pattern => pattern.test(gameName))) {
    score += 10; // Main series entry bonus
  }
  
  // Subtitle importance (major entries)
  const importantSubtitles = [
    'world', 'galaxy', 'odyssey', 'breath of the wild', 'ocarina of time',
    'majoras mask', 'wind waker', 'twilight princess', 'skyward sword'
  ];
  
  if (importantSubtitles.some(subtitle => gameName.includes(subtitle))) {
    score += 15; // Important subtitle bonus
  }
  
  return score;
}

/**
 * Determine if a game qualifies as iconic based on score threshold
 */
export function isIconicGame(game: GameMetrics, searchQuery?: string): boolean {
  const iconicScore = calculateIconicScore(game, searchQuery);
  
  // Dynamic threshold based on context
  let threshold = 50; // Base threshold
  
  // Lower threshold for franchise searches (more permissive)
  if (searchQuery && detectFranchiseSearch(searchQuery)) {
    threshold = 30;
  }
  
  // Manual flagship games always qualify
  if (iconicScore.isFlagship) {
    return true;
  }
  
  return iconicScore.score >= threshold;
}

/**
 * Get iconic games from a list, sorted by iconic score
 */
export function getIconicGames(games: GameMetrics[], searchQuery?: string): GameMetrics[] {
  const iconicGames = games
    .filter(game => isIconicGame(game, searchQuery))
    .map(game => ({
      ...game,
      _iconicScore: calculateIconicScore(game, searchQuery)
    }))
    .sort((a, b) => b._iconicScore.score - a._iconicScore.score);
  
  return iconicGames;
}

/**
 * Boost scores of iconic games for prioritization
 */
export function applyIconicBoost(games: any[], searchQuery?: string): any[] {
  return games.map(game => {
    const iconicScore = calculateIconicScore(game, searchQuery);
    
    if (iconicScore.score > 0) {
      // Apply iconic boost to existing priority calculation
      (game as any)._iconicBoost = iconicScore.score;
      (game as any)._iconicReasons = iconicScore.reasons;
      (game as any)._isFlagship = iconicScore.isFlagship;
    }
    
    return game;
  });
}

/**
 * Debug function to analyze iconic scoring for a game
 */
export function debugIconicScoring(game: GameMetrics, searchQuery?: string): void {
  const iconicScore = calculateIconicScore(game, searchQuery);
  
  console.log(`🎮 ICONIC ANALYSIS: "${game.name}"`);
  console.log(`   Total Score: ${iconicScore.score}`);
  console.log(`   Is Flagship: ${iconicScore.isFlagship}`);
  console.log(`   Reasons:`);
  iconicScore.reasons.forEach(reason => {
    console.log(`     - ${reason}`);
  });
  
  if (iconicScore.flagshipData) {
    console.log(`   Flagship Details: ${iconicScore.flagshipData.significance} - ${iconicScore.flagshipData.reason}`);
  }
}