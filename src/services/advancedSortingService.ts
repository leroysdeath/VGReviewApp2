/**
 * Advanced Sorting Service
 *
 * Implements weighted scoring algorithm for game search results
 * Uses external IGDB data: rating, likes (follows), buzz (hypes), franchise info
 */

import { sortingConfigService, SortingWeights } from './sortingConfigService';
import type { IGDBGame } from './igdbServiceV2';

export interface GameWithScore {
  game: IGDBGame;
  totalScore: number;
  scoreBreakdown: {
    nameMatch: number;
    rating: number;
    likes: number;
    buzz: number;
    franchiseImportance: number;
  };
  rawMetrics: {
    total_rating?: number;
    rating_count?: number;
    follows?: number;
    hypes?: number;
    isFranchiseMain?: boolean;
  };
}

class AdvancedSortingService {
  /**
   * Sort games using active configuration
   */
  sortGames(games: IGDBGame[], query: string): GameWithScore[] {
    const config = sortingConfigService.getActiveConfig();
    return this.sortGamesWithWeights(games, query, config.weights);
  }

  /**
   * Sort games with custom weights (for testing)
   */
  sortGamesWithWeights(
    games: IGDBGame[],
    query: string,
    weights: SortingWeights
  ): GameWithScore[] {
    const scoredGames = games.map(game => this.calculateGameScore(game, query, weights));

    // Sort by total score descending
    return scoredGames.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Calculate comprehensive score for a single game
   */
  private calculateGameScore(
    game: IGDBGame,
    query: string,
    weights: SortingWeights
  ): GameWithScore {
    const nameMatchScore = this.calculateNameMatchScore(game, query);
    const ratingScore = this.calculateRatingScore(game);
    const likesScore = this.calculateLikesScore(game);
    const buzzScore = this.calculateBuzzScore(game);
    const franchiseScore = this.calculateFranchiseScore(game, query);

    // Apply weights (convert percentages to decimals)
    const scoreBreakdown = {
      nameMatch: nameMatchScore * (weights.nameMatch / 100),
      rating: ratingScore * (weights.rating / 100),
      likes: likesScore * (weights.likes / 100),
      buzz: buzzScore * (weights.buzz / 100),
      franchiseImportance: franchiseScore * (weights.franchiseImportance / 100)
    };

    const totalScore = Object.values(scoreBreakdown).reduce((sum, score) => sum + score, 0);

    return {
      game,
      totalScore,
      scoreBreakdown,
      rawMetrics: {
        total_rating: game.total_rating,
        rating_count: game.total_rating_count,
        follows: game.follows,
        hypes: game.hypes,
        isFranchiseMain: this.isFranchiseMainEntry(game, query)
      }
    };
  }

  /**
   * Calculate name matching score (0-100)
   */
  private calculateNameMatchScore(game: IGDBGame, query: string): number {
    const q = query.toLowerCase().trim();
    const name = (game.name || '').toLowerCase();

    // Exact match
    if (name === q) return 100;

    // Starts with query
    if (name.startsWith(q)) return 80;

    // Contains query as whole word
    const words = name.split(/\s+/);
    if (words.some(word => word === q)) return 70;

    // Contains query
    if (name.includes(q)) return 60;

    // Query words in name
    const queryWords = q.split(/\s+/).filter(w => w.length > 2);
    const nameWords = words;
    const matchedWords = queryWords.filter(qw =>
      nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
    );

    if (matchedWords.length > 0) {
      const matchRatio = matchedWords.length / queryWords.length;
      return 40 + (matchRatio * 20); // 40-60 points
    }

    // Alternative names
    if (game.alternative_names) {
      for (const alt of game.alternative_names) {
        const altName = (alt.name || '').toLowerCase();
        if (altName.includes(q)) return 50;
      }
    }

    return 0;
  }

  /**
   * Calculate rating score (0-100)
   * Combines total_rating (0-100 scale) with rating volume
   */
  private calculateRatingScore(game: IGDBGame): number {
    const rating = game.total_rating || 0; // 0-100
    const ratingCount = game.total_rating_count || 0;

    // Base score from rating itself (max 55 points)
    let score = 0;
    if (rating >= 90) {
      score += 45 + ((rating - 90) * 0.5); // 45-50 points
    } else if (rating >= 80) {
      score += 35 + (rating - 80); // 35-45 points
    } else if (rating >= 70) {
      score += 20 + ((rating - 70) * 1.5); // 20-35 points
    } else {
      score += rating * 0.285; // 0-20 points
    }

    // Bonus from rating volume (max 45 points)
    if (ratingCount >= 1000) {
      score += 35 + Math.min((ratingCount - 1000) / 100, 10); // 35-45 points
    } else if (ratingCount >= 500) {
      score += 28 + ((ratingCount - 500) / 71.4); // 28-35 points
    } else if (ratingCount >= 200) {
      score += 20 + ((ratingCount - 200) / 37.5); // 20-28 points
    } else if (ratingCount >= 50) {
      score += 10 + ((ratingCount - 50) / 15); // 10-20 points
    } else {
      score += ratingCount / 5; // 0-10 points
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate likes/follows score (0-100)
   * Based on IGDB follows count
   */
  private calculateLikesScore(game: IGDBGame): number {
    const follows = game.follows || 0;

    // Tiered scoring based on follows
    if (follows >= 10000) {
      return 90 + Math.min((follows - 10000) / 1000, 10); // 90-100 points
    } else if (follows >= 5000) {
      return 75 + ((follows - 5000) / 333.3); // 75-90 points
    } else if (follows >= 2000) {
      return 60 + ((follows - 2000) / 200); // 60-75 points
    } else if (follows >= 1000) {
      return 45 + ((follows - 1000) / 66.7); // 45-60 points
    } else if (follows >= 500) {
      return 30 + ((follows - 500) / 33.3); // 30-45 points
    } else if (follows >= 100) {
      return 15 + ((follows - 100) / 26.7); // 15-30 points
    } else {
      return follows / 6.67; // 0-15 points
    }
  }

  /**
   * Calculate buzz/hypes score (0-100)
   * Based on IGDB hypes count (pre-release excitement)
   */
  private calculateBuzzScore(game: IGDBGame): number {
    const hypes = game.hypes || 0;

    // Tiered scoring based on hypes
    // Hypes are typically lower than follows, so thresholds are adjusted
    if (hypes >= 1000) {
      return 90 + Math.min((hypes - 1000) / 100, 10); // 90-100 points
    } else if (hypes >= 500) {
      return 75 + ((hypes - 500) / 33.3); // 75-90 points
    } else if (hypes >= 200) {
      return 60 + ((hypes - 200) / 20); // 60-75 points
    } else if (hypes >= 100) {
      return 45 + ((hypes - 100) / 6.67); // 45-60 points
    } else if (hypes >= 50) {
      return 30 + ((hypes - 50) / 3.33); // 30-45 points
    } else if (hypes >= 10) {
      return 15 + ((hypes - 10) / 2.67); // 15-30 points
    } else {
      return hypes * 1.5; // 0-15 points
    }
  }

  /**
   * Calculate franchise importance score (0-100)
   * Main entries and first in series get higher scores
   */
  private calculateFranchiseScore(game: IGDBGame, query: string): number {
    let score = 0;

    // Check if this is a main franchise entry (not DLC, expansion, etc.)
    const category = game.category;
    const isMainGame = category === 0; // Main game
    const isStandalone = category === 10; // Standalone expansion

    if (!isMainGame && !isStandalone) {
      return 0; // DLC, expansions get no franchise bonus
    }

    score += 30; // Base score for being a main entry

    // Bonus if this matches the franchise name
    if (this.isFranchiseMainEntry(game, query)) {
      score += 40;
    }

    // Bonus for being first in series (based on release date)
    if (game.first_release_date) {
      const releaseYear = new Date(game.first_release_date * 1000).getFullYear();

      // Earlier releases in a franchise are often more important
      if (game.franchise || game.franchises) {
        const name = game.name.toLowerCase();

        // Simple heuristic: if name contains just franchise name or has "1" or "I"
        if (
          name.match(/\b1\b/) ||
          name.match(/\bi\b(?!\w)/) ||
          name.match(/:\s*the\s*(first|beginning|origin)/)
        ) {
          score += 30; // Likely first in series
        }
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Check if game is the main entry for a franchise query
   */
  private isFranchiseMainEntry(game: IGDBGame, query: string): boolean {
    const q = query.toLowerCase().trim();
    const name = (game.name || '').toLowerCase();
    const franchiseName = (game.franchise?.name || '').toLowerCase();

    // If query matches franchise name and game name is close to franchise name
    if (franchiseName && q.includes(franchiseName)) {
      // Game name is just the franchise name (e.g., "Pokemon" when searching "pokemon")
      if (name === franchiseName) return true;

      // Game name is franchise + simple addition (e.g., "Pokemon Red" when searching "pokemon")
      if (name.startsWith(franchiseName) && name.length - franchiseName.length < 15) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get human-readable score explanation
   */
  getScoreExplanation(scoredGame: GameWithScore): string[] {
    const explanations: string[] = [];
    const { scoreBreakdown, rawMetrics } = scoredGame;

    if (scoreBreakdown.nameMatch > 0) {
      explanations.push(
        `Name Match: ${scoreBreakdown.nameMatch.toFixed(1)} points`
      );
    }

    if (scoreBreakdown.rating > 0) {
      explanations.push(
        `Rating: ${scoreBreakdown.rating.toFixed(1)} points (${rawMetrics.total_rating?.toFixed(0) || 0}/100 with ${rawMetrics.rating_count || 0} reviews)`
      );
    }

    if (scoreBreakdown.likes > 0) {
      explanations.push(
        `Likes: ${scoreBreakdown.likes.toFixed(1)} points (${rawMetrics.follows?.toLocaleString() || 0} follows)`
      );
    }

    if (scoreBreakdown.buzz > 0) {
      explanations.push(
        `Buzz: ${scoreBreakdown.buzz.toFixed(1)} points (${rawMetrics.hypes?.toLocaleString() || 0} hypes)`
      );
    }

    if (scoreBreakdown.franchiseImportance > 0) {
      explanations.push(
        `Franchise: ${scoreBreakdown.franchiseImportance.toFixed(1)} points${rawMetrics.isFranchiseMain ? ' (main entry)' : ''}`
      );
    }

    return explanations;
  }
}

// Export singleton instance
export const advancedSortingService = new AdvancedSortingService();
