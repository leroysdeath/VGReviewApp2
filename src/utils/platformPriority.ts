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