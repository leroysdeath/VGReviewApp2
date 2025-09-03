/**
 * Algorithmic Game Quality Scoring System
 * 
 * Automatically identifies important games without manual curation
 * by analyzing IGDB metadata signals and anti-patterns.
 */

interface IGDBGame {
  id: number;
  name: string;
  category?: number;
  rating?: number;
  rating_count?: number;
  total_rating?: number;
  total_rating_count?: number;
  first_release_date?: number;
  parent_game?: number;
  platforms?: Array<{ id: number; name: string }>;
  involved_companies?: Array<{
    company: { name: string };
    developer?: boolean;
    publisher?: boolean;
  }>;
}

interface QualityScore {
  score: number;
  reasons: string[];
  isHighQuality: boolean;
  isOriginal: boolean;
  isProbablyMod: boolean;
}

/**
 * Calculate comprehensive quality score for a game
 */
export function calculateGameQuality(game: IGDBGame): QualityScore {
  let score = 0;
  const reasons: string[] = [];
  
  // Base quality signals from IGDB data
  if (game.rating && game.rating > 85) {
    score += 100;
    reasons.push(`High IGDB rating (${game.rating.toFixed(1)})`);
  }
  
  if (game.total_rating && game.total_rating > 80) {
    score += 80;
    reasons.push(`High total rating (${game.total_rating.toFixed(1)})`);
  }
  
  if (game.rating_count && game.rating_count > 500) {
    score += 50;
    reasons.push(`High rating count (${game.rating_count})`);
  }
  
  if (game.total_rating_count && game.total_rating_count > 200) {
    score += 40;
    reasons.push(`High total rating count (${game.total_rating_count})`);
  }
  
  // Original vs derivative detection
  const isOriginal = !game.parent_game;
  if (isOriginal) {
    score += 50;
    reasons.push('Original game (not a remake/port)');
  }
  
  // Main game category bonus
  if (game.category === 0) {
    score += 30;
    reasons.push('Main game category');
  }
  
  // Age bonus for classics (games before 2000)
  if (game.first_release_date) {
    const releaseYear = new Date(game.first_release_date * 1000).getFullYear();
    if (releaseYear < 2000) {
      score += 25;
      reasons.push(`Classic game (${releaseYear})`);
    }
  }
  
  // Anti-patterns (subtract points)
  const isProbablyMod = detectModContent(game);
  if (isProbablyMod) {
    score -= 200;
    reasons.push('Detected as mod/fan content');
  }
  
  if (hasRemasterKeywords(game.name)) {
    score -= 20;
    reasons.push('Remaster/special edition (lower priority than original)');
  }
  
  if (game.category === 5) {
    score -= 150;
    reasons.push('IGDB Category 5 (Mod)');
  }
  
  if (game.category === 3) {
    score -= 100;
    reasons.push('IGDB Category 3 (Bundle/Pack)');
  }
  
  if (game.category === 7) {
    score -= 100;
    reasons.push('IGDB Category 7 (Season)');
  }
  
  // Platform significance bonus
  const platformBonus = calculatePlatformSignificance(game.platforms);
  if (platformBonus > 0) {
    score += platformBonus;
    reasons.push(`Platform significance bonus (+${platformBonus})`);
  }
  
  return {
    score,
    reasons,
    isHighQuality: score >= 100,
    isOriginal,
    isProbablyMod
  };
}

/**
 * Detect if a game is likely mod/fan content
 */
function detectModContent(game: IGDBGame): boolean {
  const name = game.name.toLowerCase();
  
  // Strong mod indicators
  const modKeywords = [
    'randomizer', 'rom hack', 'romhack', 'mod', 'hack',
    'fan game', 'fan made', 'homebrew', 'rewritten',
    'custom', 'community', 'project', 'redux'
  ];
  
  const hasModKeyword = modKeywords.some(keyword => name.includes(keyword));
  
  // Developer/publisher indicators
  const developer = game.involved_companies?.find(c => c.developer)?.company?.name?.toLowerCase() || '';
  const publisher = game.involved_companies?.find(c => c.publisher)?.company?.name?.toLowerCase() || '';
  
  const fanDeveloperKeywords = [
    'fan', 'community', 'homebrew', 'modding', 'rom', 'hack',
    'indie team', 'fan team', 'modder', 'fan developer'
  ];
  
  const hasFanDeveloper = fanDeveloperKeywords.some(keyword => 
    developer.includes(keyword) || publisher.includes(keyword)
  );
  
  return hasModKeyword || hasFanDeveloper;
}

/**
 * Detect remaster/special edition keywords
 */
function hasRemasterKeywords(name: string): boolean {
  const remasterKeywords = [
    'hd', '3d', 'remaster', 'remastered', 'special edition',
    'limited edition', 'definitive edition', 'enhanced edition',
    'goty', 'complete edition', 'ultimate edition'
  ];
  
  const nameLower = name.toLowerCase();
  return remasterKeywords.some(keyword => nameLower.includes(keyword));
}

/**
 * Calculate platform significance bonus
 */
function calculatePlatformSignificance(platforms?: Array<{ id: number; name: string }>): number {
  if (!platforms || platforms.length === 0) return 0;
  
  let maxBonus = 0;
  
  for (const platform of platforms) {
    const platformName = platform.name.toLowerCase();
    
    // Historic significant platforms
    if (platformName.includes('nes')) maxBonus = Math.max(maxBonus, 30);
    if (platformName.includes('snes')) maxBonus = Math.max(maxBonus, 30);
    if (platformName.includes('nintendo 64')) maxBonus = Math.max(maxBonus, 25);
    if (platformName.includes('playstation') && !platformName.includes('2')) maxBonus = Math.max(maxBonus, 25);
    
    // Modern significant platforms
    if (platformName.includes('nintendo switch')) maxBonus = Math.max(maxBonus, 20);
    if (platformName.includes('playstation 5')) maxBonus = Math.max(maxBonus, 15);
    if (platformName.includes('xbox series')) maxBonus = Math.max(maxBonus, 15);
  }
  
  return maxBonus;
}

/**
 * Find the highest quality original version from a list of games
 */
export function findBestOriginalVersion(games: IGDBGame[]): IGDBGame | null {
  if (games.length === 0) return null;
  
  // Score all games and sort by quality
  const scoredGames = games
    .map(game => ({
      game,
      quality: calculateGameQuality(game)
    }))
    .filter(item => !item.quality.isProbablyMod) // Exclude obvious mods
    .sort((a, b) => {
      // Prioritize originals over remakes
      if (a.quality.isOriginal !== b.quality.isOriginal) {
        return a.quality.isOriginal ? -1 : 1;
      }
      // Then by quality score
      return b.quality.score - a.quality.score;
    });
  
  return scoredGames.length > 0 ? scoredGames[0].game : null;
}

/**
 * Boost original versions over remakes in search results
 */
export function prioritizeOriginalVersions(games: IGDBGame[]): IGDBGame[] {
  // Group games by likely base name (remove HD, 3D, etc.)
  const gameGroups: Map<string, IGDBGame[]> = new Map();
  
  games.forEach(game => {
    const baseName = game.name
      .toLowerCase()
      .replace(/\s+(hd|3d|remaster|special edition|limited edition).*$/, '')
      .replace(/:\s*the\s+/, ': ')
      .trim();
    
    if (!gameGroups.has(baseName)) {
      gameGroups.set(baseName, []);
    }
    gameGroups.get(baseName)!.push(game);
  });
  
  // For each group, prioritize the best original version
  const result: IGDBGame[] = [];
  
  gameGroups.forEach(groupGames => {
    if (groupGames.length === 1) {
      result.push(groupGames[0]);
    } else {
      // Multiple versions exist - prioritize original
      const bestOriginal = findBestOriginalVersion(groupGames);
      if (bestOriginal) {
        result.push(bestOriginal);
        // Add other versions after the original
        groupGames
          .filter(g => g.id !== bestOriginal.id)
          .forEach(g => result.push(g));
      } else {
        // No clear original found, keep all
        result.push(...groupGames);
      }
    }
  });
  
  return result;
}

/**
 * Apply quality-based sorting to search results
 */
export function sortByGameQuality(games: IGDBGame[], query?: string): IGDBGame[] {
  return games
    .map(game => ({
      game,
      quality: calculateGameQuality(game)
    }))
    .sort((a, b) => {
      // First, separate high quality from low quality
      if (a.quality.isHighQuality !== b.quality.isHighQuality) {
        return a.quality.isHighQuality ? -1 : 1;
      }
      
      // Within same quality tier, sort by score
      return b.quality.score - a.quality.score;
    })
    .map(item => item.game);
}