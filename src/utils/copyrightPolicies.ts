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