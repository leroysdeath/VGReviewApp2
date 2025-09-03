/**
 * Company Copyright Aggression Mapping
 * 
 * This file defines how aggressively different companies protect their IP.
 * Edit this file to quickly adjust filtering when receiving DMCAs.
 * 
 * Categories:
 * - BLOCK_ALL: Filter both official and fan content (extreme cases)
 * - AGGRESSIVE: Filter fan content, allow official games
 * - MODERATE: Filter obvious fan content only  
 * - MOD_FRIENDLY: Allow fan content and mods
 */

export enum CopyrightLevel {
  BLOCK_ALL = 'BLOCK_ALL',           // Block everything from this company
  AGGRESSIVE = 'AGGRESSIVE',         // Block fan content, allow official
  MODERATE = 'MODERATE',             // Block obvious fan content only
  MOD_FRIENDLY = 'MOD_FRIENDLY'      // Allow fan content and mods
}

export interface CompanyPolicy {
  level: CopyrightLevel;
  reason: string;
  lastUpdated: string;
  franchises?: string[];  // Specific franchises this applies to
}

/**
 * Company Copyright Policy Database
 * 
 * To handle a DMCA:
 * 1. Add/update the company here
 * 2. Set appropriate CopyrightLevel
 * 3. Add reason and date
 * 4. Restart the app - changes take effect immediately
 */
export const COMPANY_COPYRIGHT_POLICIES: Record<string, CompanyPolicy> = {

  // ===== BLOCK_ALL (Extreme - Filter everything) =====
  // Use this for companies that are extremely litigious about everything
  
  // No companies in this category yet - add here if needed for DMCA response

  // ===== AGGRESSIVE (Filter fan content, allow official) =====
  
  // Nintendo - Extremely protective of all IP
  'nintendo': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Extremely aggressive about fan games, ROM hacks, mods',
    lastUpdated: '2024-01-20',
    franchises: ['mario', 'zelda', 'pokemon', 'metroid', 'kirby', 'donkey kong', 'star fox', 'fire emblem']
  },
  'game freak': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Nintendo subsidiary - Pokemon IP protection',
    lastUpdated: '2024-01-20'
  },
  'hal laboratory': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Nintendo subsidiary - Kirby IP protection',
    lastUpdated: '2024-01-20'
  },
  'intelligent systems': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Nintendo subsidiary - Fire Emblem IP protection',
    lastUpdated: '2024-01-20'
  },
  'retro studios': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Nintendo subsidiary - Metroid IP protection',
    lastUpdated: '2024-01-20'
  },
  'the pokémon company': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Nintendo affiliate - Pokemon IP protection',
    lastUpdated: '2024-01-20'
  },

  // Square Enix - Protective of Final Fantasy, Dragon Quest
  'square enix': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Protective of Final Fantasy, Dragon Quest, Kingdom Hearts',
    lastUpdated: '2024-01-20',
    franchises: ['final fantasy', 'dragon quest', 'kingdom hearts', 'chrono trigger']
  },
  'square': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Legacy Square company - same policies as Square Enix',
    lastUpdated: '2024-01-20'
  },
  'enix': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Legacy Enix company - same policies as Square Enix',
    lastUpdated: '2024-01-20'
  },
  'squaresoft': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Legacy Square company - same policies as Square Enix',
    lastUpdated: '2024-01-20'
  },

  // Capcom - Frequently strikes fan projects
  'capcom': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Known for C&D letters against fan projects',
    lastUpdated: '2024-01-20',
    franchises: ['mega man', 'street fighter', 'resident evil', 'monster hunter']
  },

  // Disney - Very aggressive about IP protection
  'disney': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Extremely protective of all Disney IP',
    lastUpdated: '2024-01-20',
    franchises: ['mickey mouse', 'disney']
  },
  'disney interactive': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Disney subsidiary',
    lastUpdated: '2024-01-20'
  },
  'lucasfilm': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Disney subsidiary - Star Wars IP protection',
    lastUpdated: '2024-01-20',
    franchises: ['star wars']
  },

  // Take-Two/Rockstar - Known for C&D letters
  'take-two interactive': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Known for aggressive action against mods',
    lastUpdated: '2024-01-20'
  },
  'rockstar games': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Take-Two subsidiary - aggressive about GTA mods',
    lastUpdated: '2024-01-20',
    franchises: ['grand theft auto', 'red dead']
  },
  'rockstar north': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Rockstar subsidiary',
    lastUpdated: '2024-01-20'
  },

  // Konami - Aggressive about Metal Gear, Castlevania
  'konami': {
    level: CopyrightLevel.AGGRESSIVE,
    reason: 'Protective of Metal Gear, Castlevania franchises',
    lastUpdated: '2024-01-20',
    franchises: ['metal gear', 'castlevania', 'silent hill']
  },

  // ===== MODERATE (Filter obvious fan content only) =====
  
  // Sony - Varies by franchise
  'sony interactive entertainment': {
    level: CopyrightLevel.MODERATE,
    reason: 'Generally moderate, varies by franchise',
    lastUpdated: '2024-01-20'
  },
  'sony computer entertainment': {
    level: CopyrightLevel.MODERATE,
    reason: 'Legacy Sony gaming division',
    lastUpdated: '2024-01-20'
  },

  // Microsoft/Xbox - Generally moderate
  'microsoft game studios': {
    level: CopyrightLevel.MODERATE,
    reason: 'Generally moderate about fan content',
    lastUpdated: '2024-01-20'
  },
  'xbox game studios': {
    level: CopyrightLevel.MODERATE,
    reason: 'Microsoft gaming division - generally moderate',
    lastUpdated: '2024-01-20'
  },

  // EA - Varies by property
  'electronic arts': {
    level: CopyrightLevel.MODERATE,
    reason: 'Moderate enforcement, varies by franchise',
    lastUpdated: '2024-01-20'
  },
  'ea games': {
    level: CopyrightLevel.MODERATE,
    reason: 'EA subsidiary',
    lastUpdated: '2024-01-20'
  },

  // Ubisoft - Generally moderate
  'ubisoft': {
    level: CopyrightLevel.MODERATE,
    reason: 'Generally moderate about fan content',
    lastUpdated: '2024-01-20'
  },

  // Activision Blizzard - Depends on franchise
  'activision': {
    level: CopyrightLevel.MODERATE,
    reason: 'Moderate enforcement, depends on franchise',
    lastUpdated: '2024-01-20'
  },
  'blizzard entertainment': {
    level: CopyrightLevel.MODERATE,
    reason: 'Activision subsidiary - moderate enforcement',
    lastUpdated: '2024-01-20'
  },

  // ===== MOD_FRIENDLY (Allow fan content and mods) =====

  // Bethesda - Actively supports modding
  'bethesda game studios': {
    level: CopyrightLevel.MOD_FRIENDLY,
    reason: 'Actively supports and encourages modding (Skyrim, Fallout)',
    lastUpdated: '2024-01-20',
    franchises: ['elder scrolls', 'fallout', 'skyrim']
  },
  'bethesda softworks': {
    level: CopyrightLevel.MOD_FRIENDLY,
    reason: 'Publisher - supports modding ecosystem',
    lastUpdated: '2024-01-20'
  },

  // Sega - Generally tolerant of fan games
  'sega': {
    level: CopyrightLevel.MOD_FRIENDLY,
    reason: 'Historically tolerant of Sonic fan games and mods',
    lastUpdated: '2024-01-20',
    franchises: ['sonic']
  },

  // Valve - Supports community content
  'valve': {
    level: CopyrightLevel.MOD_FRIENDLY,
    reason: 'Built Steam Workshop, encourages community content',
    lastUpdated: '2024-01-20',
    franchises: ['half-life', 'portal', 'counter-strike']
  },

  // id Software - Historically mod-friendly
  'id software': {
    level: CopyrightLevel.MOD_FRIENDLY,
    reason: 'Pioneered modding with Doom, Quake - very mod-friendly',
    lastUpdated: '2024-01-20',
    franchises: ['doom', 'quake', 'wolfenstein']
  },

  // CD Projekt RED - Supports modding
  'cd projekt red': {
    level: CopyrightLevel.MOD_FRIENDLY,
    reason: 'Actively supports modding (Witcher, Cyberpunk)',
    lastUpdated: '2024-01-20',
    franchises: ['witcher', 'cyberpunk']
  },
  'cd projekt': {
    level: CopyrightLevel.MOD_FRIENDLY,
    reason: 'Parent company of CD Projekt RED',
    lastUpdated: '2024-01-20'
  },

  // Mojang/Microsoft - Minecraft mod ecosystem
  'mojang': {
    level: CopyrightLevel.MOD_FRIENDLY,
    reason: 'Minecraft built around modding ecosystem',
    lastUpdated: '2024-01-20',
    franchises: ['minecraft']
  },

  // Paradox - Heavy mod support
  'paradox interactive': {
    level: CopyrightLevel.MOD_FRIENDLY,
    reason: 'Strategy games built around modding (EU4, CK3, Stellaris)',
    lastUpdated: '2024-01-20'
  },
  'paradox development studio': {
    level: CopyrightLevel.MOD_FRIENDLY,
    reason: 'Paradox subsidiary',
    lastUpdated: '2024-01-20'
  }
};

/**
 * Get copyright policy for a company
 */
export function getCompanyCopyrightLevel(companyName: string): CopyrightLevel {
  if (!companyName) return CopyrightLevel.MODERATE;
  
  const normalized = companyName.toLowerCase().trim();
  const policy = COMPANY_COPYRIGHT_POLICIES[normalized];
  
  return policy ? policy.level : CopyrightLevel.MODERATE;
}

/**
 * Check if a company has a specific franchise restriction
 */
export function hasSpecificFranchiseRestrictions(companyName: string, gameTitle: string): boolean {
  if (!companyName) return false;
  
  const normalized = companyName.toLowerCase().trim();
  const policy = COMPANY_COPYRIGHT_POLICIES[normalized];
  
  if (!policy || !policy.franchises) return false;
  
  const gameTitleLower = gameTitle.toLowerCase();
  return policy.franchises.some(franchise => gameTitleLower.includes(franchise));
}

/**
 * Get policy reason for debugging/logging
 */
export function getPolicyReason(companyName: string): string {
  if (!companyName) return 'Unknown company - using moderate policy';
  
  const normalized = companyName.toLowerCase().trim();
  const policy = COMPANY_COPYRIGHT_POLICIES[normalized];
  
  return policy ? policy.reason : 'Not in policy database - using moderate policy';
}

/**
 * Quick DMCA response - add a company to aggressive filtering
 * Use this when you receive a DMCA and need immediate action
 */
export function addAggressiveCompany(
  companyName: string, 
  reason: string, 
  franchises?: string[]
): void {
  const normalized = companyName.toLowerCase().trim();
  
  COMPANY_COPYRIGHT_POLICIES[normalized] = {
    level: CopyrightLevel.AGGRESSIVE,
    reason: `DMCA Response: ${reason}`,
    lastUpdated: new Date().toISOString().split('T')[0],
    franchises: franchises
  };
  
  console.log(`🚨 Added ${companyName} to aggressive filtering due to: ${reason}`);
}

/**
 * Emergency block-all for extreme cases
 */
export function blockCompanyCompletely(companyName: string, reason: string): void {
  const normalized = companyName.toLowerCase().trim();
  
  COMPANY_COPYRIGHT_POLICIES[normalized] = {
    level: CopyrightLevel.BLOCK_ALL,
    reason: `EMERGENCY BLOCK: ${reason}`,
    lastUpdated: new Date().toISOString().split('T')[0]
  };
  
  console.log(`🔒 EMERGENCY: Completely blocked ${companyName} due to: ${reason}`);
}

/**
 * First and Second Party Company Ownership Database
 * Maps major copyright holders to their owned/controlled subsidiaries and authorized developers
 */
export const COMPANY_OWNERSHIP: Record<string, {
  firstParty: string[];
  secondParty: string[];
  franchises: string[];
}> = {
  // Nintendo's First & Second Party Network
  'nintendo': {
    firstParty: [
      'nintendo', 'nintendo co', 'nintendo co.', 'nintendo of america', 'nintendo of europe',
      'nintendo ead', 'nintendo epd', 'nintendo entertainment planning & development',
      'nintendo r&d1', 'nintendo r&d2', 'nintendo r&d3', 'nintendo r&d4',
      'nintendo software planning & development', 'nintendo spd',
      'nintendo software technology', 'nst'
    ],
    secondParty: [
      'game freak', 'gamefreak', 'hal laboratory', 'hal lab',
      'intelligent systems', 'retro studios', 'creatures inc', 'creatures',
      'the pokémon company', 'pokemon company', 'the pokemon company',
      'pokémon company', 'pokemon company international', 'the pokémon company international',
      'the pokemon company international', 'pokémon company international',
      'nintendo/the pokemon company', 'nintendo/the pokémon company',
      'camelot software planning', 'monolith soft', 'monolithsoft', 'brownie brown', '1-up studio',
      'skip ltd', 'skip', 'nd cube', 'arika', 'grezzo',
      'next level games', 'good-feel', 'tantalus media'
    ],
    franchises: [
      'mario', 'super mario', 'zelda', 'legend of zelda', 'pokemon', 'pokémon',
      'metroid', 'kirby', 'donkey kong', 'star fox', 'fire emblem',
      'xenoblade', 'splatoon', 'animal crossing', 'pikmin', 'f-zero',
      'earthbound', 'mother', 'smash bros', 'super smash bros', 'arms',
      'nintendo land', 'wii sports', 'wii play', 'wii fit', 'mario kart',
      'mario party', 'paper mario', 'luigi\'s mansion'
    ]
  },

  // Square Enix Network
  'square enix': {
    firstParty: [
      'square enix', 'square', 'enix', 'squaresoft', 'square soft',
      'square enix holdings', 'square enix montreal', 'square enix europe',
      'square enix inc', 'square enix ltd', 'square enix co', 'square enix co.',
      'square co', 'square co.', 'enix corporation', 'enix corp',
      'square enix business division', 'creative business unit',
      'luminous productions'
    ],
    secondParty: [
      'tri-ace', 'platinum games', 'artdink', 'h.a.n.d.',
      'matrix software', 'acquire corp', 'acquire', 'media.vision',
      'tose', 'think & feel', 'soleil', 'studio istolia'
    ],
    franchises: [
      'final fantasy', 'ff', 'dragon quest', 'chrono trigger', 'chrono cross',
      'secret of mana', 'seiken densetsu', 'kingdom hearts', 'nier', 'drakengard',
      'tomb raider', 'just cause', 'deus ex', 'life is strange',
      'the world ends with you', 'twewy', 'bravely default', 'octopath traveler',
      'trials of mana', 'live a live', 'romancing saga', 'saga frontier',
      'valkyrie profile', 'star ocean', 'front mission', 'vagrant story'
    ]
  },

  // Disney's Network
  'disney': {
    firstParty: [
      'disney', 'disney interactive', 'disney interactive studios',
      'walt disney company', 'disney enterprises'
    ],
    secondParty: [
      'lucasfilm', 'lucasfilm games', 'marvel entertainment', 'marvel games',
      'pixar animation studios', 'pixar', '20th century games',
      'electronic arts', 'ea', 'ea games', 'respawn entertainment',
      'sony interactive entertainment', 'insomniac games', 'santa monica studio'
    ],
    franchises: [
      'star wars', 'marvel', 'avengers', 'spider-man', 'x-men',
      'mickey mouse', 'disney', 'frozen', 'pixar', 'toy story',
      'cars', 'incredibles', 'finding nemo', 'monsters inc'
    ]
  },

  // Capcom Network
  'capcom': {
    firstParty: [
      'capcom', 'capcom co', 'capcom usa', 'capcom europe',
      'capcom production studio 1', 'capcom production studio 2',
      'capcom production studio 3', 'capcom production studio 4'
    ],
    secondParty: [
      'clover studio', 'flagship', 'dimps corporation', 'dimps',
      'inti creates', 'armature studio', 'beeline interactive',
      'capcom vancouver', 'blue castle games'
    ],
    franchises: [
      'street fighter', 'resident evil', 'biohazard', 'mega man', 'megaman',
      'devil may cry', 'monster hunter', 'ace attorney', 'phoenix wright',
      'dead rising', 'lost planet', 'viewtiful joe', 'okami',
      'darkstalkers', 'vampire savior', 'breath of fire', 'final fight'
    ]
  },

  // Take-Two/Rockstar Network
  'take-two interactive': {
    firstParty: [
      'take-two interactive', 'take-two', 't2', 'rockstar games',
      'rockstar north', 'rockstar san diego', 'rockstar toronto',
      '2k games', '2k', 'private division'
    ],
    secondParty: [
      'hangar 13', 'firaxis games', 'visual concepts', 'cat daddy games',
      'cloud chamber', 'ghost story games'
    ],
    franchises: [
      'grand theft auto', 'gta', 'red dead', 'max payne', 'manhunt',
      'midnight club', 'bully', 'la noire', 'civilization', 'xcom',
      'bioshock', 'borderlands', 'nba 2k', 'wwe 2k'
    ]
  },

  // Konami Network  
  'konami': {
    firstParty: [
      'konami', 'konami digital entertainment', 'konami computer entertainment',
      'konami of america', 'konami europe', 'kojima productions'
    ],
    secondParty: [
      'kcet', 'kcek', 'team silent', 'love-de-lic'
    ],
    franchises: [
      'metal gear', 'silent hill', 'castlevania', 'contra',
      'gradius', 'bomberman', 'dance dance revolution', 'ddr',
      'yu-gi-oh', 'suikoden', 'zone of the enders'
    ]
  },

  // Bethesda Network
  'bethesda game studios': {
    firstParty: [
      'bethesda game studios', 'bethesda softworks', 'zenimax online studios',
      'id software', 'arkane studios', 'machine games', 'tango gameworks'
    ],
    secondParty: [
      'obsidian entertainment', 'inxile entertainment', 'human head studios'
    ],
    franchises: [
      'elder scrolls', 'skyrim', 'fallout', 'doom', 'quake', 'dishonored',
      'wolfenstein', 'prey', 'rage', 'the elder scrolls'
    ]
  }
};

/**
 * Normalize company name for better matching
 */
function normalizeCompanyName(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    // Remove accent marks (é -> e, etc.)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Handle common abbreviations and variations
    .replace(/\bco\.\b/g, 'co')
    .replace(/\binc\.\b/g, 'inc')
    .replace(/\bltd\.\b/g, 'ltd')
    .replace(/\bcorp\.\b/g, 'corp')
    .replace(/\b&\b/g, 'and')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Enhanced company matching with fuzzy logic for publisher variations
 */
function isCompanyMatch(gameCompany: string, authorizedCompany: string): boolean {
  if (!gameCompany || !authorizedCompany) return false;
  
  const normalizedGame = normalizeCompanyName(gameCompany);
  const normalizedAuth = normalizeCompanyName(authorizedCompany);
  
  // Direct inclusion check (existing behavior)
  if (normalizedGame.includes(normalizedAuth) || normalizedAuth.includes(normalizedGame)) {
    return true;
  }
  
  // Check for partial word matches for complex company names
  const gameWords = normalizedGame.split(' ').filter(w => w.length > 2);
  const authWords = normalizedAuth.split(' ').filter(w => w.length > 2);
  
  // If most significant words match, consider it a match
  if (gameWords.length > 0 && authWords.length > 0) {
    const matchingWords = gameWords.filter(gw => 
      authWords.some(aw => gw.includes(aw) || aw.includes(gw))
    );
    
    // If more than half the words match, consider it authorized
    const matchRatio = matchingWords.length / Math.min(gameWords.length, authWords.length);
    if (matchRatio > 0.5) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a company is authorized to publish content for an aggressive copyright holder
 */
export function isAuthorizedPublisher(developer: string, publisher: string, franchiseOwner: string): boolean {
  if (!franchiseOwner) return false;
  
  const ownershipData = COMPANY_OWNERSHIP[franchiseOwner.toLowerCase().trim()];
  if (!ownershipData) return false;
  
  const devLower = (developer || '').toLowerCase().trim();
  const pubLower = (publisher || '').toLowerCase().trim();
  
  // Enhanced matching with fuzzy logic
  // Check if developer is first/second party
  const isAuthorizedDev = devLower && (
    ownershipData.firstParty.some(company => isCompanyMatch(devLower, company)) ||
    ownershipData.secondParty.some(company => isCompanyMatch(devLower, company))
  );
  
  // Check if publisher is first/second party  
  const isAuthorizedPub = pubLower && (
    ownershipData.firstParty.some(company => isCompanyMatch(pubLower, company)) ||
    ownershipData.secondParty.some(company => isCompanyMatch(pubLower, company))
  );
  
  const result = isAuthorizedDev || isAuthorizedPub;
  
  if (!result && (devLower || pubLower)) {
    console.log(`🔍 OWNERSHIP CHECK: "${developer || 'N/A'}" / "${publisher || 'N/A'}" not authorized for ${franchiseOwner}`);
  } else if (result) {
    console.log(`✅ AUTHORIZED: "${developer || 'N/A'}" / "${publisher || 'N/A'}" authorized for ${franchiseOwner}`);
  }
  
  return result;
}

/**
 * Find which franchise owner a game belongs to based on its content
 */
export function findFranchiseOwner(game: any, searchText?: string): string | null {
  const text = searchText || [
    game.name,
    game.developer,
    game.publisher,
    game.summary,
    game.description
  ].filter(Boolean).join(' ').toLowerCase();
  
  // Check each company's franchises
  for (const [company, data] of Object.entries(COMPANY_OWNERSHIP)) {
    const matchesFranchise = data.franchises.some(franchise => 
      text.includes(franchise.toLowerCase())
    );
    
    if (matchesFranchise) {
      console.log(`🎯 FRANCHISE DETECTED: "${game.name}" belongs to ${company} franchise`);
      return company;
    }
  }
  
  return null;
}