/**
 * Platform name mapping utility
 * Maps IGDB platform names to shorter display names
 */

export const PLATFORM_MAP: Record<string, string> = {
  'PC (Microsoft Windows)': 'PC',
  'Mac': 'Mac',
  'Linux': 'Linux',
  'PlayStation 5': 'PS5',
  'PlayStation 4': 'PS4',
  'PlayStation 3': 'PS3',
  'PlayStation 2': 'PS2',
  'PlayStation': 'PS1',
  'PlayStation Portable': 'PSP',
  'PlayStation Vita': 'PS Vita',
  'Xbox Series X': 'Xbox Series X/S',
  'Xbox Series S': 'Xbox Series X/S',
  'Xbox Series X|S': 'Xbox Series X/S',
  'Xbox One': 'Xbox One',
  'Xbox 360': 'Xbox 360',
  'Xbox': 'Xbox',
  'Nintendo Switch': 'Switch',
  'Nintendo Switch 2': 'Switch 2',
  'Nintendo 3DS': '3DS',
  'New Nintendo 3DS': 'New 3DS',
  'Nintendo DS': 'DS',
  'Nintendo DSi': 'DS',
  'Nintendo Wii U': 'Wii U',
  'Nintendo Wii': 'Wii',
  'Nintendo GameCube': 'GameCube',
  'Nintendo 64': 'N64',
  'Super Nintendo Entertainment System': 'SNES',
  'Nintendo Entertainment System': 'NES',
  'Family Computer': 'NES',
  'Family Computer Disk System': 'NES',
  'Game Boy Advance': 'GBA',
  'Game Boy Color': 'GBC',
  'Game Boy': 'Game Boy',
  'Android': 'Android',
  'iOS': 'iOS',
  'Web browser': 'Browser',

  // Japanese platform mappings
  '64DD': 'N64',
  'Satellaview': 'SNES',
  'Super Famicom': 'SNES',

  // Sega platforms
  'Sega Mega Drive/Genesis': 'Genesis',
  'Sega Master System/Mark III': 'Master System',
  'Sega Game Gear': 'Game Gear',
  'Sega Saturn': 'Saturn',
  'Sega CD': 'Sega CD',
  'Sega 32X': '32X',
  'SG-1000': 'SG-1000',

  // Other platform variants
  'TurboGrafx-16/PC Engine': 'TurboGrafx-16',
  'Turbografx-16/PC Engine CD': 'PC Engine CD',
  'Odyssey 2 / Videopac G7000': 'Odyssey 2',
  'Commodore C64/128/MAX': 'C64',
  'Mega Duck/Cougar Boy': 'Mega Duck',
};

/**
 * Maps an array of platform names to their display names
 * @param platforms - Array of original platform names from IGDB
 * @returns Array of mapped platform names, sorted
 */
export const mapPlatformNames = (platforms: string[]): string[] => {
  const mapped = new Set<string>();
  platforms.forEach(p => {
    const displayName = PLATFORM_MAP[p] || p;
    mapped.add(displayName);
  });
  
  return Array.from(mapped).sort();
};

/**
 * Maps a single platform name to its display name
 * @param platform - Original platform name from IGDB
 * @returns Mapped platform name
 */
export const mapPlatformName = (platform: string): string => {
  return PLATFORM_MAP[platform] || platform;
};

/**
 * Gets the original platform name from a mapped name (reverse lookup)
 * @param mappedName - The mapped/display name
 * @returns Original platform name or the input if not found
 */
export const getOriginalPlatformName = (mappedName: string): string => {
  const entry = Object.entries(PLATFORM_MAP).find(([_, mapped]) => mapped === mappedName);
  return entry ? entry[0] : mappedName;
};