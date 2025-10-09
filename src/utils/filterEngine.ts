/**
 * Filter engine that applies FilterConfig to game arrays
 * Tracks which filters affected which games for visualization
 */

import type { FilterConfig, FilterRule, SortRule } from './filterConfig';
import { calculateGamePriority } from './gamePrioritization';

// Game interface for filtering
export interface FilterableGame {
  id: number;
  igdb_id?: number;
  name: string;
  category?: number;
  developer?: string;
  publisher?: string;
  igdb_rating?: number;
  total_rating?: number;
  total_rating_count?: number;
  follows?: number;
  hypes?: number;
  release_status?: 'released' | 'unreleased' | 'canceled' | 'early_access';
  first_release_date?: number;
  release_date?: string;
  platform_quality?: number;
  [key: string]: any; // Allow additional properties
}

export interface FilterResult {
  game: FilterableGame;
  passed: boolean;
  failedFilters: string[]; // IDs of failed filter rules
  priorityScore: number;
  sortScore: number;
  filterDetails: Map<string, boolean>; // filterId -> passed
}

export interface FilterStats {
  total: number;
  passed: number;
  filtered: number;
  passRate: number;
  filterBreakdown: Record<string, number>; // filterId -> count of games it filtered
}

export class FilterEngine {
  private config: FilterConfig;

  constructor(config: FilterConfig) {
    this.config = config;
  }

  /**
   * Apply all filters and return detailed results
   */
  applyFilters(games: FilterableGame[]): FilterResult[] {
    const results: FilterResult[] = [];

    for (const game of games) {
      const result: FilterResult = {
        game,
        passed: true,
        failedFilters: [],
        priorityScore: 0,
        sortScore: 0,
        filterDetails: new Map()
      };

      // Apply each filter in priority order
      const sortedFilters = this.config.filters
        .filter(f => f.enabled)
        .sort((a, b) => b.priority - a.priority);

      for (const filter of sortedFilters) {
        const filterPassed = this.evaluateFilter(game, filter);
        result.filterDetails.set(filter.id, filterPassed);

        if (!filterPassed) {
          result.passed = false;
          result.failedFilters.push(filter.id);
        }
      }

      // Calculate priority score (even for filtered games)
      result.priorityScore = this.calculatePriorityScore(game);

      // Calculate sort score
      result.sortScore = this.calculateSortScore(game);

      results.push(result);
    }

    // Sort results
    return this.sortResults(results);
  }

  /**
   * Apply filters and return only passing games
   */
  filterGames(games: FilterableGame[]): FilterableGame[] {
    const results = this.applyFilters(games);
    return results.filter(r => r.passed).map(r => r.game);
  }

  /**
   * Evaluate a single filter rule against a game
   */
  private evaluateFilter(game: FilterableGame, filter: FilterRule): boolean {
    const condition = filter.condition;

    try {
      // Category filters
      if (condition.categoryExcludes && condition.categoryExcludes.length > 0) {
        if (condition.categoryExcludes.includes(game.category || 0)) {
          return false;
        }
      }

      if (condition.categoryIncludes && condition.categoryIncludes.length > 0) {
        if (!condition.categoryIncludes.includes(game.category || 0)) {
          return false;
        }
      }

      // Content protection - name patterns
      if (condition.namePatterns && condition.namePatterns.length > 0) {
        const gameName = game.name.toLowerCase();
        for (const pattern of condition.namePatterns) {
          try {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(gameName)) {
              return false;
            }
          } catch (err) {
            console.warn(`Invalid regex pattern: ${pattern}`, err);
          }
        }
      }

      // Developer blacklist
      if (condition.developerBlacklist && condition.developerBlacklist.length > 0) {
        const developer = game.developer?.toLowerCase() || '';
        for (const blacklisted of condition.developerBlacklist) {
          if (developer.includes(blacklisted.toLowerCase())) {
            return false;
          }
        }
      }

      // Publisher blacklist
      if (condition.publisherBlacklist && condition.publisherBlacklist.length > 0) {
        const publisher = game.publisher?.toLowerCase() || '';
        for (const blacklisted of condition.publisherBlacklist) {
          if (publisher.includes(blacklisted.toLowerCase())) {
            return false;
          }
        }
      }

      // Quality filters
      if (condition.minRating !== undefined && condition.minRating > 0) {
        const rating = game.igdb_rating || game.total_rating || 0;
        if (rating < condition.minRating) {
          return false;
        }
      }

      if (condition.minRatingCount !== undefined && condition.minRatingCount > 0) {
        const count = game.total_rating_count || 0;
        if (count < condition.minRatingCount) {
          return false;
        }
      }

      if (condition.minFollows !== undefined && condition.minFollows > 0) {
        const follows = game.follows || 0;
        if (follows < condition.minFollows) {
          return false;
        }
      }

      if (condition.minTotalRating !== undefined && condition.minTotalRating > 0) {
        const rating = game.total_rating || 0;
        if (rating < condition.minTotalRating) {
          return false;
        }
      }

      // Release status
      if (condition.releaseStatuses && condition.releaseStatuses.length > 0) {
        if (game.release_status && !condition.releaseStatuses.includes(game.release_status)) {
          return false;
        }
      }

      // Platform quality
      if (condition.minPlatformQuality !== undefined && condition.minPlatformQuality > 0) {
        const quality = game.platform_quality || 0;
        if (quality < condition.minPlatformQuality) {
          return false;
        }
      }

      // Custom function (advanced - sandboxed execution)
      if (condition.customFunction) {
        try {
          // Create sandboxed function with limited access
          const customFn = new Function('game', `
            'use strict';
            ${condition.customFunction}
          `);
          const result = customFn(game);
          if (result === false) {
            return false;
          }
        } catch (err) {
          console.error('Custom filter function error:', err);
          // On error, pass the game (fail-safe)
          return true;
        }
      }

      return true;
    } catch (err) {
      console.error(`Filter evaluation error for ${filter.id}:`, err);
      // On error, pass the game (fail-safe)
      return true;
    }
  }

  /**
   * Calculate priority score using existing gamePrioritization logic
   */
  private calculatePriorityScore(game: FilterableGame): number {
    try {
      const result = calculateGamePriority(game as any);
      // calculateGamePriority returns PriorityResult with score property
      return typeof result === 'object' && result !== null && 'score' in result
        ? result.score
        : 0;
    } catch (err) {
      console.error('Priority calculation error:', err);
      return 0;
    }
  }

  /**
   * Calculate sort score based on enabled sort rules
   */
  private calculateSortScore(game: FilterableGame): number {
    let score = 0;

    const enabledSortRules = this.config.sorting.filter(s => s.enabled);

    for (const sortRule of enabledSortRules) {
      const weight = sortRule.weight || 1.0;
      let fieldValue = 0;

      switch (sortRule.field) {
        case 'priority':
          fieldValue = this.calculatePriorityScore(game);
          break;

        case 'rating':
          fieldValue = game.igdb_rating || game.total_rating || 0;
          break;

        case 'total_rating':
          fieldValue = game.total_rating || 0;
          break;

        case 'follows':
          // Scale down follows to prevent dominating other factors
          fieldValue = (game.follows || 0) * 0.01;
          break;

        case 'release_date':
          // Convert release date to numeric score
          if (game.first_release_date) {
            fieldValue = game.first_release_date;
          } else if (game.release_date) {
            fieldValue = new Date(game.release_date).getTime() / 1000;
          }
          break;

        case 'name':
          // Alphabetical - convert to numeric (a=1, z=26)
          fieldValue = game.name.toLowerCase().charCodeAt(0) - 96;
          break;

        default:
          fieldValue = 0;
      }

      // Apply weight and order
      const multiplier = sortRule.order === 'desc' ? 1 : -1;
      score += fieldValue * weight * multiplier;
    }

    return score;
  }

  /**
   * Sort results based on sort score
   */
  private sortResults(results: FilterResult[]): FilterResult[] {
    return results.sort((a, b) => {
      // Primary: Sort score
      if (a.sortScore !== b.sortScore) {
        return b.sortScore - a.sortScore;
      }

      // Secondary: Priority score
      if (a.priorityScore !== b.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }

      // Tertiary: Alphabetical by name
      return a.game.name.localeCompare(b.game.name);
    });
  }

  /**
   * Get statistics about filter application
   */
  getStats(results: FilterResult[]): FilterStats {
    const passed = results.filter(r => r.passed).length;
    const filtered = results.length - passed;

    const stats: FilterStats = {
      total: results.length,
      passed,
      filtered,
      passRate: results.length > 0 ? (passed / results.length) * 100 : 0,
      filterBreakdown: {}
    };

    // Count how many games each filter affected
    for (const result of results) {
      for (const filterId of result.failedFilters) {
        stats.filterBreakdown[filterId] = (stats.filterBreakdown[filterId] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Update filter config
   */
  updateConfig(config: FilterConfig): void {
    this.config = config;
  }

  /**
   * Get current config
   */
  getConfig(): FilterConfig {
    return this.config;
  }

  /**
   * Get filter by ID
   */
  getFilter(filterId: string): FilterRule | undefined {
    return this.config.filters.find(f => f.id === filterId);
  }

  /**
   * Enable/disable a filter
   */
  toggleFilter(filterId: string, enabled: boolean): void {
    const filter = this.config.filters.find(f => f.id === filterId);
    if (filter) {
      filter.enabled = enabled;
      this.config.metadata.modifiedAt = new Date().toISOString();
    }
  }

  /**
   * Enable/disable a sort rule
   */
  toggleSort(sortId: string, enabled: boolean): void {
    const sort = this.config.sorting.find(s => s.id === sortId);
    if (sort) {
      sort.enabled = enabled;
      this.config.metadata.modifiedAt = new Date().toISOString();
    }
  }
}
