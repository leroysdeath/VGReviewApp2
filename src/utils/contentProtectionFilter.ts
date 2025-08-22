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
 * Check if content should be filtered out due to IP protection concerns
 */
export function shouldFilterContent(game: Game): boolean {
  // STEP 1: Never filter games from official companies
  if (isOfficialCompany(game)) {
    console.log(`✅ Official game allowed: "${game.name}" by ${game.developer || game.publisher}`);
    return false;
  }
  
  // STEP 2: Always filter games with explicit fan-made indicators
  const searchText = [game.name, game.developer, game.publisher, game.summary, game.description]
    .filter(Boolean).join(' ').toLowerCase();
  
  const hasExplicitFanIndicators = FAN_MADE_INDICATORS.some(indicator => 
    searchText.includes(indicator)
  );
  
  if (hasExplicitFanIndicators) {
    console.log(`🛡️ Fan-made content filtered: "${game.name}" - Contains: ${FAN_MADE_INDICATORS.find(i => searchText.includes(i))}`);
    return true;
  }
  
  // STEP 3: Filter unknown developers making protected franchise games
  const hasProtectedFranchise = PROTECTED_FRANCHISES.some(franchise => 
    searchText.includes(franchise)
  );
  
  if (hasProtectedFranchise) {
    const developer = game.developer || 'Unknown';
    const publisher = game.publisher || 'Unknown';
    console.log(`⚠️ Protected franchise by unknown developer: "${game.name}" by ${developer}/${publisher}`);
    return true;
  }
  
  // STEP 4: Allow everything else
  return false;
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
    filtered: shouldFilterContent(game)
  };
}