// Content Protection Filter
// Filters out fan-made content for companies known to aggressively protect their IP

interface Game {
  id: number;
  name: string;
  developer?: string;
  publisher?: string;
  category?: number;
  genres?: string[];
  summary?: string;
  description?: string;
}

// Companies and franchises known for aggressive IP protection
const PROTECTED_COMPANIES = [
  // Nintendo - extremely aggressive about fan content
  'nintendo',
  'game freak',
  'hal laboratory',
  'intelligent systems',
  'retro studios',
  
  // Disney - very protective of IP
  'disney',
  'disney interactive',
  'lucasfilm',
  'marvel',
  
  // Take-Two/Rockstar - known for C&D letters
  'take-two',
  'rockstar games',
  'rockstar north',
  '2k games',
  
  // Electronic Arts
  'electronic arts',
  'ea games',
  'ea sports',
  'bioware',
  'dice',
  
  // Activision Blizzard
  'activision',
  'blizzard entertainment',
  'infinity ward',
  'treyarch',
  
  // Square Enix - protective of Final Fantasy, Dragon Quest
  'square enix',
  'square',
  'enix',
  
  // Other protective companies
  'capcom',
  'konami',
  'bandai namco',
  'games workshop',
  'cd projekt red',
  'ubisoft',
  'sony interactive entertainment',
  'microsoft game studios'
];

// Protected franchise keywords that indicate IP-sensitive content
const PROTECTED_FRANCHISES = [
  // Nintendo franchises
  'mario', 'zelda', 'pokemon', 'metroid', 'kirby', 'donkey kong', 'star fox',
  'fire emblem', 'xenoblade', 'splatoon', 'animal crossing', 'smash bros',
  
  // Disney/Marvel/Star Wars
  'mickey mouse', 'star wars', 'marvel', 'avengers', 'spider-man', 'x-men',
  'frozen', 'disney', 'pixar',
  
  // Other major franchises
  'grand theft auto', 'gta', 'red dead', 'call of duty', 'world of warcraft',
  'final fantasy', 'dragon quest', 'street fighter', 'resident evil',
  'metal gear', 'silent hill', 'castlevania', 'tekken', 'pac-man',
  'sonic the hedgehog', 'warhammer', 'the witcher', 'assassin\'s creed',
  'halo', 'gears of war', 'forza'
];

// Fan-made content indicators (reusing logic from previous implementation)
const FAN_MADE_INDICATORS = [
  'mod', 'unofficial', 'fan', 'homebrew', 'patch', 'remix', 'hack',
  'romhack', 'rom hack', 'fan game', 'fan-made', 'fan made', 'fangame',
  'community', 'custom', 'parody', 'tribute', 'inspired by',
  'total conversion', 'overhaul', 'standalone mod'
];

// Official Nintendo developers and publishers that should NOT be filtered
const OFFICIAL_NINTENDO_COMPANIES = [
  'nintendo', 'game freak', 'hal laboratory', 'intelligent systems',
  'retro studios', 'the pokémon company', 'pokemon company', 
  'nintendo ead', 'nintendo epd', 'creatures inc', 'creatures',
  'bandai namco', 'gamefreak', 'rare', 'rare ltd'
];

/**
 * Check if content appears to be fan-made
 */
function isFanMadeContent(game: Game): boolean {
  const searchText = [
    game.name,
    game.developer,
    game.publisher,
    game.summary,
    game.description
  ].filter(Boolean).join(' ').toLowerCase();
  
  // Check explicit fan-made indicators
  const hasExplicitIndicators = FAN_MADE_INDICATORS.some(indicator => 
    searchText.includes(indicator)
  );
  
  if (hasExplicitIndicators) return true;
  
  // Special check for Nintendo/Pokemon games: if it's a Nintendo franchise 
  // but NOT made by official Nintendo companies, it's likely fan-made
  const isNintendoFranchise = PROTECTED_FRANCHISES.some(franchise => 
    searchText.includes(franchise)
  );
  
  if (isNintendoFranchise) {
    const developer = (game.developer || '').toLowerCase();
    const publisher = (game.publisher || '').toLowerCase();
    
    const isOfficialDeveloper = OFFICIAL_NINTENDO_COMPANIES.some(company => 
      developer.includes(company) || publisher.includes(company)
    );
    
    // If it's a Nintendo franchise but not by official companies, likely fan-made
    if (!isOfficialDeveloper) return true;
  }
  
  return false;
}

/**
 * Check if content relates to a protected franchise
 */
function isProtectedFranchise(game: Game): boolean {
  const searchText = [
    game.name,
    game.developer,
    game.publisher,
    game.summary,
    game.description
  ].filter(Boolean).join(' ').toLowerCase();
  
  // Check for protected companies
  const hasProtectedCompany = PROTECTED_COMPANIES.some(company => 
    searchText.includes(company)
  );
  
  // Check for protected franchises
  const hasProtectedFranchise = PROTECTED_FRANCHISES.some(franchise => 
    searchText.includes(franchise)
  );
  
  return hasProtectedCompany || hasProtectedFranchise;
}

/**
 * Check if content should be filtered out due to IP protection concerns
 */
export function shouldFilterContent(game: Game): boolean {
  // Only filter if it's both fan-made AND related to protected IP
  return isFanMadeContent(game) && isProtectedFranchise(game);
}

/**
 * Filter out problematic fan-made content from a list of games
 */
export function filterProtectedContent(games: Game[]): Game[] {
  return games.filter(game => !shouldFilterContent(game));
}

/**
 * Get filter statistics for debugging/logging
 */
export function getFilterStats(games: Game[]): {
  total: number;
  filtered: number;
  remaining: number;
  examples: string[];
} {
  const filtered = games.filter(game => shouldFilterContent(game));
  const examples = filtered.slice(0, 5).map(game => game.name);
  
  return {
    total: games.length,
    filtered: filtered.length,
    remaining: games.length - filtered.length,
    examples
  };
}

/**
 * Check if a specific game would be filtered (for testing)
 */
export function isContentFiltered(game: Game): {
  filtered: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  if (isFanMadeContent(game)) {
    reasons.push('Detected as fan-made content');
  }
  
  if (isProtectedFranchise(game)) {
    reasons.push('Related to protected IP');
  }
  
  return {
    filtered: shouldFilterContent(game),
    reasons
  };
}