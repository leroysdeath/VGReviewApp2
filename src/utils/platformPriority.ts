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
 * Sort games by platform priority while preserving other sorting criteria
 * Games with higher platform priority appear first
 */
export function sortGamesByPlatformPriority(games: any[]): any[] {
  return [...games].sort((a, b) => {
    const scoreA = getPlatformPriorityScore(a);
    const scoreB = getPlatformPriorityScore(b);
    
    // Primary sort: Platform priority (higher score first)
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
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
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
  
  const score = getPlatformPriorityScore(game);
  const hasPC = isPCGame(game);
  const hasConsole = isConsoleGame(game);
  
  switch (score) {
    case 3:
      return 'PC & Console';
    case 2:
      return hasPC ? 'PC' : 'Console';
    case 1:
      return 'Multi-platform';
    case 0:
      return isMobileOnlyGame(game) ? 'Mobile only' : 'Other platforms';
    default:
      return 'Unknown';
  }
}

/**
 * Debug utility to log platform information for a game
 */
export function debugGamePlatforms(game: any): void {
  if (!import.meta.env.DEV) return;
  
  console.log('Game:', game.name);
  console.log('Platforms:', game.platforms?.map((p: any) => typeof p === 'string' ? p : p.name));
  console.log('Priority Score:', getPlatformPriorityScore(game));
  console.log('Platform Type:', getPlatformTypeDescription(game));
  console.log('High Priority:', hasHighPriorityPlatform(game));
  console.log('---');
}
