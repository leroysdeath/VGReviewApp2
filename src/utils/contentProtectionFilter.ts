// Content Protection Filter with Company-Specific Copyright Policies
// Filters content based on individual company copyright aggression levels

import { 
  CopyrightLevel, 
  getCompanyCopyrightLevel, 
  hasSpecificFranchiseRestrictions,
  getPolicyReason,
  addAggressiveCompany,
  blockCompanyCompletely
} from './copyrightPolicies';

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
  'earthbound', 'mother', 'pikmin', 'f-zero',
  
  // Square Enix franchises (highly DMCA-prone)
  'final fantasy', 'ff', 'dragon quest', 'chrono trigger', 'chrono cross',
  'secret of mana', 'seiken densetsu', 'kingdom hearts', 'nier', 'drakengard',
  'tomb raider', 'just cause', 'deus ex', 'life is strange', 'outriders',
  'the world ends with you', 'twewy', 'bravely default', 'octopath traveler',
  'trials of mana', 'live a live', 'romancing saga', 'saga frontier',
  'valkyrie profile', 'parasite eve', 'xenogears', 'radiant historia',
  'mana', 'star ocean', 'front mission', 'vagrant story', 'legacy of kain',
  'soul reaver', 'fear effect', 'bushido blade', 'einhander', 'parasite eve',
  'threads of fate', 'dewprism', 'musashi', 'brave fencer', 'unlimited saga',
  
  // Capcom franchises (frequently strike fan projects)
  'street fighter', 'resident evil', 'biohazard', 'mega man', 'megaman',
  'devil may cry', 'monster hunter', 'ace attorney', 'phoenix wright',
  'dead rising', 'lost planet', 'viewtiful joe', 'okami', 'ghosts n goblins',
  'darkstalkers', 'vampire savior', 'breath of fire', 'power stone',
  'rival schools', 'captain commando', 'final fight', 'dino crisis',
  'onimusha', 'marvel vs capcom', 'capcom vs snk', 'tatsunoko vs capcom',
  'strider', 'commando', 'bionic commando', 'gun smoke', 'forgotten worlds',
  '1942', '1943', 'mercs', 'alien vs predator', 'dungeons & dragons',
  'knights of the round', 'king of dragons', 'the punisher', 'saturday night slam',
  'cyberbots', 'armored warriors', 'battle circuit', 'red earth', 'warzard',
  
  // Disney/Marvel/Star Wars
  'mickey mouse', 'star wars', 'marvel', 'avengers', 'spider-man', 'x-men',
  'frozen', 'disney', 'pixar',
  
  // Other major franchises
  'grand theft auto', 'gta', 'red dead', 'call of duty', 'world of warcraft',
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

// Comprehensive official company whitelist - games from these companies should NEVER be filtered
const OFFICIAL_COMPANIES = [
  // Nintendo and subsidiaries
  'nintendo', 'game freak', 'hal laboratory', 'intelligent systems',
  'retro studios', 'the pokémon company', 'pokemon company', 
  'nintendo ead', 'nintendo epd', 'creatures inc', 'creatures',
  'gamefreak', 'rare', 'rare ltd', 'nintendo r&d1', 'nintendo r&d2',
  'nintendo r&d3', 'nintendo r&d4', 'nintendo software planning & development',
  'nintendo spd', '1-up studio', 'brownie brown', 'skip ltd',
  
  // Square Enix and subsidiaries
  'square enix', 'square', 'enix', 'square co', 'enix corporation',
  'square enix holdings', 'square enix montreal', 'square enix europe',
  'square enix inc', 'square enix ltd', 'square enix co', 'square enix co.',
  'squaresoft', 'square soft', 'square electronic arts', 'square ea',
  'square co., ltd.', 'square co ltd', 'square company', 'square usa',
  'enix america', 'enix corp', 'enix corporation', 'enix co',
  'crystal dynamics', 'eidos montreal', 'io interactive', 
  'tri-ace', 'artdink', 'h.a.n.d.', 'matrix software',
  'platinum games', 'acquire corp', 'acquire',
  'business division 1', 'business division 2', 'business division 3',
  'square enix japan', 'square enix external studios', 'square enix collective',
  'luminous productions', 'creative business unit', 'cbu', 'cbu1', 'cbu2', 'cbu3',
  'square enix business division', 'square enix 1st production department',
  'square enix 2nd production department', 'square enix 3rd production department',
  'square product development division 1', 'square enix business division 3',
  
  // Capcom and subsidiaries
  'capcom', 'capcom co', 'capcom usa', 'capcom europe',
  'capcom production studio 1', 'capcom production studio 2',
  'capcom production studio 3', 'capcom production studio 4',
  'clover studio', 'flagship', 'dimps corporation', 'dimps',
  'inti creates', 'armature studio', 'beeline interactive',
  'capcom vancouver', 'blue castle games',
  
  // Sony and subsidiaries
  'sony interactive entertainment', 'sony computer entertainment',
  'naughty dog', 'insomniac games', 'guerrilla games', 'media molecule',
  'sucker punch productions', 'santa monica studio', 'bend studio',
  'japan studio', 'polyphony digital', 'team ico',
  
  // Microsoft and subsidiaries
  'microsoft game studios', 'microsoft studios', 'xbox game studios',
  'turn 10 studios', 'the coalition', 'rare', '343 industries',
  'mojang', 'obsidian entertainment', 'inxile entertainment',
  
  // Other major official publishers
  'electronic arts', 'ea games', 'ea sports', 'bioware', 'dice',
  'activision', 'blizzard entertainment', 'infinity ward', 'treyarch',
  'ubisoft', 'ubisoft montreal', 'ubisoft paris', 'ubisoft toronto',
  'take-two interactive', 'rockstar games', 'rockstar north', '2k games',
  'bandai namco', 'bandai namco entertainment', 'namco', 'bandai',
  'konami', 'kojima productions', 'sega', 'atlus', 'creative assembly',
  'valve', 'id software', 'bethesda game studios', 'bethesda softworks',
  'cd projekt red', 'cd projekt', 'epic games', 'bungie',
  'from software', 'fromsoftware', 'arc system works', 'snk',
  'nintendo of america', 'nintendo of europe', 'gradiente', 'ique',
  'eidos interactive'
];

// Legacy company lists (kept for backward compatibility)
const OFFICIAL_NINTENDO_COMPANIES = OFFICIAL_COMPANIES.filter(c => 
  c.includes('nintendo') || c.includes('game freak') || c.includes('hal') || 
  c.includes('creatures') || c.includes('pokemon') || c.includes('rare')
);

const OFFICIAL_SQUARE_ENIX_COMPANIES = OFFICIAL_COMPANIES.filter(c => 
  c.includes('square') || c.includes('enix') || c.includes('crystal') || 
  c.includes('eidos') || c.includes('luminous')
);

const OFFICIAL_CAPCOM_COMPANIES = OFFICIAL_COMPANIES.filter(c => 
  c.includes('capcom') || c.includes('clover') || c.includes('dimps') || 
  c.includes('inti')
);

/**
 * Check if a game is made by an official company
 */
function isOfficialCompany(game: Game): boolean {
  const developer = (game.developer || '').toLowerCase();
  const publisher = (game.publisher || '').toLowerCase();
  
  // Check if it's made by any official company
  return OFFICIAL_COMPANIES.some(company => 
    developer.includes(company) || publisher.includes(company)
  );
}

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
  
  // IMPORTANT: If it's made by an official company, it's NEVER fan-made
  if (isOfficialCompany(game)) {
    return false;
  }
  
  // If it contains protected franchise keywords but isn't by official companies, likely fan-made
  const hasProtectedFranchise = PROTECTED_FRANCHISES.some(franchise => 
    searchText.includes(franchise)
  );
  
  if (hasProtectedFranchise) {
    return true;
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
 * Get company names from a game
 */
function getGameCompanies(game: Game): string[] {
  const companies: string[] = [];
  if (game.developer) companies.push(game.developer);
  if (game.publisher) companies.push(game.publisher);
  return companies;
}

/**
 * Check if content should be filtered out based on company-specific copyright policies
 */
export function shouldFilterContent(game: Game): boolean {
  const companies = getGameCompanies(game);
  const searchText = [game.name, game.developer, game.publisher, game.summary, game.description]
    .filter(Boolean).join(' ').toLowerCase();
  
  // Check if game has explicit fan-made indicators
  const hasExplicitFanIndicators = FAN_MADE_INDICATORS.some(indicator => 
    searchText.includes(indicator)
  );
  
  // Check if game uses protected franchises
  const hasProtectedFranchise = PROTECTED_FRANCHISES.some(franchise => 
    searchText.includes(franchise)
  );
  
  // Check copyright level for each company involved
  // Priority: BLOCK_ALL > AGGRESSIVE > MODERATE > MOD_FRIENDLY
  let maxCopyrightLevel = CopyrightLevel.MODERATE; // Default
  let responsibleCompany = '';
  
  for (const company of companies) {
    if (!company) continue;
    
    const level = getCompanyCopyrightLevel(company);
    
    if (level === CopyrightLevel.BLOCK_ALL) {
      maxCopyrightLevel = level;
      responsibleCompany = company;
    } else if (level === CopyrightLevel.AGGRESSIVE && maxCopyrightLevel !== CopyrightLevel.BLOCK_ALL) {
      maxCopyrightLevel = level;
      responsibleCompany = company;
    } else if (level === CopyrightLevel.MOD_FRIENDLY && 
               maxCopyrightLevel !== CopyrightLevel.BLOCK_ALL && 
               maxCopyrightLevel !== CopyrightLevel.AGGRESSIVE) {
      maxCopyrightLevel = level;
      responsibleCompany = company;
    } else if (!responsibleCompany) {
      maxCopyrightLevel = level;
      responsibleCompany = company;
    }
  }
  
  // Apply filtering based on copyright level
  switch (maxCopyrightLevel) {
    case CopyrightLevel.BLOCK_ALL:
      // Block ALL content from this company (extremely rare)
      console.log(`🔒 BLOCKED ALL: "${game.name}" - Company: ${responsibleCompany} (${getPolicyReason(responsibleCompany)})`);
      return true;
      
    case CopyrightLevel.AGGRESSIVE:
      // Official company games are allowed, fan content is blocked
      if (isOfficialCompany(game)) {
        console.log(`✅ Official game allowed despite aggressive company: "${game.name}" by ${responsibleCompany}`);
        return false;
      }
      
      // Block any fan-made content or protected franchise content by non-official developers
      if (hasExplicitFanIndicators || hasProtectedFranchise) {
        console.log(`🛡️ Aggressive filtering: "${game.name}" - ${hasExplicitFanIndicators ? 'Fan content' : 'Protected franchise'} by ${responsibleCompany}`);
        return true;
      }
      
      // Check for specific franchise restrictions
      if (hasSpecificFranchiseRestrictions(responsibleCompany, game.name)) {
        console.log(`⚠️ Franchise restriction: "${game.name}" - ${responsibleCompany} specific franchise policy`);
        return true;
      }
      
      return false;
      
    case CopyrightLevel.MODERATE:
      // Only filter obvious fan-made content
      if (hasExplicitFanIndicators) {
        console.log(`🛡️ Moderate filtering: "${game.name}" - Explicit fan content indicators`);
        return true;
      }
      
      // Allow protected franchises if they're official
      if (hasProtectedFranchise && !isOfficialCompany(game)) {
        console.log(`⚠️ Moderate filtering: "${game.name}" - Protected franchise by non-official developer`);
        return true;
      }
      
      return false;
      
    case CopyrightLevel.MOD_FRIENDLY:
      // Only filter extremely obvious fan content that could cause legal issues
      if (hasExplicitFanIndicators && searchText.includes('commercial')) {
        console.log(`🛡️ Mod-friendly filtering: "${game.name}" - Commercial fan content (rare)`);
        return true;
      }
      
      console.log(`✅ Mod-friendly: "${game.name}" - Company supports fan content: ${responsibleCompany}`);
      return false;
      
    default:
      // Default moderate filtering for unknown companies
      if (hasExplicitFanIndicators) {
        console.log(`🛡️ Default filtering: "${game.name}" - Fan content by unknown company policy`);
        return true;
      }
      
      if (hasProtectedFranchise && !isOfficialCompany(game)) {
        console.log(`⚠️ Default filtering: "${game.name}" - Protected franchise by unknown company`);
        return true;
      }
      
      return false;
  }
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

/**
 * Quick test for Final Fantasy filtering
 */
export function testFinalFantasyFiltering() {
  const testGames = [
    {
      id: 1,
      name: "Final Fantasy VII",
      developer: "Square",
      publisher: "Square Enix"
    },
    {
      id: 2, 
      name: "Final Fantasy VII",
      developer: "Squaresoft",
      publisher: "Square"
    },
    {
      id: 3,
      name: "Final Fantasy VII",
      developer: "Square Enix",
      publisher: "Square Enix"
    },
    {
      id: 4,
      name: "Final Fantasy VII Remake",
      developer: "Square Enix Creative Business Unit I",
      publisher: "Square Enix"
    }
  ];
  
  console.log('🧪 Testing Final Fantasy filtering:');
  testGames.forEach(game => {
    const result = debugGameFiltering(game);
    console.log(`Game: ${game.name} (${game.developer}) → Filtered: ${result.filtered}`);
    if (result.filtered) {
      console.log(`  Reasons: Fan-made: ${result.isFanMade}, Protected: ${result.isProtectedFranchise}, Official SE: ${result.isOfficialSquareEnix}`);
    }
  });
}

/**
 * Debug function to analyze why a game might be filtered
 */
export function debugGameFiltering(game: Game): {
  game: string;
  developer: string;
  publisher: string;
  isFanMade: boolean;
  isProtectedFranchise: boolean;
  isOfficialSquareEnix: boolean;
  isOfficialCapcom: boolean;
  isOfficialNintendo: boolean;
  hasExplicitFanIndicators: boolean;
  hasProtectedFranchiseKeywords: boolean;
  filtered: boolean;
  copyrightLevel: CopyrightLevel;
  policyReason: string;
} {
  const searchText = [
    game.name,
    game.developer,
    game.publisher,
    game.summary,
    game.description
  ].filter(Boolean).join(' ').toLowerCase();
  
  const developer = (game.developer || '').toLowerCase();
  const publisher = (game.publisher || '').toLowerCase();
  
  const FAN_MADE_INDICATORS = [
    'mod', 'unofficial', 'fan', 'homebrew', 'patch', 'remix', 'hack',
    'romhack', 'rom hack', 'fan game', 'fan-made', 'fan made', 'fangame',
    'community', 'custom', 'parody', 'tribute', 'inspired by',
    'total conversion', 'overhaul', 'standalone mod'
  ];
  
  const hasExplicitFanIndicators = FAN_MADE_INDICATORS.some(indicator => 
    searchText.includes(indicator)
  );
  
  const hasProtectedFranchiseKeywords = PROTECTED_FRANCHISES.some(franchise => 
    searchText.includes(franchise)
  );
  
  const isOfficialSquareEnix = OFFICIAL_SQUARE_ENIX_COMPANIES.some(company => 
    developer.includes(company) || publisher.includes(company)
  );
  
  const isOfficialCapcom = OFFICIAL_CAPCOM_COMPANIES.some(company => 
    developer.includes(company) || publisher.includes(company)
  );
  
  const isOfficialNintendo = OFFICIAL_NINTENDO_COMPANIES.some(company => 
    developer.includes(company) || publisher.includes(company)
  );
  
  // Get copyright level for the companies
  const companies = getGameCompanies(game);
  let maxCopyrightLevel = CopyrightLevel.MODERATE;
  let responsibleCompany = '';
  
  for (const company of companies) {
    if (!company) continue;
    const level = getCompanyCopyrightLevel(company);
    if (level === CopyrightLevel.BLOCK_ALL || 
        (level === CopyrightLevel.AGGRESSIVE && maxCopyrightLevel !== CopyrightLevel.BLOCK_ALL) ||
        (level === CopyrightLevel.MODERATE && maxCopyrightLevel === CopyrightLevel.MOD_FRIENDLY)) {
      maxCopyrightLevel = level;
      responsibleCompany = company;
    }
  }
  
  return {
    game: game.name,
    developer: game.developer || 'N/A',
    publisher: game.publisher || 'N/A', 
    isFanMade: isFanMadeContent(game),
    isProtectedFranchise: isProtectedFranchise(game),
    isOfficialSquareEnix,
    isOfficialCapcom,
    isOfficialNintendo,
    hasExplicitFanIndicators,
    hasProtectedFranchiseKeywords,
    filtered: shouldFilterContent(game),
    copyrightLevel: maxCopyrightLevel,
    policyReason: getPolicyReason(responsibleCompany)
  };
}

// ===== QUICK DMCA RESPONSE FUNCTIONS =====

/**
 * Emergency response to DMCA - immediately add company to aggressive filtering
 * Use this when you receive a DMCA takedown notice
 */
export function handleDMCARequest(
  companyName: string, 
  reason: string, 
  franchises?: string[]
): void {
  console.log(`🚨 DMCA RESPONSE: Adding ${companyName} to aggressive filtering`);
  addAggressiveCompany(companyName, reason, franchises);
  
  // Optionally clear any cached game data that might contain newly-filtered content
  if (typeof window !== 'undefined' && window.localStorage) {
    // Clear search cache to ensure filtered content doesn't show up
    const cacheKeys = Object.keys(window.localStorage).filter(key => 
      key.includes('game_search') || key.includes('igdb_cache')
    );
    cacheKeys.forEach(key => window.localStorage.removeItem(key));
    console.log(`🧹 Cleared ${cacheKeys.length} cache entries`);
  }
}

/**
 * Emergency total block for extreme cases
 * Use this only for companies that demand complete removal of all content
 */
export function handleEmergencyBlock(companyName: string, reason: string): void {
  console.log(`🔒 EMERGENCY BLOCK: Completely blocking all content from ${companyName}`);
  blockCompanyCompletely(companyName, reason);
  
  // Clear all caches more aggressively
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
    console.log('🧹 Cleared all localStorage due to emergency block');
  }
}

/**
 * Test if a company name would trigger filtering
 * Use this to preview what filtering a company would do before applying
 */
export function previewCompanyFiltering(companyName: string): {
  currentLevel: CopyrightLevel;
  currentReason: string;
  wouldFilterFanContent: boolean;
  wouldFilterOfficialContent: boolean;
} {
  const level = getCompanyCopyrightLevel(companyName);
  const reason = getPolicyReason(companyName);
  
  return {
    currentLevel: level,
    currentReason: reason,
    wouldFilterFanContent: level === CopyrightLevel.AGGRESSIVE || level === CopyrightLevel.BLOCK_ALL,
    wouldFilterOfficialContent: level === CopyrightLevel.BLOCK_ALL
  };
}

/**
 * Check if fan content should be shown for a game based on its companies' copyright levels
 * Returns true if fan content should be hidden (i.e., company has AGGRESSIVE or BLOCK_ALL policy)
 */
export function shouldHideFanContent(game: Game): boolean {
  const companies = getGameCompanies(game);
  
  // Check copyright level for each company involved
  for (const company of companies) {
    if (!company) continue;
    
    const level = getCompanyCopyrightLevel(company);
    
    // Hide fan content if any company is AGGRESSIVE or BLOCK_ALL
    if (level === CopyrightLevel.AGGRESSIVE || level === CopyrightLevel.BLOCK_ALL) {
      console.log(`🛡️ Hiding fan content for "${game.name}" due to ${company} policy: ${level}`);
      return true;
    }
  }
  
  return false;
}

/**
 * Get current filtering status for all companies in a list of games
 * Useful for understanding what companies are involved and their policies
 */
export function analyzeGameListFiltering(games: Game[]): {
  companiesFound: Array<{
    name: string;
    level: CopyrightLevel;
    reason: string;
    gameCount: number;
    games: string[];
  }>;
  totalFiltered: number;
  totalAllowed: number;
} {
  const companyMap = new Map<string, { level: CopyrightLevel; reason: string; games: string[]; }>();
  let totalFiltered = 0;
  let totalAllowed = 0;
  
  games.forEach(game => {
    const companies = getGameCompanies(game);
    const filtered = shouldFilterContent(game);
    
    if (filtered) totalFiltered++;
    else totalAllowed++;
    
    companies.forEach(company => {
      if (!company) return;
      
      const normalized = company.toLowerCase();
      if (!companyMap.has(normalized)) {
        companyMap.set(normalized, {
          level: getCompanyCopyrightLevel(company),
          reason: getPolicyReason(company),
          games: []
        });
      }
      
      companyMap.get(normalized)!.games.push(game.name);
    });
  });
  
  const companiesFound = Array.from(companyMap.entries()).map(([name, data]) => ({
    name,
    level: data.level,
    reason: data.reason,
    gameCount: data.games.length,
    games: data.games.slice(0, 5) // Show first 5 games
  }));
  
  return {
    companiesFound,
    totalFiltered,
    totalAllowed
  };
}