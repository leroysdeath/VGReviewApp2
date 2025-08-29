/**
 * Flagship/Iconic Games Database
 * 
 * This file defines which games are considered flagship titles for major franchises.
 * These games get special treatment in search results to ensure they appear prominently.
 */

export interface FlagshipGame {
  names: string[];           // Various names this game might be known by
  igdbIds?: number[];        // Known IGDB IDs if available
  reason: string;            // Why this game is considered flagship
  releaseYear?: number;      // Release year for context
  platforms?: string[];      // Key platforms
  significance: 'originator' | 'peak' | 'innovation' | 'cultural' | 'technical' | 'modern';
}

export interface FlagshipDatabase {
  [franchise: string]: {
    patterns: string[];      // Search patterns that indicate this franchise
    flagships: FlagshipGame[];
  };
}

/**
 * Comprehensive flagship games database
 * Manually curated for accuracy and cultural significance
 */
export const FLAGSHIP_GAMES: FlagshipDatabase = {
  mario: {
    patterns: ['mario', 'super mario', 'mario bros'],
    flagships: [
      {
        names: ['Super Mario Bros.', 'Mario Bros.', 'SMB'],
        reason: 'Series originator, saved video games industry, cultural phenomenon',
        releaseYear: 1985,
        platforms: ['NES'],
        significance: 'originator'
      },
      {
        names: ['Super Mario Bros. 3', 'Mario Bros 3', 'Mario 3', 'SMB3'],
        reason: 'Peak of 2D Mario, highest rated, revolutionary power-ups',
        releaseYear: 1988,
        platforms: ['NES'],
        significance: 'peak'
      },
      {
        names: ['Super Mario World', 'Mario World', 'SMW'],
        reason: 'SNES launch title, introduced Yoshi, perfected 2D formula',
        releaseYear: 1990,
        platforms: ['SNES'],
        significance: 'innovation'
      },
      {
        names: ['Super Mario 64', 'Mario 64', 'SM64'],
        reason: '3D pioneer, analog control, N64 system seller, revolutionary camera',
        releaseYear: 1996,
        platforms: ['Nintendo 64'],
        significance: 'technical'
      },
      {
        names: ['Super Mario Galaxy', 'Mario Galaxy'],
        reason: 'Gravity mechanics innovation, Wii motion controls, critical masterpiece',
        releaseYear: 2007,
        platforms: ['Wii'],
        significance: 'innovation'
      },
      {
        names: ['Super Mario Odyssey', 'Mario Odyssey'],
        reason: 'Modern masterpiece, Switch flagship, Cappy mechanics, open-world evolution',
        releaseYear: 2017,
        platforms: ['Nintendo Switch'],
        significance: 'modern'
      }
    ]
  },
  
  pokemon: {
    patterns: ['pokemon', 'pokémon'],
    flagships: [
      {
        names: ['Pokemon Red', 'Pokémon Red', 'Pokemon Red Version'],
        reason: 'Series originator, started Pokemon phenomenon, Game Boy classic',
        releaseYear: 1996,
        platforms: ['Game Boy'],
        significance: 'originator'
      },
      {
        names: ['Pokemon Blue', 'Pokémon Blue', 'Pokemon Blue Version'],
        reason: 'Series originator, paired with Red, international release',
        releaseYear: 1996,
        platforms: ['Game Boy'],
        significance: 'originator'
      },
      {
        names: ['Pokemon Green', 'Pokémon Green', 'Pokemon Green Version'],
        reason: 'Original Japanese release, series true originator',
        releaseYear: 1996,
        platforms: ['Game Boy'],
        significance: 'originator'
      },
      {
        names: ['Pokemon Yellow', 'Pokémon Yellow', 'Pokemon Yellow Version'],
        reason: 'Enhanced version, anime tie-in, Pikachu focus',
        releaseYear: 1998,
        platforms: ['Game Boy Color'],
        significance: 'cultural'
      },
      {
        names: ['Pokemon Gold', 'Pokémon Gold', 'Pokemon Gold Version'],
        reason: 'Generation 2 pioneer, day/night cycle, breeding, 100 new Pokemon',
        releaseYear: 1999,
        platforms: ['Game Boy Color'],
        significance: 'innovation'
      },
      {
        names: ['Pokemon Silver', 'Pokémon Silver', 'Pokemon Silver Version'],
        reason: 'Generation 2 pioneer, paired with Gold, legendary Ho-Oh/Lugia',
        releaseYear: 1999,
        platforms: ['Game Boy Color'],
        significance: 'innovation'
      },
      {
        names: ['Pokemon Crystal', 'Pokémon Crystal', 'Pokemon Crystal Version'],
        reason: 'Enhanced Gen 2, first female player option, mobile features',
        releaseYear: 2000,
        platforms: ['Game Boy Color'],
        significance: 'innovation'
      }
    ]
  },
  
  zelda: {
    patterns: ['zelda', 'legend of zelda'],
    flagships: [
      {
        names: ['The Legend of Zelda', 'Legend of Zelda', 'Zelda'],
        reason: 'Series originator, open world pioneer, NES classic',
        releaseYear: 1986,
        platforms: ['NES'],
        significance: 'originator'
      },
      {
        names: ['Zelda II: The Adventure of Link', 'Adventure of Link', 'Zelda 2'],
        reason: 'Side-scrolling experiment, RPG elements, controversial but important',
        releaseYear: 1987,
        platforms: ['NES'],
        significance: 'innovation'
      },
      {
        names: ['The Legend of Zelda: A Link to the Past', 'Link to the Past', 'LTTP'],
        reason: 'Defined Zelda formula, SNES masterpiece, perfect 2D design',
        releaseYear: 1991,
        platforms: ['SNES'],
        significance: 'peak'
      },
      {
        names: ['The Legend of Zelda: Ocarina of Time', 'Ocarina of Time', 'OoT'],
        reason: '3D Zelda pioneer, Z-targeting, widely considered greatest game ever',
        releaseYear: 1998,
        platforms: ['Nintendo 64'],
        significance: 'technical'
      },
      {
        names: ['The Legend of Zelda: Breath of the Wild', 'Breath of the Wild', 'BotW'],
        reason: 'Open world revolution, Switch launch title, reinvented franchise',
        releaseYear: 2017,
        platforms: ['Nintendo Switch'],
        significance: 'modern'
      }
    ]
  },
  
  'final fantasy': {
    patterns: ['final fantasy', 'ff'],
    flagships: [
      {
        names: ['Final Fantasy', 'Final Fantasy I', 'FF1'],
        reason: 'Series originator, saved Square, JRPG foundation',
        releaseYear: 1987,
        platforms: ['NES'],
        significance: 'originator'
      },
      {
        names: ['Final Fantasy IV', 'Final Fantasy 4', 'FF4', 'FFIV'],
        reason: 'ATB system introduction, storytelling breakthrough, character development',
        releaseYear: 1991,
        platforms: ['SNES'],
        significance: 'innovation'
      },
      {
        names: ['Final Fantasy VI', 'Final Fantasy 6', 'FF6', 'FFVI'],
        reason: 'Peak of 2D Final Fantasy, ensemble cast, Kefka, opera scene',
        releaseYear: 1994,
        platforms: ['SNES'],
        significance: 'peak'
      },
      {
        names: ['Final Fantasy VII', 'Final Fantasy 7', 'FF7', 'FFVII'],
        reason: '3D revolution, Cloud/Sephiroth, mainstream breakthrough, cultural phenomenon',
        releaseYear: 1997,
        platforms: ['PlayStation'],
        significance: 'cultural'
      },
      {
        names: ['Final Fantasy X', 'Final Fantasy 10', 'FF10', 'FFX'],
        reason: 'Voice acting debut, sphere grid, Tidus/Yuna love story, PS2 showcase',
        releaseYear: 2001,
        platforms: ['PlayStation 2'],
        significance: 'technical'
      }
    ]
  },
  
  'street fighter': {
    patterns: ['street fighter'],
    flagships: [
      {
        names: ['Street Fighter II', 'Street Fighter 2', 'SF2', 'SFII'],
        reason: 'Fighting game revolution, arcade phenomenon, tournament scene foundation',
        releaseYear: 1991,
        platforms: ['Arcade'],
        significance: 'cultural'
      },
      {
        names: ['Super Street Fighter II Turbo', 'SF2 Turbo', 'SSF2T'],
        reason: 'Peak of SF2 series, super combos, tournament standard',
        releaseYear: 1994,
        platforms: ['Arcade'],
        significance: 'peak'
      },
      {
        names: ['Street Fighter Alpha 3', 'SFA3', 'SF Alpha 3'],
        reason: 'Alpha series pinnacle, ISM system, largest roster',
        releaseYear: 1998,
        platforms: ['Arcade'],
        significance: 'peak'
      },
      {
        names: ['Street Fighter III: 3rd Strike', '3rd Strike', 'SF3'],
        reason: 'Technical masterpiece, parry system, EVO moment 37',
        releaseYear: 1999,
        platforms: ['Arcade'],
        significance: 'technical'
      }
    ]
  },
  
  'mega man': {
    patterns: ['mega man', 'megaman', 'rockman'],
    flagships: [
      {
        names: ['Mega Man 2', 'Megaman 2', 'Rockman 2'],
        reason: 'Series peak, perfect difficulty, iconic music, Dr. Wily',
        releaseYear: 1988,
        platforms: ['NES'],
        significance: 'peak'
      },
      {
        names: ['Mega Man 3', 'Megaman 3', 'Rockman 3'],
        reason: 'Introduced Rush, slide ability, Proto Man debut',
        releaseYear: 1990,
        platforms: ['NES'],
        significance: 'innovation'
      },
      {
        names: ['Mega Man X', 'Megaman X', 'Rockman X'],
        reason: '16-bit evolution, dash/wall jump, darker tone, SNES showcase',
        releaseYear: 1993,
        platforms: ['SNES'],
        significance: 'innovation'
      }
    ]
  },
  
  metroid: {
    patterns: ['metroid'],
    flagships: [
      {
        names: ['Metroid', 'Metroid NES'],
        reason: 'Series originator, Metroidvania genre creator, Samus reveal',
        releaseYear: 1986,
        platforms: ['NES'],
        significance: 'originator'
      },
      {
        names: ['Super Metroid', 'Metroid 3'],
        reason: 'Peak of 2D Metroid, atmospheric masterpiece, perfect controls',
        releaseYear: 1994,
        platforms: ['SNES'],
        significance: 'peak'
      },
      {
        names: ['Metroid Prime', 'Metroid Prime 1'],
        reason: '3D Metroid success, first-person exploration, GameCube showcase',
        releaseYear: 2002,
        platforms: ['GameCube'],
        significance: 'technical'
      }
    ]
  }
};

/**
 * Check if a search query is targeting a major franchise
 */
export function detectFranchiseSearch(query: string): string | null {
  const queryLower = query.toLowerCase().trim();
  
  for (const [franchise, data] of Object.entries(FLAGSHIP_GAMES)) {
    if (data.patterns.some(pattern => queryLower.includes(pattern))) {
      return franchise;
    }
  }
  
  return null;
}

/**
 * Get flagship games for a specific franchise
 */
export function getFlagshipGames(franchise: string): FlagshipGame[] {
  return FLAGSHIP_GAMES[franchise]?.flagships || [];
}

/**
 * Check if a game name matches any flagship game
 */
export function isFlagshipGame(gameName: string, franchise?: string): FlagshipGame | null {
  const searchName = gameName.toLowerCase();
  
  const franchisesToCheck = franchise ? [franchise] : Object.keys(FLAGSHIP_GAMES);
  
  for (const franchiseKey of franchisesToCheck) {
    const flagships = getFlagshipGames(franchiseKey);
    
    for (const flagship of flagships) {
      const matchesName = flagship.names.some(name => 
        searchName.includes(name.toLowerCase()) || name.toLowerCase().includes(searchName)
      );
      
      if (matchesName) {
        return flagship;
      }
    }
  }
  
  return null;
}

/**
 * Generate search patterns for flagship games in a franchise
 */
export function generateFlagshipSearchPatterns(franchise: string): string[] {
  const flagships = getFlagshipGames(franchise);
  const patterns: string[] = [];
  
  flagships.forEach(flagship => {
    patterns.push(...flagship.names);
  });
  
  return patterns;
}

/**
 * Calculate flagship score for prioritization
 */
export function calculateFlagshipScore(gameName: string, franchise?: string): number {
  const flagship = isFlagshipGame(gameName, franchise);
  if (!flagship) return 0;
  
  let score = 100; // Base flagship score
  
  // Bonus based on significance type
  switch (flagship.significance) {
    case 'originator': score += 50; break;
    case 'cultural': score += 45; break;
    case 'peak': score += 40; break;
    case 'innovation': score += 35; break;
    case 'technical': score += 30; break;
    case 'modern': score += 20; break;
  }
  
  // Age bonus for classics (pre-2000)
  if (flagship.releaseYear && flagship.releaseYear < 2000) {
    score += 25;
  }
  
  return score;
}

/**
 * Get all franchise patterns for quick detection
 */
export function getAllFranchisePatterns(): Record<string, string[]> {
  const patterns: Record<string, string[]> = {};
  
  for (const [franchise, data] of Object.entries(FLAGSHIP_GAMES)) {
    patterns[franchise] = data.patterns;
  }
  
  return patterns;
}