// Game Content Categorization Utility
// Separates games into official vs fan-made/unofficial content

interface Game {
  id: number;
  igdb_id?: number;
  name: string;
  developer?: string;
  publisher?: string;
  genre?: string;
  genres?: string[];
  [key: string]: any;
}

export interface CategorizedGames {
  official: Game[];
  fanMade: Game[];
}

/**
 * Categorizes games into official vs fan-made content
 */
export function categorizeGames(games: Game[]): CategorizedGames {
  const official: Game[] = [];
  const fanMade: Game[] = [];

  games.forEach(game => {
    if (isFanMadeContent(game)) {
      fanMade.push(game);
    } else {
      official.push(game);
    }
  });

  return { official, fanMade };
}

/**
 * Determines if a game is fan-made/unofficial content
 */
export function isFanMadeContent(game: Game): boolean {
  const name = game.name?.toLowerCase() || '';
  
  // Check for mod/fan-made indicators in the name
  const fanMadeTerms = [
    'mod', 'unofficial', 'fan', 'homebrew', 'patch', 'remix', 
    'remaster', 'enhanced', 'definitive', 'community', 'custom',
    'total conversion', 'overhaul', 'standalone mod', 'expansion pack'
  ];
  
  const hasFanMadeTerms = fanMadeTerms.some(term => name.includes(term));
  
  // Check developer/publisher for indie or fan indicators
  const developer = game.developer?.toLowerCase() || '';
  const publisher = game.publisher?.toLowerCase() || '';
  
  const fanMadeDevelopers = [
    'fan', 'community', 'mod', 'indie', 'homebrew', 'unofficial'
  ];
  
  const hasFanMadeDeveloper = fanMadeDevelopers.some(term => 
    developer.includes(term) || publisher.includes(term)
  );
  
  // Check for obvious official content to exclude from fan-made
  const officialTerms = [
    'goty', 'game of the year', 'complete edition', 'legendary edition',
    'special edition', 'director\'s cut', 'gold edition', 'ultimate edition'
  ];
  
  const isOfficialEdition = officialTerms.some(term => name.includes(term));
  
  // If it has official edition markers, it's likely official even with enhanced/definitive terms
  if (isOfficialEdition) {
    return false;
  }
  
  // Return true if it has fan-made indicators
  return hasFanMadeTerms || hasFanMadeDeveloper;
}

/**
 * Gets the appropriate category label for display
 */
export function getCategoryLabel(game: Game): string {
  return isFanMadeContent(game) ? 'Fan-Made' : 'Official';
}

/**
 * Gets category styling classes
 */
export function getCategoryStyle(isFanMade: boolean) {
  return {
    badge: isFanMade 
      ? 'bg-blue-600 text-blue-100 border-blue-500' 
      : 'bg-purple-600 text-purple-100 border-purple-500',
    accent: isFanMade ? 'border-blue-500' : 'border-purple-500',
    text: isFanMade ? 'text-blue-400' : 'text-purple-400'
  };
}