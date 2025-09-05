/**
 * Quality Metrics System
 * Scores games based on ratings, popularity, and other quality indicators
 */

interface QualityBoost {
  score: number;
  reason: string;
}

/**
 * Calculate rating-based quality boost
 */
export function calculateRatingBoost(game: any): QualityBoost {
  const igdbRating = game.rating || 0;
  const metacriticScore = game.metacritic_score || 0;
  const userRating = game.total_rating || 0;

  let bestScore = 0;
  let bestReason = '';

  // IGDB rating (0-100 scale)
  if (igdbRating >= 90) {
    bestScore = Math.max(bestScore, 40);
    bestReason = `Exceptional IGDB rating (${igdbRating.toFixed(1)})`;
  } else if (igdbRating >= 80) {
    bestScore = Math.max(bestScore, 30);
    bestReason = `High IGDB rating (${igdbRating.toFixed(1)})`;
  } else if (igdbRating >= 70) {
    bestScore = Math.max(bestScore, 20);
    bestReason = `Good IGDB rating (${igdbRating.toFixed(1)})`;
  }

  // Metacritic score (0-100 scale)
  if (metacriticScore >= 90) {
    bestScore = Math.max(bestScore, 35);
    bestReason = `Metacritic universal acclaim (${metacriticScore})`;
  } else if (metacriticScore >= 80) {
    bestScore = Math.max(bestScore, 25);
    bestReason = `High Metacritic score (${metacriticScore})`;
  } else if (metacriticScore >= 70) {
    bestScore = Math.max(bestScore, 15);
    bestReason = `Good Metacritic score (${metacriticScore})`;
  }

  // User rating (0-100 scale)
  if (userRating >= 85) {
    bestScore = Math.max(bestScore, 25);
    bestReason = `High user rating (${userRating.toFixed(1)})`;
  } else if (userRating >= 75) {
    bestScore = Math.max(bestScore, 15);
    bestReason = `Good user rating (${userRating.toFixed(1)})`;
  }

  return {
    score: bestScore,
    reason: bestReason || 'No significant rating data'
  };
}

/**
 * Calculate popularity-based boost
 */
export function calculatePopularityBoost(game: any): QualityBoost {
  const follows = game.follows || 0;
  const ratingCount = game.total_rating_count || 0;
  const hypes = game.hypes || 0;

  let score = 0;
  const reasons = [];

  // Follows count (fan interest)
  if (follows >= 1000000) {
    score += 30;
    reasons.push(`Very high follows (${(follows / 1000000).toFixed(1)}M)`);
  } else if (follows >= 500000) {
    score += 20;
    reasons.push(`High follows (${(follows / 1000).toFixed(0)}K)`);
  } else if (follows >= 100000) {
    score += 10;
    reasons.push(`Moderate follows (${(follows / 1000).toFixed(0)}K)`);
  }

  // Rating count (review engagement)
  if (ratingCount >= 50000) {
    score += 20;
    reasons.push(`High rating engagement (${(ratingCount / 1000).toFixed(0)}K ratings)`);
  } else if (ratingCount >= 10000) {
    score += 10;
    reasons.push(`Good rating engagement (${(ratingCount / 1000).toFixed(0)}K ratings)`);
  }

  // Hype count (anticipation)
  if (hypes >= 1000) {
    score += 15;
    reasons.push(`High anticipation (${hypes} hypes)`);
  } else if (hypes >= 100) {
    score += 8;
    reasons.push(`Moderate anticipation (${hypes} hypes)`);
  }

  return {
    score: Math.min(50, score), // Cap at 50 points
    reason: reasons.length > 0 ? reasons.join(', ') : 'Limited popularity data'
  };
}

/**
 * Calculate franchise significance boost
 */
export function calculateFranchiseSignificanceBoost(game: any, searchQuery: string): QualityBoost {
  const query = searchQuery.toLowerCase().trim();
  const gameName = game.name?.toLowerCase() || '';

  // Franchise significance patterns
  const significancePatterns = {
    // Mario franchise
    'super mario bros. 3': { score: 40, reason: 'Mario franchise peak (SMB3)' },
    'super mario 64': { score: 35, reason: '3D Mario revolution (N64)' },
    'super mario odyssey': { score: 25, reason: 'Modern Mario masterpiece' },
    'super mario world': { score: 30, reason: 'SNES Mario pinnacle' },
    'super mario galaxy': { score: 30, reason: 'Mario innovation (Galaxy)' },
    
    // Zelda franchise
    'ocarina of time': { score: 40, reason: 'Zelda 3D revolution (OOT)' },
    'breath of the wild': { score: 35, reason: 'Zelda open-world innovation' },
    'tears of the kingdom': { score: 30, reason: 'Modern Zelda masterpiece' },
    'a link to the past': { score: 35, reason: 'Zelda SNES pinnacle' },
    'majoras mask': { score: 25, reason: 'Zelda innovation (time mechanics)' },
    
    // Pokemon franchise
    'pokemon red': { score: 40, reason: 'Pokemon franchise originator' },
    'pokemon blue': { score: 40, reason: 'Pokemon franchise originator' },
    'pokemon gold': { score: 30, reason: 'Pokemon evolution (Gen 2)' },
    'pokemon silver': { score: 30, reason: 'Pokemon evolution (Gen 2)' },
    
    // Final Fantasy franchise
    'final fantasy vii': { score: 40, reason: 'FF cultural phenomenon (VII)' },
    'final fantasy vi': { score: 35, reason: 'FF SNES masterpiece (VI)' },
    'final fantasy x': { score: 30, reason: 'FF PS2 pinnacle (X)' },
    
    // Street Fighter
    'street fighter ii': { score: 40, reason: 'Fighting game revolution (SF2)' },
    'street fighter iii': { score: 30, reason: 'Fighting game artistry (3rd Strike)' },
    
    // Mega Man
    'mega man 2': { score: 35, reason: 'Mega Man series peak (2)' },
    'mega man x': { score: 30, reason: 'Mega Man evolution (X series)' }
  };

  // Check for significance patterns
  for (const [pattern, boost] of Object.entries(significancePatterns)) {
    if (gameName.includes(pattern) || pattern.includes(gameName)) {
      return boost;
    }
  }

  return { score: 0, reason: 'No franchise significance detected' };
}

/**
 * Apply all quality metrics to search results
 */
export function applyQualityMetrics(games: any[], searchQuery: string): any[] {
  return games.map(game => {
    const ratingBoost = calculateRatingBoost(game);
    const popularityBoost = calculatePopularityBoost(game);
    const significanceBoost = calculateFranchiseSignificanceBoost(game, searchQuery);
    
    if (ratingBoost.score > 0) {
      console.log(`⭐ Rating boost: "${game.name}" +${ratingBoost.score} (${ratingBoost.reason})`);
      (game as any)._ratingBoost = ratingBoost.score;
      (game as any)._ratingReason = ratingBoost.reason;
    }
    
    if (popularityBoost.score > 0) {
      console.log(`📈 Popularity boost: "${game.name}" +${popularityBoost.score} (${popularityBoost.reason})`);
      (game as any)._popularityBoost = popularityBoost.score;
      (game as any)._popularityReason = popularityBoost.reason;
    }
    
    if (significanceBoost.score > 0) {
      console.log(`🏆 Significance boost: "${game.name}" +${significanceBoost.score} (${significanceBoost.reason})`);
      (game as any)._significanceBoost = significanceBoost.score;
      (game as any)._significanceReason = significanceBoost.reason;
    }
    
    return game;
  });
}

/**
 * Calculate comprehensive quality score for a game
 */
export function calculateOverallQualityScore(game: any, searchQuery: string): number {
  const ratingBoost = calculateRatingBoost(game);
  const popularityBoost = calculatePopularityBoost(game);
  const significanceBoost = calculateFranchiseSignificanceBoost(game, searchQuery);

  return ratingBoost.score + popularityBoost.score + significanceBoost.score;
}