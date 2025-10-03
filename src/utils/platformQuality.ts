/**
 * Platform Quality Assessment
 *
 * Analyzes IGDB release_dates to determine platform quality scores
 * Used for deprioritizing games with rumored/unreleased platforms
 */

export interface IGDBReleaseDate {
  platform: number;
  status: number;
  date?: number;
  human?: string;
  region?: number;
  category?: number;
}

export interface IGDBPlatform {
  id: number;
  name: string;
}

export interface IGDBGameWithReleases {
  id?: number;
  name?: string;
  platforms?: IGDBPlatform[];
  release_dates?: IGDBReleaseDate[];
  first_release_date?: number;
}

/**
 * IGDB Release Status Codes
 */
export const RELEASE_STATUS = {
  RELEASED: 0,
  ALPHA: 1,
  BETA: 2,
  EARLY_ACCESS: 3,
  OFFLINE: 4,
  CANCELLED: 5,
  RUMORED: 6,
  DELISTED: 7
} as const;

export const RELEASE_STATUS_NAMES: { [key: number]: string } = {
  [RELEASE_STATUS.RELEASED]: 'Released',
  [RELEASE_STATUS.ALPHA]: 'Alpha',
  [RELEASE_STATUS.BETA]: 'Beta',
  [RELEASE_STATUS.EARLY_ACCESS]: 'Early Access',
  [RELEASE_STATUS.OFFLINE]: 'Offline',
  [RELEASE_STATUS.CANCELLED]: 'Cancelled',
  [RELEASE_STATUS.RUMORED]: 'Rumored',
  [RELEASE_STATUS.DELISTED]: 'Delisted'
};

/**
 * Platform quality score (0-100)
 * Higher = better quality (actual releases)
 * Lower = worse quality (rumored/cancelled)
 */
export interface PlatformQualityScore {
  score: number;
  hasReleased: boolean;
  hasRumored: boolean;
  hasCancelled: boolean;
  hasEarlyAccess: boolean;
  statusBreakdown: { [status: string]: number };
  debugInfo: string;
}

/**
 * Calculate quality score for a game's platforms
 *
 * Score breakdown:
 * - 100: All platforms released
 * - 75-99: Mix of released + early access/beta
 * - 50-74: Only early access/beta/alpha
 * - 25-49: Mix of released + rumored/cancelled
 * - 0-24: Only rumored/cancelled
 */
export function calculatePlatformQuality(game: IGDBGameWithReleases): PlatformQualityScore {
  const result: PlatformQualityScore = {
    score: 100, // Default: assume good quality
    hasReleased: false,
    hasRumored: false,
    hasCancelled: false,
    hasEarlyAccess: false,
    statusBreakdown: {},
    debugInfo: ''
  };

  // No platforms - neutral score
  if (!game.platforms || game.platforms.length === 0) {
    result.score = 50;
    result.debugInfo = 'No platforms';
    return result;
  }

  // No release_dates - assume released (fallback for older/incomplete data)
  if (!game.release_dates || game.release_dates.length === 0) {
    result.score = 90; // Slightly lower than 100 to deprioritize incomplete data
    result.hasReleased = true;
    result.debugInfo = `${game.platforms.length} platforms, no release_dates (assumed released)`;
    return result;
  }

  // Count status codes
  const statusCounts: { [key: number]: number } = {};
  game.release_dates.forEach(rd => {
    statusCounts[rd.status] = (statusCounts[rd.status] || 0) + 1;
  });

  // Build status breakdown for debugging
  Object.entries(statusCounts).forEach(([status, count]) => {
    const statusNum = parseInt(status);
    const statusName = RELEASE_STATUS_NAMES[statusNum] || `Unknown(${status})`;
    result.statusBreakdown[statusName] = count;
  });

  // Check for specific statuses
  result.hasReleased = statusCounts[RELEASE_STATUS.RELEASED] > 0;
  result.hasRumored = statusCounts[RELEASE_STATUS.RUMORED] > 0;
  result.hasCancelled = statusCounts[RELEASE_STATUS.CANCELLED] > 0;
  result.hasEarlyAccess = statusCounts[RELEASE_STATUS.EARLY_ACCESS] > 0 ||
                          statusCounts[RELEASE_STATUS.ALPHA] > 0 ||
                          statusCounts[RELEASE_STATUS.BETA] > 0;

  // Calculate score based on release status mix
  let score = 100;

  // Penalties for problematic statuses
  if (result.hasRumored) {
    score -= 30; // Major penalty for rumored platforms
  }

  if (result.hasCancelled) {
    score -= 25; // Major penalty for cancelled platforms
  }

  // Only has rumored/cancelled (no actual releases)
  if ((result.hasRumored || result.hasCancelled) && !result.hasReleased && !result.hasEarlyAccess) {
    score = 15; // Very low score - likely vaporware
  }

  // Only early access (not fully released)
  if (result.hasEarlyAccess && !result.hasReleased) {
    score = Math.max(score, 60); // Moderate score - in development
  }

  // Has some releases but also rumored
  if (result.hasReleased && (result.hasRumored || result.hasCancelled)) {
    score = Math.max(score, 50); // Mixed quality
  }

  // All released (ideal)
  if (result.hasReleased && !result.hasRumored && !result.hasCancelled) {
    score = 100;
  }

  result.score = Math.max(0, Math.min(100, score));

  // Build debug info
  const debugParts = [
    `${game.platforms.length} platforms`,
    `${game.release_dates.length} release_dates`,
    Object.entries(result.statusBreakdown)
      .map(([status, count]) => `${count} ${status}`)
      .join(', ')
  ];
  result.debugInfo = debugParts.join(', ');

  return result;
}

/**
 * Get descriptive label for platform quality
 */
export function getPlatformQualityLabel(score: number): string {
  if (score >= 90) return 'Released';
  if (score >= 70) return 'Released (some issues)';
  if (score >= 50) return 'In Development';
  if (score >= 25) return 'Partially Cancelled';
  return 'Rumored/Cancelled';
}

/**
 * Check if a game should be deprioritized based on platform quality
 *
 * Returns true if game has questionable release status (rumored/cancelled)
 */
export function shouldDeprioritizeGame(game: IGDBGameWithReleases): boolean {
  const quality = calculatePlatformQuality(game);
  return quality.score < 50; // Deprioritize if score below 50
}

/**
 * Get platform quality penalty for sorting
 * Returns a negative number to subtract from game priority score
 *
 * - Score 100: No penalty
 * - Score 50: -100 penalty
 * - Score 0: -200 penalty
 */
export function getPlatformQualityPenalty(game: IGDBGameWithReleases): number {
  const quality = calculatePlatformQuality(game);

  // Convert quality score (0-100) to penalty (0 to -200)
  // 100 quality = 0 penalty
  // 50 quality = -100 penalty
  // 0 quality = -200 penalty
  const penalty = (100 - quality.score) * 2;

  return penalty === 0 ? 0 : -penalty; // Fix -0 vs 0 issue
}

/**
 * Enhanced platform array with quality metadata for debugging
 */
export function getPlatformsWithQuality(game: IGDBGameWithReleases): {
  platforms: string[] | null;
  qualityScore: number;
  qualityLabel: string;
  debugInfo: string;
} {
  const quality = calculatePlatformQuality(game);

  return {
    platforms: game.platforms?.map(p => p.name) || null,
    qualityScore: quality.score,
    qualityLabel: getPlatformQualityLabel(quality.score),
    debugInfo: quality.debugInfo
  };
}
