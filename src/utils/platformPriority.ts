// src/utils/platformPriority.ts

// Platform priority constants
export const PC_PLATFORMS = [
  'PC (Microsoft Windows)',
  'Mac',
  'Linux'
];

export const CONSOLE_PLATFORMS = [
  // PlayStation family
  'PlayStation',
  'PlayStation 2', 
  'PlayStation 3',
  'PlayStation 4',
  'PlayStation 5',
  'PSP',
  'PlayStation Vita',
  
  // Xbox family  
  'Xbox',
  'Xbox 360',
  'Xbox One',
  'Xbox Series X',
  'Xbox Series S',
  
  // Nintendo consoles
  'NES',
  'SNES', 
  'Nintendo 64',
  'GameCube',
  'Wii',
  'Wii U',
  'Nintendo Switch',
  'Nintendo Switch 2',
  
  // Nintendo handhelds (considered console for our purposes)
  'Game Boy',
  'Game Boy Color',
  'Game Boy Advance',
  'Nintendo DS',
  'Nintendo 3DS',
  'Virtual Boy'
];

// Lower priority platforms (mobile, web, etc.)
export const MOBILE_PLATFORMS = [
  'iOS',
  'Android',
  'Windows Phone',
  'BlackBerry OS',
  'Palm OS',
  'Symbian',
  'Web browser',
  'Ouya',
  'Amazon Fire TV'
];

// All high-priority platforms (PC + Console)
export const HIGH_PRIORITY_PLATFORMS = [...PC_PLATFORMS, ...CONSOLE_PLATFORMS];

/**
 * Check if a game has any high-priority platforms (PC or console)
 */
export function hasHighPriorityPlatform(game: any): boolean {
  if (!game.platforms || !Array.isArray(game.platforms)) {
    return false;
  }
  
  const platformNames = game.platforms.map((p: any) => 
    typeof p === 'string' ? p : p.name
  );
  
  return platformNames.some((platformName: string) => 
    HIGH_PRIORITY_PLATFORMS.includes(platformName)
  );
}

/**
 * Check if a game is PC-only 
 */
export function isPCGame(game: any): boolean {
  if (!game.platforms || !Array.isArray(game.platforms)) {
    return false;
  }
  
  const platformNames = game.platforms.map((p: any) => 
    typeof p === 'string' ? p : p.name
  );
  
  return platformNames.some((platformName: string) => 
    PC_PLATFORMS.includes(platformName)
  );
}

/**
 * Check if a game is console-only
 */
export function isConsoleGame(game: any): boolean {
  if (!game.platforms || !Array.isArray(game.platforms)) {
    return false;
  }
  
  const platformNames = game.platforms.map((p: any) => 
    typeof p === 'string' ? p : p.name
  );
  
  return platformNames.some((platformName: string) => 
    CONSOLE_PLATFORMS.includes(platformName)
  );
}

/**
 * Check if a game is mobile-only (no PC or console versions)
 */
export function isMobileOnlyGame(game: any): boolean {
  if (!game.platforms || !Array.isArray(game.platforms)) {
    return false;
  }
  
  const platformNames = game.platforms.map((p: any) => 
    typeof p === 'string' ? p : p.name
  );
  
  // Check if it has mobile platforms
  const hasMobile = platformNames.some((platformName: string) => 
    MOBILE_PLATFORMS.includes(platformName)
  );
  
  // Check if it has any high priority platforms
  const hasHighPriority = platformNames.some((platformName: string) => 
    HIGH_PRIORITY_PLATFORMS.includes(platformName)
  );
  
  // Return true only if it has mobile platforms but no high priority platforms
  return hasMobile && !hasHighPriority;
}

/**
 * Check if a game has a meaningful description
 */
export function hasDescription(game: any): boolean {
  const description = game.summary || game.description || '';
  // Consider meaningful if it has more than 10 characters (to filter out empty or placeholder text)
  return typeof description === 'string' && description.trim().length > 10;
}

/**
 * Get platform priority score for sorting (higher = better priority)
 * 3 = PC + Console (cross-platform)
 * 2 = PC only or Console only  
 * 1 = Mobile with some PC/Console
 * 0 = Mobile only or unknown
 */
export function getPlatformPriorityScore(game: any): number {
  if (!game.platforms || !Array.isArray(game.platforms)) {
    return 0;
  }
  
  const platformNames = game.platforms.map((p: any) => 
    typeof p === 'string' ? p : p.name
  );
  
  const hasPC = platformNames.some((name: string) => PC_PLATFORMS.includes(name));
  const hasConsole = platformNames.some((name: string) => CONSOLE_PLATFORMS.includes(name));
  const hasMobile = platformNames.some((name: string) => MOBILE_PLATFORMS.includes(name));
  
  // Cross-platform (PC + Console) gets highest priority
  if (hasPC && hasConsole) {
    return 3;
  }
  
  // PC only or Console only gets high priority
  if (hasPC || hasConsole) {
    return 2;
  }
  
  // Has some mobile but mixed with other platforms
  if (hasMobile && platformNames.length > 1) {
    return 1;
  }
  
  // Mobile only or unknown platforms
  return 0;
}

/**
 * Get composite priority score that combines description and platform priority
 * Higher score = better priority
 * 
 * Scoring system:
 * - Has Description + Platform Score: 10 + platform_score
 * - No Description + Platform Score: 0 + platform_score
 * 
 * This ensures games with descriptions always rank higher than games without,
 * while maintaining platform-based sorting within each group.
 */
export function getCompositePriorityScore(game: any): number {
  const platformScore = getPlatformPriorityScore(game);
  const descriptionBonus = hasDescription(game) ? 10 : 0;
  
  return descriptionBonus + platformScore;
}

/**
 * Sort games by composite priority (description + platform) while preserving other sorting criteria
 * Games with descriptions appear first, then sorted by platform priority within each group
 */
export function sortGamesByPlatformPriority(games: any[]): any[] {
  return [...games].sort((a, b) => {
    const scoreA = getCompositePriorityScore(a);
    const scoreB = getCompositePriorityScore(b);
    
    // Primary sort: Composite priority (description + platform, higher score first)
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    
    // Secondary sort: Rating (higher first)
    const ratingA = a.rating || 0;
    const ratingB = b.rating || 0;
    if (ratingA !== ratingB) {
      return ratingB - ratingA;
    }
    
    // Tertiary sort: Name alphabetically
    const nameA = (a.name || a.title || '').toLowerCase();
    const nameB = (b.name || b.title || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

/**
 * Filter games to only show high-priority platforms (PC/Console)
 */
export function filterHighPriorityGames(games: any[]): any[] {
  return games.filter(game => hasHighPriorityPlatform(game));
}

/**
 * Get platform type description for UI display
 */
export function getPlatformTypeDescription(game: any): string {
  if (!game.platforms || !Array.isArray(game.platforms)) {
    return 'Unknown platforms';
  }
  
  const platformScore = getPlatformPriorityScore(game);
  const hasDesc = hasDescription(game);
  const hasPC = isPCGame(game);
  const hasConsole = isConsoleGame(game);
  
  let platformDesc = '';
  switch (platformScore) {
    case 3:
      platformDesc = 'PC & Console';
      break;
    case 2:
      platformDesc = hasPC ? 'PC' : 'Console';
      break;
    case 1:
      platformDesc = 'Multi-platform';
      break;
    case 0:
      platformDesc = isMobileOnlyGame(game) ? 'Mobile only' : 'Other platforms';
      break;
    default:
      platformDesc = 'Unknown';
  }
  
  return hasDesc ? `${platformDesc} (with description)` : platformDesc;
}

/**
 * Advanced Platform Boost System
 */

interface PlatformBoost {
  score: number;
  reason: string;
}

/**
 * Detailed platform scoring for franchise-specific optimization
 */
const ADVANCED_PLATFORM_SCORES: Record<string, number> = {
  // Nintendo platforms (high priority for Nintendo franchises)
  'Nintendo Switch': 100,
  'Nintendo 64': 95,
  'Super Nintendo Entertainment System': 95,
  'Nintendo Entertainment System': 90,
  'SNES': 95,
  'NES': 90,
  'Game Boy Advance': 85,
  'GameCube': 85,
  'Wii': 80,
  'Game Boy': 80,
  'Nintendo DS': 75,
  'Wii U': 70,
  'Nintendo 3DS': 70,
  
  // PlayStation platforms
  'PlayStation 5': 90,
  'PlayStation 4': 85,
  'PlayStation 3': 80,
  'PlayStation 2': 90, // Iconic generation
  'PlayStation': 85,
  'PlayStation Portable': 75,
  'PSP': 75,
  'PlayStation Vita': 70,
  
  // Xbox platforms
  'Xbox Series X/S': 85,
  'Xbox Series X': 85,
  'Xbox Series S': 85,
  'Xbox One': 80,
  'Xbox 360': 85, // Iconic generation
  'Xbox': 80,
  
  // PC platforms
  'PC (Microsoft Windows)': 85,
  'Mac': 80,
  'Linux': 80,
  
  // Sega platforms
  'Genesis/Mega Drive': 85,
  'Dreamcast': 80,
  'Saturn': 75,
  'Game Gear': 70,
  
  // Other platforms
  'Arcade': 90, // High priority for fighting/classic games
  'Neo Geo': 85,
  'TurboGrafx-16': 80,
  
  // Mobile (lower priority)
  'iOS': 40,
  'Android': 40
};

/**
 * Franchise-specific platform preferences
 */
const FRANCHISE_PLATFORM_PREFERENCES: Record<string, Record<string, number>> = {
  mario: {
    'Nintendo Switch': 120,
    'Nintendo 64': 110,
    'Super Nintendo Entertainment System': 110,
    'SNES': 110,
    'Nintendo Entertainment System': 105,
    'NES': 105,
    'GameCube': 100,
    'Game Boy Advance': 95,
    'Wii': 90
  },
  zelda: {
    'Nintendo Switch': 120,
    'Nintendo 64': 115,
    'Super Nintendo Entertainment System': 110,
    'SNES': 110,
    'GameCube': 105,
    'Wii': 100,
    'Nintendo Entertainment System': 95,
    'NES': 95
  },
  pokemon: {
    'Nintendo Switch': 115,
    'Game Boy': 110,
    'Nintendo DS': 110,
    'Game Boy Advance': 105,
    'Nintendo 3DS': 100
  },
  'final fantasy': {
    'PlayStation': 110,
    'PlayStation 2': 110,
    'PlayStation 3': 105,
    'PlayStation 4': 105,
    'Super Nintendo Entertainment System': 105,
    'SNES': 105,
    'Nintendo Entertainment System': 100,
    'NES': 100
  },
  'street fighter': {
    'Arcade': 120,
    'PlayStation 2': 110,
    'PlayStation 4': 105,
    'Nintendo Switch': 100
  }
};

/**
 * Calculate advanced platform boost for franchise searches
 */
export function calculateAdvancedPlatformBoost(game: any, searchQuery: string): PlatformBoost {
  if (!game.platforms || !Array.isArray(game.platforms) || game.platforms.length === 0) {
    return { score: 0, reason: 'No platform information' };
  }

  const query = searchQuery.toLowerCase().trim();
  const franchise = detectSearchFranchise(query);
  
  let bestScore = 0;
  let bestPlatform = '';
  let bestReason = '';

  // Evaluate each platform the game is available on
  for (const platform of game.platforms) {
    const platformName = platform.name || platform;
    let platformScore = ADVANCED_PLATFORM_SCORES[platformName] || 50;
    
    // Apply franchise-specific platform preferences
    if (franchise && FRANCHISE_PLATFORM_PREFERENCES[franchise]) {
      const franchiseBonus = FRANCHISE_PLATFORM_PREFERENCES[franchise][platformName];
      if (franchiseBonus) {
        platformScore = franchiseBonus;
      }
    }
    
    if (platformScore > bestScore) {
      bestScore = platformScore;
      bestPlatform = platformName;
      bestReason = franchise 
        ? `${franchise} franchise optimal on ${platformName}`
        : `High priority platform: ${platformName}`;
    }
  }

  // Convert platform score to priority boost (0-50 range)
  const priorityBoost = Math.min(50, Math.max(0, bestScore - 50));
  
  return {
    score: priorityBoost,
    reason: `Platform priority: ${bestReason}`
  };
}

/**
 * Detect franchise from search query
 */
function detectSearchFranchise(query: string): string | null {
  const franchisePatterns = {
    mario: ['mario', 'super mario'],
    zelda: ['zelda', 'legend of zelda'],
    metroid: ['metroid'],
    pokemon: ['pokemon', 'pokémon'],
    'final fantasy': ['final fantasy', 'ff'],
    'street fighter': ['street fighter'],
    'mega man': ['mega man', 'megaman'],
    sonic: ['sonic'],
    'metal gear': ['metal gear'],
    halo: ['halo']
  };

  for (const [franchise, patterns] of Object.entries(franchisePatterns)) {
    if (patterns.some(pattern => query.includes(pattern))) {
      return franchise;
    }
  }

  return null;
}

/**
 * Calculate age-based priority boost
 */
export function calculateAgeBoost(game: any, franchise: string | null): PlatformBoost {
  if (!game.first_release_date) {
    return { score: 0, reason: 'No release date' };
  }

  const releaseYear = new Date(game.first_release_date * 1000).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - releaseYear;

  // Age significance thresholds
  if (age >= 30) {
    return { score: 25, reason: `Classic era game (${releaseYear}) - cultural significance` };
  } else if (age >= 20) {
    return { score: 15, reason: `Retro era game (${releaseYear}) - nostalgic value` };
  } else if (age >= 10) {
    return { score: 10, reason: `Established era game (${releaseYear}) - proven quality` };
  } else if (age <= 3) {
    return { score: 20, reason: `Modern game (${releaseYear}) - current relevance` };
  }

  return { score: 0, reason: `Standard era game (${releaseYear})` };
}

/**
 * Apply advanced platform and age scoring to search results
 */
export function applyAdvancedPlatformBoosts(games: any[], searchQuery: string): any[] {
  const franchise = detectSearchFranchise(searchQuery);
  
  return games.map(game => {
    const platformBoost = calculateAdvancedPlatformBoost(game, searchQuery);
    const ageBoost = calculateAgeBoost(game, franchise);
    
    if (platformBoost.score > 0) {
      console.log(`🎮 Platform boost: "${game.name}" +${platformBoost.score} (${platformBoost.reason})`);
      (game as any)._platformBoost = platformBoost.score;
      (game as any)._platformReason = platformBoost.reason;
    }
    
    if (ageBoost.score > 0) {
      console.log(`⏰ Age boost: "${game.name}" +${ageBoost.score} (${ageBoost.reason})`);
      (game as any)._ageBoost = ageBoost.score;
      (game as any)._ageReason = ageBoost.reason;
    }
    
    return game;
  });
}

/**
 * Debug utility to log platform and description information for a game
 */
export function debugGamePlatforms(game: any): void {
  if (!import.meta.env.DEV) return;
  
  console.log('Game:', game.name || game.title);
  console.log('Platforms:', game.platforms?.map((p: any) => typeof p === 'string' ? p : p.name));
  console.log('Has Description:', hasDescription(game));
  console.log('Description Length:', (game.summary || game.description || '').length);
  console.log('Platform Priority Score:', getPlatformPriorityScore(game));
  console.log('Composite Priority Score:', getCompositePriorityScore(game));
  console.log('Platform Type:', getPlatformTypeDescription(game));
  console.log('High Priority Platform:', hasHighPriorityPlatform(game));
  console.log('---');
}