// Content Protection Filter with Company-Specific Copyright Policies
// Filters content based on individual company copyright aggression levels

// Debug flag to control console logging (set to false to reduce verbosity)
const DEBUG_FILTERING = true; // INVESTIGATION MODE - Enable detailed logging

import { 
  CopyrightLevel, 
  getCompanyCopyrightLevel, 
  hasSpecificFranchiseRestrictions,
  getPolicyReason,
  addAggressiveCompany,
  blockCompanyCompletely,
  isAuthorizedPublisher,
  findFranchiseOwner
} from './copyrightPolicies';

// Helper function for debug logging
function getCategoryLabel(category?: number): string {
  const labels: Record<number, string> = {
    0: 'Main game',
    1: 'DLC/Add-on',
    2: 'Expansion',
    3: 'Bundle',
    4: 'Standalone expansion',
    5: 'Mod',
    6: 'Episode',
    7: 'Season',
    8: 'Remake',
    9: 'Remaster',
    10: 'Expanded game',
    11: 'Port',
    12: 'Fork',
    13: 'Pack',
    14: 'Update'
  };
  return category !== undefined ? labels[category] || `Unknown(${category})` : 'undefined';
}

/**
 * Check if a game was released within the past N years
 * Uses IGDB timestamp data (Unix timestamp in seconds)
 */
function isGameRecentlyReleased(game: Game, yearsThreshold: number = 3): boolean {
  const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds
  const thresholdTime = currentTime - (yearsThreshold * 365 * 24 * 60 * 60); // N years ago
  
  // Check first_release_date first (most reliable)
  if (game.first_release_date && game.first_release_date > thresholdTime) {
    return true;
  }
  
  // Check release_dates array as fallback
  if (game.release_dates && game.release_dates.length > 0) {
    const earliestRelease = game.release_dates
      .filter(release => release.date)
      .sort((a, b) => (a.date || 0) - (b.date || 0))[0];
    
    if (earliestRelease && earliestRelease.date && earliestRelease.date > thresholdTime) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get the release year of a game for logging purposes
 */
function getGameReleaseYear(game: Game): string {
  if (game.first_release_date) {
    return new Date(game.first_release_date * 1000).getFullYear().toString();
  }
  
  if (game.release_dates && game.release_dates.length > 0) {
    const earliestRelease = game.release_dates
      .filter(release => release.date)
      .sort((a, b) => (a.date || 0) - (b.date || 0))[0];
    
    if (earliestRelease && earliestRelease.date) {
      return new Date(earliestRelease.date * 1000).getFullYear().toString();
    }
  }
  
  return 'Unknown';
}

interface Game {
  id: number;
  igdb_id?: number; // IGDB ID for the game
  name: string;
  developer?: string;
  publisher?: string;
  category?: number;
  genres?: string[];
  summary?: string;
  description?: string;
  first_release_date?: number; // IGDB timestamp (Unix timestamp in seconds)
  release_dates?: Array<{
    date?: number; // Unix timestamp in seconds
    platform?: number;
    region?: number;
  }>;
  // Manual admin flags
  greenlight_flag?: boolean;
  redlight_flag?: boolean;
  flag_reason?: string;
  // New IGDB metrics
  total_rating?: number;
  rating_count?: number;
  follows?: number;
  hypes?: number;
  popularity_score?: number;
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
  'total conversion', 'overhaul', 'standalone mod',
  'chapter', 'episode', 'part', 'sui mario', 'storm'
];

// Enhanced mod patterns for aggressive copyright filtering
const ENHANCED_MOD_PATTERNS = [
  'mod:', 'mod ', ' mod', 'mod-', 'mod_', ':mod',
  'the mod', 'a mod', 'this mod', 'fan mod', 'game mod',
  'modification', 'modified', 'modded', 'modding',
  'modpack', 'mod pack', 'total conversion', 'tc',
  'overhaul mod', 'remix mod', 'hack mod', 'rom mod',
  'unofficial mod', 'community mod', 'player mod',
  'texture mod', 'graphics mod', 'gameplay mod', 'content mod',
  'balance mod', 'difficulty mod', 'enhancement mod',
  'expansion mod', 'addon mod', 'plugin mod'
];

// Nintendo-specific ROM hack patterns (very deceptive naming)
const NINTENDO_ROMHACK_PATTERNS = [
  // Episodic indicators (Chapter X, Episode X, Part X)
  /\b(chapter|episode|part)\s*\d+/i,
  // Numbered sequels to official games that don't exist
  /super mario bros.*:\s*odyssey/i,  // "Super Mario Bros: Odyssey" isn't real
  /super mario storm/i,              // "Super Mario Storm" isn't a real series
  /sui mario/i,                      // "Sui Mario" is clearly a typo/variant
  // Non-Nintendo Mario variants
  /mario.*\d+$(?<!64|3d)/i,         // "Something Mario 1/2" but not "Mario 64"
];

// Comprehensive official company whitelist - games from these companies should NEVER be filtered
const OFFICIAL_COMPANIES = [
  // Nintendo and subsidiaries (expanded with missing variants)
  'nintendo', 'nintendo co ltd', 'nintendo co., ltd.', 'nintendo company limited',
  'nintendo of america', 'nintendo of america inc', 'nintendo of europe', 'nintendo of europe gmbh',
  'game freak', 'gamefreak', 'game freak inc', 'game freak, inc.',
  'hal laboratory', 'hal laboratory inc', 'hal laboratory, inc.',
  'intelligent systems', 'intelligent systems co., ltd.',
  'retro studios', 'retro studios inc', 'retro studios, inc.',
  'the pokémon company', 'pokemon company', 'the pokemon company',
  'pokémon company', 'pokemon company international', 'the pokémon company international',
  'the pokemon company international', 'pokémon company international',
  'creatures inc', 'creatures', 'creatures inc.',
  'nintendo ead', 'nintendo epd', 'nintendo epu',
  'rare', 'rare ltd', 'rareware', 'rare limited',
  'nintendo r&d1', 'nintendo r&d2', 'nintendo r&d3', 'nintendo r&d4',
  'nintendo software planning & development', 'nintendo spd',
  '1-up studio', 'brownie brown', 'skip ltd', 'monolith soft',
  'pokemon co', 'pokémon co', 'pokemon co., ltd.', 'pokémon co., ltd.',
  
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
  'playground games', 'undead labs', 'compulsion games', 'ninja theory',
  
  // Other major official publishers (expanded with missing GTA/Rockstar variants)
  'electronic arts', 'ea games', 'ea sports', 'bioware', 'dice',
  'activision', 'blizzard entertainment', 'infinity ward', 'treyarch',
  'ubisoft', 'ubisoft montreal', 'ubisoft paris', 'ubisoft toronto',
  'take-two interactive', 'take-two', 'take two', 'take two interactive',
  'rockstar games', 'rockstar north', 'rockstar games inc', 'rockstar games, inc.',
  'rockstar san diego', 'rockstar toronto', 'rockstar vancouver', 'rockstar london',
  'rockstar leeds', 'rockstar new england', 'rockstar india',
  'dma design', 'dma design ltd', 'dma design limited', // Original GTA developer
  '2k games', '2k', '2k sports', '2k czech',
  'bandai namco', 'bandai namco entertainment', 'namco', 'bandai',
  'konami', 'kojima productions', 'sega', 'atlus', 'creative assembly',
  'valve', 'id software', 'bethesda game studios', 'bethesda softworks',
  'cd projekt red', 'cd projekt', 'epic games', 'bungie',
  'from software', 'fromsoftware', 'arc system works', 'snk',
  'nintendo of america', 'nintendo of europe', 'gradiente', 'ique',
  'eidos interactive',
  
  // Fighting game publishers
  'netherrealm studios', 'wb games', 'warner bros games', 'warner bros entertainment',
  'midway games', 'acclaim entertainment', 'arc system works',
  
  // Modern indie and AA publishers
  'devolver digital', 'annapurna interactive', 'coffee stain studios',
  'team17', 'focus home interactive', 'focus entertainment',
  'private division', 'paradox interactive', 'paradox entertainment',
  
  // Additional racing/sports publishers
  'codemasters', 'slightly mad studios', 'milestone', 'kylotonn'
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
 * Known official Pokemon game IGDB IDs
 * This list helps when games have missing developer/publisher metadata
 */
const KNOWN_OFFICIAL_POKEMON_IDS = new Set([
  // Gen 1
  1511, // Pokemon Blue
  1512, // Pokemon Red
  1513, // Pokemon Yellow
  // Gen 2
  1514, // Pokemon Crystal
  1515, // Pokemon Gold
  1516, // Pokemon Silver
  // Gen 3
  1517, // Pokemon Ruby
  1518, // Pokemon Sapphire
  1519, // Pokemon Emerald
  1529, // Pokemon FireRed
  1530, // Pokemon LeafGreen
  // Gen 4
  1520, // Pokemon Diamond
  1531, // Pokemon Pearl
  1532, // Pokemon Platinum
  2155, // Pokemon HeartGold
  2156, // Pokemon SoulSilver
  // Gen 5
  1521, // Pokemon Black
  1522, // Pokemon White
  8284, // Pokemon Black 2
  8285, // Pokemon White 2
  // Gen 6
  9617, // Pokemon X
  9618, // Pokemon Y
  11208, // Pokemon Omega Ruby
  11207, // Pokemon Alpha Sapphire
  // Gen 7
  19038, // Pokemon Sun
  19039, // Pokemon Moon
  26758, // Pokemon Ultra Sun
  26759, // Pokemon Ultra Moon
  // Gen 8
  103055, // Pokemon Sword
  103056, // Pokemon Shield
  119193, // Pokemon Brilliant Diamond
  119194, // Pokemon Shining Pearl
  119191, // Pokemon Legends: Arceus
  // Gen 9
  207879, // Pokemon Scarlet
  207880, // Pokemon Violet
  // Mystery Dungeon series
  2320, // Pokemon Mystery Dungeon: Blue Rescue Team
  2319, // Pokemon Mystery Dungeon: Red Rescue Team
  2321, // Pokemon Mystery Dungeon: Explorers of Time
  2322, // Pokemon Mystery Dungeon: Explorers of Darkness
  2323, // Pokemon Mystery Dungeon: Explorers of Sky
  // Stadium/Colosseum series
  1533, // Pokemon Stadium
  1534, // Pokemon Stadium 2
  2161, // Pokemon Colosseum
  2162, // Pokemon XD: Gale of Darkness
  // Ranger series
  2324, // Pokemon Ranger
  2325, // Pokemon Ranger: Shadows of Almia
  2326, // Pokemon Ranger: Guardian Signs
  // Other mainline/official
  1535, // Pokemon Snap
  19815, // Pokemon GO
  27351, // Pokemon Let's Go Pikachu
  27352, // Pokemon Let's Go Eevee
  135196, // New Pokemon Snap
  143630, // Pokemon UNITE
  179649, // Pokemon Cafe Mix / Pokemon Cafe ReMix
]);

/**
 * Check if a game is a known official Pokemon game
 * This helps when developer/publisher metadata is missing
 */
function isKnownOfficialPokemonGame(game: Game): boolean {
  // Check by IGDB ID first
  if (game.igdb_id && KNOWN_OFFICIAL_POKEMON_IDS.has(game.igdb_id)) {
    return true;
  }
  
  // Fallback: Check if it's a Pokemon game with official-looking name patterns
  const name = game.name.toLowerCase();
  const isPokemonGame = name.includes('pokemon') || name.includes('pokémon');
  
  if (!isPokemonGame) {
    return false;
  }
  
  // Check for known fan game names first
  const knownFanGameNames = [
    'uranium', 'insurgence', 'reborn', 'rejuvenation', 'phoenix rising',
    'sage', 'solar light', 'lunar dark', 'clover', 'prism', 'glazed',
    'light platinum', 'flora sky', 'ash gray', 'liquid crystal',
    'dark rising', 'zeta', 'omicron', 'melanite', 'empyrean'
  ];
  
  const isFanGameName = knownFanGameNames.some(fanName => 
    name.includes(fanName)
  );
  
  if (isFanGameName) {
    return false; // It's a known fan game
  }
  
  // Check for official game name patterns (mainline games)
  const officialPatterns = [
    /pokémon (red|blue|yellow|green)( version)?$/i,
    /pokémon (gold|silver|crystal)( version)?$/i,
    /pokémon (ruby|sapphire|emerald)( version)?$/i,
    /pokémon (firered|leafgreen)( version)?$/i,
    /pokémon (diamond|pearl|platinum)( version)?$/i,
    /pokémon (heartgold|soulsilver)( version)?$/i,
    /pokémon (black|white)( version)?( 2)?$/i,
    /pokémon (x|y)$/i,
    /pokémon (omega ruby|alpha sapphire)$/i,
    /pokémon (sun|moon|ultra sun|ultra moon)$/i,
    /pokémon (sword|shield)$/i,
    /pokémon (brilliant diamond|shining pearl)$/i,
    /pokémon legends[: ]arceus$/i,
    /pokémon (scarlet|violet)$/i,
    /pokémon (let's go,? pikachu|let's go,? eevee)$/i,
    /pokémon (stadium|snap|colosseum|xd|ranger|mystery dungeon)/i,
    /pokémon go$/i,
    /new pokémon snap$/i,
    /pokémon unite$/i,
    /pokémon café/i
  ];
  
  // If it matches an official pattern and doesn't have fan indicators, treat as official
  const matchesOfficialPattern = officialPatterns.some(pattern => pattern.test(game.name));
  const hasFanIndicators = FAN_MADE_INDICATORS.some(indicator => 
    name.includes(indicator) || 
    (game.developer && game.developer.toLowerCase().includes(indicator)) ||
    (game.publisher && game.publisher.toLowerCase().includes(indicator))
  );
  
  return matchesOfficialPattern && !hasFanIndicators;
}

/**
 * Check if a game is made by an official company
 */
export function isOfficialCompany(game: Game): boolean {
  const developer = (game.developer || '').toLowerCase();
  const publisher = (game.publisher || '').toLowerCase();
  
  // Check if it's made by any official company from the hardcoded list
  const isInOfficialList = OFFICIAL_COMPANIES.some(company => 
    developer.includes(company) || publisher.includes(company)
  );
  
  if (isInOfficialList) {
    return true;
  }
  
  // Also check against franchise authorization system for comprehensive coverage
  // This ensures Pokemon Company variants and other franchise publishers are recognized
  const franchiseOwner = findFranchiseOwner(game);
  if (franchiseOwner) {
    return isAuthorizedPublisher(developer, publisher, franchiseOwner);
  }
  
  return false;
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
  
  // Check Nintendo-specific ROM hack patterns (catches deceptive naming)
  if (searchText.includes('mario') || searchText.includes('zelda') || searchText.includes('pokemon')) {
    const hasNintendoRomHackPattern = NINTENDO_ROMHACK_PATTERNS.some(pattern => 
      pattern.test(game.name || '')
    );
    if (hasNintendoRomHackPattern) {
      if (DEBUG_FILTERING) console.log(`🚨 NINTENDO ROM HACK DETECTED: "${game.name}" matches deceptive naming pattern`);
      return true;
    }
  }
  
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
 * Enhanced mod detection specifically for aggressive copyright companies
 * More sensitive to mod-related terms in titles and descriptions
 */
function hasEnhancedModIndicators(game: Game): boolean {
  const searchText = [
    game.name,
    game.summary,
    game.description
  ].filter(Boolean).join(' ').toLowerCase();
  
  // Check enhanced mod patterns (more sensitive)
  const hasModPattern = ENHANCED_MOD_PATTERNS.some(pattern => 
    searchText.includes(pattern.toLowerCase())
  );
  
  // Also check original fan-made indicators
  const hasFanPattern = FAN_MADE_INDICATORS.some(indicator => 
    searchText.includes(indicator.toLowerCase())
  );
  
  const result = hasModPattern || hasFanPattern;
  
  if (result) {
    // Enhanced mod detection applied
  }
  
  return result;
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
  // Filter checking game
  
  const companies = getGameCompanies(game);
  const rawSearchText = [game.name, game.developer, game.publisher, game.summary, game.description]
    .filter(Boolean).join(' ');
  
  // Apply accent normalization to handle characters like "Pokémon" -> "Pokemon"
  const searchText = rawSearchText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  
  // DEBUG: Log detailed game info for samus searches
  if (searchText.includes('samus') || searchText.includes('metroid')) {
    if (DEBUG_FILTERING) console.log(`🧪 SAMUS/METROID DEBUG: Analyzing "${game.name}"`);
    if (DEBUG_FILTERING) console.log(`   Developer: ${game.developer || 'N/A'}`);
    if (DEBUG_FILTERING) console.log(`   Publisher: ${game.publisher || 'N/A'}`);
    if (DEBUG_FILTERING) console.log(`   Category: ${game.category} (${getCategoryLabel(game.category)})`);
    if (DEBUG_FILTERING) console.log(`   Summary: ${game.summary || 'N/A'}`);
  }

  // CRITICAL: Check if this is an official game FIRST before any other filtering
  // BUT: Never bypass category 5 (Mod) games, even if they claim official publisher
  if (game.category !== 5 && isOfficialCompany(game)) {
    if (DEBUG_FILTERING) console.log(`✅ OFFICIAL COMPANY: Allowing "${game.name}" - from official publisher/developer`);
    return false;
  }

  // QUALITY OVERRIDE: High-quality games get special treatment
  const hasHighQuality = (game.total_rating && game.total_rating > 70) &&
                        (game.rating_count && game.rating_count > 50);
  const isVeryPopular = game.follows && game.follows > 1000;
  const hasStrongMetrics = hasHighQuality || isVeryPopular;

  // Allow high-quality games even if they might be filtered otherwise
  if (hasStrongMetrics && game.category !== 5) {
    if (DEBUG_FILTERING) console.log(`⭐ QUALITY OVERRIDE: Allowing "${game.name}" - High metrics (Rating: ${game.total_rating}, Follows: ${game.follows})`);
    return false;
  }
  
  // SPECIAL CASE: Handle known official Pokemon games that might have missing metadata
  // This helps when IGDB/database data is incomplete
  if (game.category !== 5 && isKnownOfficialPokemonGame(game)) {
    if (DEBUG_FILTERING) console.log(`✅ KNOWN POKEMON: Allowing "${game.name}" - known official Pokemon game`);
    return false;
  }
  
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
  
  // First, check direct company copyright levels (developer/publisher)
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
  
  // IMPORTANT: Also check franchise ownership for content protection
  // This handles cases like "Metroid mod" where the developer is "Fan Developer"
  // but the content relates to Nintendo's Metroid franchise
  let franchiseOwner = findFranchiseOwner(game, searchText);
  if (franchiseOwner) {
    const franchiseLevel = getCompanyCopyrightLevel(franchiseOwner);
    
    // Use franchise owner's copyright level regardless of direction
    // This handles both MORE restrictive (Nintendo) and LESS restrictive (Bethesda MOD_FRIENDLY)
    if (franchiseLevel === CopyrightLevel.BLOCK_ALL ||
        (franchiseLevel === CopyrightLevel.AGGRESSIVE && maxCopyrightLevel !== CopyrightLevel.BLOCK_ALL) ||
        (franchiseLevel === CopyrightLevel.MOD_FRIENDLY)) {
      maxCopyrightLevel = franchiseLevel;
      responsibleCompany = franchiseOwner;
      // Franchise override applied
    }
  }
  

  // Note: Quality metrics already checked above with early return
  
  // Apply filtering based on copyright level
  switch (maxCopyrightLevel) {
    case CopyrightLevel.BLOCK_ALL:
      // Block ALL content from this company (extremely rare)
      // Quality exemptions already handled above
      if (DEBUG_FILTERING) console.log(`🔒 BLOCKED ALL: "${game.name}" - Company: ${responsibleCompany} (${getPolicyReason(responsibleCompany)})`);
      return true;
      
    case CopyrightLevel.AGGRESSIVE:
      // DEBUG: Extra logging for samus/metroid
      if (searchText.includes('samus') || searchText.includes('metroid')) {
        if (DEBUG_FILTERING) console.log(`🧪 AGGRESSIVE CASE: "${game.name}" - Company: ${responsibleCompany}, Level: ${maxCopyrightLevel}`);
        if (DEBUG_FILTERING) console.log(`   Franchise Owner: ${franchiseOwner || 'none'}`);
        if (DEBUG_FILTERING) console.log(`   Category Check: ${game.category} === 5? ${game.category === 5}`);
      }
      
      // NEW: Block IGDB category 5 (Mod) for aggressive companies
      if (game.category === 5) {
        if (DEBUG_FILTERING) console.log(`🛡️ IGDB MOD CATEGORY FILTER: "${game.name}" - Category 5 (Mod) blocked for AGGRESSIVE company ${responsibleCompany}`);
        return true;
      }
      
      // Enhanced ownership validation for protected franchises
      // (franchiseOwner already determined above in copyright level detection)
      // TEMPORARILY DISABLED: This is too aggressive and filtering legitimate games
      // if (franchiseOwner && !isAuthorizedPublisher(game.developer || '', game.publisher || '', franchiseOwner)) {
      //   if (DEBUG_FILTERING) console.log(`🛡️ OWNERSHIP FILTER: "${game.name}" - Unauthorized use of ${franchiseOwner} franchise by ${game.developer || game.publisher || 'unknown'}`);
      //   return true;
      // }
      
      
      // NEW: Enhanced mod detection for aggressive companies
      // TEMPORARILY DISABLED: This is blocking legitimate games
      // if (hasEnhancedModIndicators(game)) {
      //   if (DEBUG_FILTERING) console.log(`🛡️ ENHANCED MOD FILTER: "${game.name}" - Mod content blocked for ${responsibleCompany}`);
      //   return true;
      // }
      
      // Quality exemptions already handled above
      
      // Block fan-made content for aggressive companies (re-enabled with safer logic)
      // Only filter if there are explicit fan indicators, not just protected franchises
      if (hasExplicitFanIndicators) {
        if (DEBUG_FILTERING) console.log(`🛡️ Aggressive filtering: "${game.name}" - Fan content blocked for ${responsibleCompany}`);
        return true;
      }
      
      // Check for specific franchise restrictions
      // TEMPORARILY DISABLED: This is also blocking legitimate games
      // if (hasSpecificFranchiseRestrictions(responsibleCompany, game.name)) {
      //   if (DEBUG_FILTERING) console.log(`⚠️ Franchise restriction: "${game.name}" - ${responsibleCompany} specific franchise policy`);
      //   return true;
      // }
      
      return false;
      
    case CopyrightLevel.MODERATE:
      // NEW: Time-based mod filtering for recent games (past 3 years)
      // For MODERATE level, time-based logic takes precedence over protected franchise filtering
      // Some companies are more protective of recent releases but tolerate older mods
      const isModContent = game.category === 5 || hasEnhancedModIndicators(game);
      
      if (isModContent) {
        const isRecent = isGameRecentlyReleased(game, 3);
        const releaseYear = getGameReleaseYear(game);
        
        if (isRecent) {
          if (DEBUG_FILTERING) console.log(`🕐 TIME-BASED MOD FILTER: "${game.name}" (${releaseYear}) - Mod content blocked for recent release (MODERATE level)`);
          return true;
        } else {
          if (DEBUG_FILTERING) console.log(`⏰ TIME-BASED MOD ALLOWED: "${game.name}" (${releaseYear}) - Older mod content allowed (MODERATE level) - overrides franchise protection`);
          return false; // Explicitly allow old mods, even for protected franchises
        }
      }
      
      // Filter other types of fan-made content (non-mod fan content)
      if (hasExplicitFanIndicators) {
        if (DEBUG_FILTERING) console.log(`🛡️ Moderate filtering: "${game.name}" - Explicit fan content indicators (non-mod)`);
        return true;
      }
      
      // Block protected franchises by non-official developers (since official already bypassed above)
      // This only applies to non-mod content now
      if (hasProtectedFranchise) {
        if (DEBUG_FILTERING) console.log(`⚠️ Moderate filtering: "${game.name}" - Protected franchise by non-official developer (non-mod)`);
        return true;
      }
      
      return false;
      
    case CopyrightLevel.MOD_FRIENDLY:
      // Only filter extremely obvious fan content that could cause legal issues
      if (hasExplicitFanIndicators && searchText.includes('commercial')) {
        if (DEBUG_FILTERING) console.log(`🛡️ Mod-friendly filtering: "${game.name}" - Commercial fan content (rare)`);
        return true;
      }
      
      if (DEBUG_FILTERING) console.log(`✅ Mod-friendly: "${game.name}" - Company supports fan content: ${responsibleCompany}`);
      return false;
      
    default:
      // Default moderate filtering for unknown companies
      if (hasExplicitFanIndicators) {
        if (DEBUG_FILTERING) console.log(`🛡️ Default filtering: "${game.name}" - Fan content by unknown company policy`);
        return true;
      }
      
      if (hasProtectedFranchise) {
        if (DEBUG_FILTERING) console.log(`⚠️ Default filtering: "${game.name}" - Protected franchise by unknown company`);
        return true;
      }
      
      return false;
  }
  
  // DEBUG: Log if samus/metroid game passes through all filters
  if (searchText.includes('samus') || searchText.includes('metroid')) {
    if (DEBUG_FILTERING) console.log(`✅ PASSED FILTER: "${game.name}" - Level: ${maxCopyrightLevel}, Company: ${responsibleCompany}`);
  }
  
  return false;
}

/**
 * Check if a DLC is a major expansion that should be kept
 */
function isMajorExpansion(game: Game): boolean {
  const name = game.name.toLowerCase();
  const summary = (game.summary || '').toLowerCase();
  
  // Major expansion keywords that indicate substantial content
  const majorExpansionKeywords = [
    // Classic major expansions
    'expansion', 'dawnguard', 'dragonborn', 'shivering isles', 'knights of the nine',
    'blood and wine', 'hearts of stone', 'far harbor', 'nuka-world',
    'gods and monsters', 'frozen throne', 'lord of destruction',
    'burning crusade', 'wrath of the lich king', 'cataclysm', 'mists of pandaria',
    'warlords of draenor', 'legion', 'battle for azeroth', 'shadowlands',
    
    // Campaign/story expansions
    'campaign', 'story expansion', 'new story', 'additional campaign',
    'episode', 'chapter', 'saga', 'chronicles',
    
    // Major content indicators
    'new world', 'new region', 'new area', 'new continent', 'new island',
    'new campaign', 'new storyline', 'new adventure',
    
    // Size indicators
    'large expansion', 'major expansion', 'full expansion', 'massive expansion',
    'substantial content', 'dozens of hours', 'hours of content',
    
    // Franchise-specific major DLCs
    'old world blues', 'dead money', 'honest hearts', 'lonesome road',
    'mothership zeta', 'point lookout', 'the pitt', 'broken steel',
    'awakening', 'golems of amgarrak', 'witch hunt', 'legacy',
    'mark of the assassin', 'sebastian', 'exiled prince'
  ];
  
  // Check if the name or summary contains major expansion indicators
  const hasMajorKeywords = majorExpansionKeywords.some(keyword => 
    name.includes(keyword) || summary.includes(keyword)
  );
  
  if (hasMajorKeywords) {
    return true;
  }
  
  // Small DLC indicators that should be filtered
  const smallDLCKeywords = [
    'skin pack', 'cosmetic', 'outfit', 'costume', 'weapon pack',
    'character pack', 'map pack', 'level pack', 'challenge pack',
    'booster pack', 'starter pack', 'digital deluxe upgrade',
    'season pass', 'battle pass', 'premium upgrade',
    'texture pack', 'sound pack', 'music pack', 'soundtrack',
    'avatar', 'profile', 'theme', 'wallpaper', 'icon pack'
  ];
  
  const hasSmallDLCKeywords = smallDLCKeywords.some(keyword => 
    name.includes(keyword) || summary.includes(keyword)
  );
  
  if (hasSmallDLCKeywords) {
    return false; // Definitely small DLC
  }
  
  // If no clear indicators, assume it's small DLC for Category 1
  return false;
}

/**
 * Filter out fan games and e-reader content specifically
 * This is a more targeted filter for search results
 * Respects manual admin flags: greenlight_flag overrides to keep, redlight_flag overrides to filter
 */
export function filterFanGamesAndEReaderContent(games: Game[]): Game[] {
  return games.filter(game => {
    // Check manual admin flags first
    if (game.greenlight_flag === true) {
      if (DEBUG_FILTERING) if (DEBUG_FILTERING) console.log(`✅ GREENLIGHT: Keeping "${game.name}" - admin override to always show`);
      return true; // Admin explicitly wants this game shown
    }
    
    if (game.redlight_flag === true) {
      if (DEBUG_FILTERING) if (DEBUG_FILTERING) console.log(`🚫 REDLIGHT: Filtering "${game.name}" - admin override to always hide`);
      return false; // Admin explicitly wants this game hidden
    }
    const name = game.name.toLowerCase();
    const developer = (game.developer || '').toLowerCase();
    const publisher = (game.publisher || '').toLowerCase();
    const summary = (game.summary || '').toLowerCase();
    
    // Filter e-reader content
    // Check for e-reader patterns in name
    const eReaderPatterns = [
      '-e ', // e.g., "Mario Party-e "
      '-e$', // ends with -e
      'pokémon-e',
      'pokemon-e',
      'e-reader',
      'e reader',
      'ereader'
    ];
    
    for (const pattern of eReaderPatterns) {
      if (pattern.endsWith('$')) {
        if (name.endsWith(pattern.slice(0, -1))) {
          if (DEBUG_FILTERING) console.log(`🎴 E-READER FILTER: Filtering "${game.name}" - e-reader content`);
          return false;
        }
      } else if (name.includes(pattern)) {
        if (DEBUG_FILTERING) console.log(`🎴 E-READER FILTER: Filtering "${game.name}" - e-reader content`);
        return false;
      }
    }
    
    // Check for e-reader in summary (but be more specific to avoid false positives)
    // Only filter if it's primarily about e-reader cards, not just mentioning them
    if ((summary.includes('e-reader cards featuring') || 
         summary.includes('e reader cards featuring') ||
         summary.includes('card game for the e-reader') || 
         summary.includes('e-reader version') ||
         (summary.startsWith('e-reader') && summary.includes('card')))) {
      if (DEBUG_FILTERING) console.log(`🎴 E-READER FILTER: Filtering "${game.name}" - e-reader card content in summary`);
      return false;
    }
    
    // Filter fan games
    // Category 5 is mod/fan game
    if (game.category === 5) {
      if (DEBUG_FILTERING) console.log(`🎮 FAN GAME FILTER: Filtering "${game.name}" - Category 5 (Mod/Fan Game)`);
      return false;
    }
    
    // Check for fan game keywords in publisher/developer
    const fanGameIndicators = [
      'fan game', 'fangame', 'fan-game', 'fan made', 'fan-made', 'fanmade',
      'fan project', 'fan team', 'community', 'homebrew', 'rom hack', 'romhack',
      'unofficial', 'tribute', 'remake by', 'inspired by'
    ];
    
    for (const indicator of fanGameIndicators) {
      if (developer.includes(indicator) || publisher.includes(indicator)) {
        if (DEBUG_FILTERING) console.log(`🎮 FAN GAME FILTER: Filtering "${game.name}" - Fan game indicator in developer/publisher`);
        return false;
      }
    }
    
    // Check for specific known fan games by name patterns
    const knownFanGames = [
      // Mario fan games
      'super mario bros. x', 'mario forever', 'another mario',
      'mario worker', 'psycho waluigi', 'toad strikes back',
      
      // Zelda fan games (be careful not to match official games)
      'zelda classic', 'zelda: mystery of solarus', 'zelda fan',
      'zelda: oni link', 'zelda: time to triumph',
      
      // Pokemon fan games
      'pokemon uranium', 'pokemon insurgence', 'pokemon prism',
      'pokemon light platinum', 'pokemon glazed', 'pokemon reborn',
      'pokemon rejuvenation', 'pokemon phoenix rising', 'pokemon sage',
      'pokemon solar light', 'pokemon lunar dark', 'pokemon clover',
      
      // Metroid fan games
      'am2r', 'another metroid', 'metroid prime 2d', 'metroid: rogue',
      'metroid confrontation', 'metroid sr388', 'hyper metroid',
      
      // Sonic fan games
      'sonic before', 'sonic after', 'sonic chrono', 'sonic robo',
      'sonic utopia', 'sonic world', 'sonic fan', 'sonic mania plus fan',
      
      // Other franchise fan games
      'mega man unlimited', 'mega man revolution', 'street fighter x mega',
      'chrono trigger: crimson', 'mother 4', 'oddity'
    ];
    
    for (const fanGame of knownFanGames) {
      if (name.includes(fanGame)) {
        if (DEBUG_FILTERING) console.log(`🎮 FAN GAME FILTER: Filtering "${game.name}" - Known fan game`);
        return false;
      }
    }
    
    // Check for suspicious patterns that indicate fan games
    // e.g., famous franchises with unknown publishers
    const protectedFranchises = ['mario', 'zelda', 'metroid', 'pokemon', 'pokémon', 'sonic', 'mega man', 'kirby'];
    const officialPublishers = ['nintendo', 'sega', 'capcom', 'game freak', 'retro studios', 'hal laboratory', 'sonic team'];
    
    for (const franchise of protectedFranchises) {
      if (name.includes(franchise)) {
        // Check if it's from an official publisher
        const hasOfficialPublisher = officialPublishers.some(pub => 
          developer.includes(pub) || publisher.includes(pub)
        );
        
        // If it's a protected franchise but not from official publisher, check more carefully
        if (!hasOfficialPublisher) {
          // Check for obvious fan game patterns
          if (name.includes('fan') || name.includes('remake') || name.includes('redux') || 
              name.includes('reborn') || name.includes('revolution') || name.includes('unlimited')) {
            if (DEBUG_FILTERING) console.log(`🎮 FAN GAME FILTER: Filtering "${game.name}" - ${franchise} fan game pattern`);
            return false;
          }
          
          // Check if publisher/developer is suspicious
          if (publisher === '' || developer === '' || 
              publisher.includes('unknown') || developer.includes('unknown') ||
              publisher.includes('indie') || developer.includes('indie')) {
            if (DEBUG_FILTERING) console.log(`🎮 FAN GAME FILTER: Filtering "${game.name}" - Suspicious ${franchise} game from unknown publisher`);
            return false;
          }
        }
      }
    }
    
    return true; // Keep the game
  });
}

/**
 * Filter out problematic fan-made content, collections, ports, and small DLC from a list of games
 * Respects manual admin flags: greenlight_flag overrides to keep, redlight_flag overrides to filter
 */
export function filterProtectedContent(games: Game[]): Game[] {
  // Enhanced filtering for mods, fan content, collections, and ports
  const filtered = games.filter(game => {
    // Check manual admin flags first
    if (game.greenlight_flag === true) {
      if (DEBUG_FILTERING) if (DEBUG_FILTERING) console.log(`✅ GREENLIGHT: Keeping "${game.name}" - admin override to always show`);
      return true; // Admin explicitly wants this game shown
    }
    
    if (game.redlight_flag === true) {
      if (DEBUG_FILTERING) if (DEBUG_FILTERING) console.log(`🚫 REDLIGHT: Filtering "${game.name}" - admin override to always hide`);
      return false; // Admin explicitly wants this game hidden
    }
    
    // QUALITY EXEMPTION: High-quality games bypass most filters
    const hasHighQuality = (game.total_rating && game.total_rating > 70) &&
                          (game.rating_count && game.rating_count > 50);
    const isVeryPopular = game.follows && game.follows > 1000;
    const hasStrongMetrics = hasHighQuality || isVeryPopular;

    // Main games with strong metrics always pass
    if (hasStrongMetrics && game.category === 0) {
      if (DEBUG_FILTERING) console.log(`⭐ QUALITY EXEMPTION: Keeping high-quality game "${game.name}" (Rating: ${game.total_rating}, Reviews: ${game.rating_count})`);
      return true;
    }

    // Filter out IGDB category 5 (Mods) explicitly - no quality override for mods
    if (game.category === 5) {
      if (DEBUG_FILTERING) console.log(`🚫 MOD FILTER: Filtering out mod "${game.name}" (Category 5)`);
      return false;
    }

    // Quality-based filtering for collections, remasters, and ports
    // Allow high-quality collections/bundles (Category 3)
    if (game.category === 3) {
      if (hasStrongMetrics) {
        if (DEBUG_FILTERING) console.log(`⭐ QUALITY COLLECTION: Keeping popular collection "${game.name}" (Rating: ${game.total_rating}, Follows: ${game.follows})`);
        return true;
      }
      if (DEBUG_FILTERING) console.log(`📦 COLLECTION FILTER: Filtering low-quality collection "${game.name}" (Category 3)`);
      return false;
    }

    // Allow high-quality ports (Category 11)
    if (game.category === 11) {
      if (hasStrongMetrics) {
        if (DEBUG_FILTERING) console.log(`⭐ QUALITY PORT: Keeping popular port "${game.name}" (Rating: ${game.total_rating}, Follows: ${game.follows})`);
        return true;
      }
      if (DEBUG_FILTERING) console.log(`🔄 PORT FILTER: Filtering low-quality port "${game.name}" (Category 11)`);
      return false;
    }

    // Allow high-quality remasters (Category 9)
    if (game.category === 9) {
      if (hasStrongMetrics) {
        if (DEBUG_FILTERING) console.log(`⭐ QUALITY REMASTER: Keeping popular remaster "${game.name}" (Rating: ${game.total_rating}, Follows: ${game.follows})`);
        return true;
      }
      if (DEBUG_FILTERING) console.log(`✨ REMASTER FILTER: Filtering low-quality remaster "${game.name}" (Category 9)`);
      return false;
    }

    // Allow high-quality packs (Category 13)
    if (game.category === 13) {
      if (hasStrongMetrics) {
        if (DEBUG_FILTERING) console.log(`⭐ QUALITY PACK: Keeping popular pack "${game.name}" (Rating: ${game.total_rating}, Follows: ${game.follows})`);
        return true;
      }
      if (DEBUG_FILTERING) console.log(`📦 PACK FILTER: Filtering low-quality pack "${game.name}" (Category 13)`);
      return false;
    }
    
    // Filter out IGDB category 1 (DLC/Add-on) UNLESS it's a major expansion
    if (game.category === 1) {
      const isMajor = isMajorExpansion(game);
      if (isMajor) {
        if (DEBUG_FILTERING) console.log(`🎮 MAJOR DLC KEPT: Keeping major expansion "${game.name}" (Category 1)`);
        // Don't filter out major expansions
      } else {
        if (DEBUG_FILTERING) console.log(`🚫 DLC FILTER: Filtering out small DLC "${game.name}" (Category 1)`);
        return false;
      }
    }
    
    // Keep Category 2 (Expansion) and Category 4 (Standalone expansion) - these are always substantial
    if (game.category === 2) {
      if (DEBUG_FILTERING) console.log(`✅ EXPANSION KEPT: Keeping expansion "${game.name}" (Category 2)`);
    }
    if (game.category === 4) {
      if (DEBUG_FILTERING) console.log(`✅ STANDALONE EXPANSION KEPT: Keeping standalone expansion "${game.name}" (Category 4)`);
    }
    
    // Filter out games with explicit mod indicators in the name
    const name = game.name.toLowerCase();
    const modIndicators = ['mod', 'hack', 'rom hack', 'romhack', 'fan game', 'fangame', 'homebrew', 'unofficial'];
    
    if (modIndicators.some(indicator => name.includes(indicator))) {
      if (DEBUG_FILTERING) console.log(`🚫 NAME FILTER: Filtering out mod/fan game "${game.name}"`);
      return false;
    }
    
    // Quality-based filtering for collection-named games
    // Only filter if BOTH collection indicator AND low quality
    const collectionIndicators = [
      'collection', 'compilation', 'anthology', 'bundle',
      'trilogy', 'quadrilogy', 'complete edition', 'definitive edition',
      'all-stars', 'hd collection', 'classics', 'legacy collection',
      'master collection', 'anniversary collection', 'ultimate collection',
      'remastered', 'remaster', 'hd remaster', 'enhanced edition',
      'special edition', 'game of the year edition', 'goty edition'
    ];

    if (collectionIndicators.some(indicator => name.includes(indicator))) {
      // Check quality metrics before filtering
      const hasGoodQuality = (game.total_rating && game.total_rating > 75) ||
                            (game.follows && game.follows > 500);

      if (hasGoodQuality) {
        if (DEBUG_FILTERING) console.log(`⭐ QUALITY COLLECTION NAME: Keeping "${game.name}" - high quality metrics override name filter`);
        return true;
      }

      if (DEBUG_FILTERING) console.log(`📦 COLLECTION NAME FILTER: Filtering low-quality collection "${game.name}"`);
      return false;
    }
    
    // Use the more comprehensive filtering logic for other content
    return !shouldFilterContent(game);
  });
  
  if (DEBUG_FILTERING) console.log(`🛡️ Content filter: ${games.length} → ${filtered.length} games (filtered ${games.length - filtered.length} items)`);
  return filtered;
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
    if (DEBUG_FILTERING) console.log(`Game: ${game.name} (${game.developer}) → Filtered: ${result.filtered}`);
    if (result.filtered) {
      if (DEBUG_FILTERING) console.log(`  Reasons: Fan-made: ${result.isFanMade}, Protected: ${result.isProtectedFranchise}, Official SE: ${result.isOfficialSquareEnix}`);
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
        (level === CopyrightLevel.MODERATE && maxCopyrightLevel !== CopyrightLevel.AGGRESSIVE && maxCopyrightLevel !== CopyrightLevel.BLOCK_ALL)) {
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
  if (DEBUG_FILTERING) console.log(`🚨 DMCA RESPONSE: Adding ${companyName} to aggressive filtering`);
  addAggressiveCompany(companyName, reason, franchises);
  
  // Optionally clear any cached game data that might contain newly-filtered content
  if (typeof window !== 'undefined' && window.localStorage) {
    // Clear search cache to ensure filtered content doesn't show up
    const cacheKeys = Object.keys(window.localStorage).filter(key => 
      key.includes('game_search') || key.includes('igdb_cache')
    );
    cacheKeys.forEach(key => window.localStorage.removeItem(key));
    if (DEBUG_FILTERING) console.log(`🧹 Cleared ${cacheKeys.length} cache entries`);
  }
}

/**
 * Emergency total block for extreme cases
 * Use this only for companies that demand complete removal of all content
 */
export function handleEmergencyBlock(companyName: string, reason: string): void {
  if (DEBUG_FILTERING) console.log(`🔒 EMERGENCY BLOCK: Completely blocking all content from ${companyName}`);
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
      if (DEBUG_FILTERING) console.log(`🛡️ Hiding fan content for "${game.name}" due to ${company} policy: ${level}`);
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

/**
 * Test enhanced AGGRESSIVE filtering with real-world examples
 */
export function testEnhancedAggressiveFiltering(): void {
  console.log('🧪 Testing Enhanced AGGRESSIVE Filtering:');
  
  const testCases = [
    // Nintendo franchise tests - IGDB Category 5 (Mod)
    {
      name: "Metroid mod: Samus Goes to the Fridge to Get a Glass of Milk",
      developer: "Fan Developer",
      publisher: "N/A",
      summary: "A humorous mod for Metroid where Samus goes to get milk",
      category: 5  // IGDB Category 5 = Mod
    },
    {
      name: "Super Mario Bros. 3 Mix",
      developer: "Community",
      publisher: "Homebrew",
      summary: "Modified version of SMB3 with new levels and mechanics",
      category: 5  // IGDB Category 5 = Mod
    },
    {
      name: "Pokemon Crystal Clear",
      developer: "ShockSlayer",
      publisher: "RomHack",
      summary: "A ROM hack of Pokemon Crystal with open world gameplay",
      category: 5  // IGDB Category 5 = Mod
    },
    {
      name: "Super Mario Odyssey",
      developer: "Nintendo EPD",
      publisher: "Nintendo",
      summary: "Official Nintendo platformer game",
      category: 0  // IGDB Category 0 = Main Game
    },
    {
      name: "Metroid Prime",
      developer: "Retro Studios",
      publisher: "Nintendo", 
      summary: "Official Nintendo first-person adventure game"
    },
    {
      name: "Pokemon Legends: Arceus",
      developer: "Game Freak",
      publisher: "Nintendo",
      summary: "Official Pokemon game published by Nintendo"
    },
    
    // Square Enix franchise tests
    {
      name: "Final Fantasy VII: Last Order",
      developer: "Fan Studio",
      publisher: "Independent",
      summary: "Unofficial remake of Final Fantasy VII"
    },
    {
      name: "Final Fantasy VII Remake",
      developer: "Square Enix Creative Business Unit I",
      publisher: "Square Enix",
      summary: "Official remake by Square Enix"
    },
    
    // Disney franchise tests  
    {
      name: "Star Wars: Fan Edit - The Phantom Hope",
      developer: "Fan Creator",
      publisher: "Unofficial",
      summary: "Fan-made modification of Star Wars content"
    },
    {
      name: "Star Wars Jedi: Survivor",
      developer: "Respawn Entertainment",
      publisher: "Electronic Arts",
      summary: "Official Star Wars game - but EA not authorized for Star Wars!"
    },
    {
      name: "Star Wars: Knights of the Old Republic",
      developer: "BioWare",
      publisher: "LucasArts",
      summary: "Official Star Wars game by authorized publisher"
    },
    
    // Mod-friendly company tests (should NOT be filtered)
    {
      name: "Skyrim: Thomas the Tank Engine Mod",
      developer: "Community Modder",  
      publisher: "Nexus Mods",
      summary: "Popular Skyrim mod replacing dragons with Thomas",
      category: 5  // IGDB Category 5 = Mod - but Bethesda is MOD_FRIENDLY
    }
  ];
  
  testCases.forEach((testGame, index) => {
    if (DEBUG_FILTERING) console.log(`\n--- Test ${index + 1}: ${testGame.name} ---`);
    
    const game = {
      id: index + 1,
      name: testGame.name,
      developer: testGame.developer,
      publisher: testGame.publisher,
      summary: testGame.summary
    };
    
    // Test franchise detection
    const franchiseOwner = findFranchiseOwner(game);
    if (franchiseOwner) {
      if (DEBUG_FILTERING) console.log(`🎯 Franchise Owner: ${franchiseOwner}`);
      
      // Test authorization
      const isAuthorized = isAuthorizedPublisher(game.developer || '', game.publisher || '', franchiseOwner);
      if (DEBUG_FILTERING) console.log(`🔐 Authorized Publisher: ${isAuthorized}`);
    }
    
    // Test mod detection
    const hasModIndicators = hasEnhancedModIndicators(game);
    if (DEBUG_FILTERING) console.log(`🔧 Mod Detected: ${hasModIndicators}`);
    
    // Test final filtering decision
    const isFiltered = shouldFilterContent(game);
    if (DEBUG_FILTERING) console.log(`🛡️ FINAL RESULT: ${isFiltered ? '❌ FILTERED' : '✅ ALLOWED'}`);
    
    console.log('---');
  });
  
  console.log('\n🏁 Enhanced AGGRESSIVE filtering test completed!');
}

/**
 * Quick test for specific mod patterns
 */
export function testModDetectionPatterns(): void {
  console.log('🧪 Testing Mod Detection Patterns:');
  
  const modTitles = [
    "Metroid mod: Samus Goes to the Fridge",
    "Super Mario Bros. 3 Mix", 
    "Pokemon Crystal Clear ROM Hack",
    "Zelda: Breath of the Wild Graphics Mod",
    "Mario Kart 8 Custom Tracks",
    "Skyrim: Enhanced Edition Overhaul",
    "Final Fantasy VII - Cloud Mod",
    // Should NOT be detected as mods:
    "Super Mario Odyssey",
    "The Elder Scrolls V: Skyrim",
    "Metroid Prime Remastered"
  ];
  
  modTitles.forEach(title => {
    const testGame = { id: 1, name: title, developer: 'Test', publisher: 'Test' };
    const isModDetected = hasEnhancedModIndicators(testGame);
    if (DEBUG_FILTERING) console.log(`"${title}" → Mod Detected: ${isModDetected ? '✅' : '❌'}`);
  });
}

/**
 * Get copyright information for a game based on its companies
 * Used for diagnostic display purposes
 */
export function getGameCopyrightInfo(game: Game): {
  level: CopyrightLevel;
  reason: string;
  company: string;
} {
  const companies = getGameCompanies(game);
  const searchText = [game.name, game.developer, game.publisher, game.summary, game.description]
    .filter(Boolean).join(' ').toLowerCase();
  
  let maxCopyrightLevel = CopyrightLevel.MODERATE;
  let responsibleCompany = '';
  
  // Check direct company copyright levels
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
  
  // Check franchise ownership
  let franchiseOwner = findFranchiseOwner(game, searchText);
  if (franchiseOwner) {
    const franchiseLevel = getCompanyCopyrightLevel(franchiseOwner);
    
    if (franchiseLevel === CopyrightLevel.BLOCK_ALL ||
        (franchiseLevel === CopyrightLevel.AGGRESSIVE && maxCopyrightLevel !== CopyrightLevel.BLOCK_ALL) ||
        (franchiseLevel === CopyrightLevel.MOD_FRIENDLY)) {
      maxCopyrightLevel = franchiseLevel;
      responsibleCompany = franchiseOwner;
    }
  }
  
  return {
    level: maxCopyrightLevel,
    reason: getPolicyReason(responsibleCompany),
    company: responsibleCompany
  };
}