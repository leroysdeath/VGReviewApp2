// Priority games database for Phase 1 & 2 implementation
// These are the flagship games that should appear first in search results

export interface PriorityGame {
  franchise: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  name: string;
  alternativeNames?: string[];
  release_year: number;
  flagship: boolean;
  platforms: string[];
  boost_score: number; // How much to boost this game in search results
}

export const PRIORITY_GAMES_DATABASE: PriorityGame[] = [
  // CRITICAL PRIORITY - These should be added first
  
  // Pokemon (Major franchise with likely zero coverage)
  {
    franchise: 'pokemon',
    priority: 'critical',
    name: 'Pokémon Red',
    alternativeNames: ['Pokemon Red Version', 'Pocket Monsters Red'],
    release_year: 1996,
    flagship: true,
    platforms: ['Game Boy'],
    boost_score: 500
  },
  {
    franchise: 'pokemon',
    priority: 'critical',
    name: 'Pokémon Blue',
    alternativeNames: ['Pokemon Blue Version', 'Pocket Monsters Blue'],
    release_year: 1996,
    flagship: true,
    platforms: ['Game Boy'],
    boost_score: 500
  },
  {
    franchise: 'pokemon',
    priority: 'critical',
    name: 'Pokémon Yellow',
    alternativeNames: ['Pokemon Yellow Version', 'Pocket Monsters Yellow'],
    release_year: 1998,
    flagship: true,
    platforms: ['Game Boy'],
    boost_score: 450
  },
  {
    franchise: 'pokemon',
    priority: 'critical',
    name: 'Pokémon Gold',
    alternativeNames: ['Pokemon Gold Version'],
    release_year: 2000,
    flagship: true,
    platforms: ['Game Boy Color'],
    boost_score: 450
  },
  {
    franchise: 'pokemon',
    priority: 'critical',
    name: 'Pokémon Silver',
    alternativeNames: ['Pokemon Silver Version'],
    release_year: 2000,
    flagship: true,
    platforms: ['Game Boy Color'],
    boost_score: 450
  },

  // Mario (High profile Nintendo franchise)
  {
    franchise: 'mario',
    priority: 'critical',
    name: 'Super Mario Bros.',
    alternativeNames: ['Super Mario Brothers'],
    release_year: 1985,
    flagship: true,
    platforms: ['NES', 'Nintendo Entertainment System'],
    boost_score: 500
  },
  {
    franchise: 'mario',
    priority: 'critical',
    name: 'Super Mario 64',
    alternativeNames: ['Mario 64'],
    release_year: 1996,
    flagship: true,
    platforms: ['Nintendo 64', 'N64'],
    boost_score: 500
  },
  {
    franchise: 'mario',
    priority: 'critical',
    name: 'Super Mario Galaxy',
    alternativeNames: ['Mario Galaxy'],
    release_year: 2007,
    flagship: true,
    platforms: ['Wii'],
    boost_score: 450
  },
  {
    franchise: 'mario',
    priority: 'critical',
    name: 'Super Mario Odyssey',
    alternativeNames: ['Mario Odyssey'],
    release_year: 2017,
    flagship: true,
    platforms: ['Nintendo Switch'],
    boost_score: 450
  },

  // Zelda (Major Nintendo franchise)
  {
    franchise: 'zelda',
    priority: 'critical',
    name: 'The Legend of Zelda: Ocarina of Time',
    alternativeNames: ['Zelda Ocarina of Time', 'Ocarina of Time'],
    release_year: 1998,
    flagship: true,
    platforms: ['Nintendo 64', 'N64'],
    boost_score: 500
  },
  {
    franchise: 'zelda',
    priority: 'critical',
    name: 'The Legend of Zelda: Breath of the Wild',
    alternativeNames: ['Zelda Breath of the Wild', 'Breath of the Wild'],
    release_year: 2017,
    flagship: true,
    platforms: ['Nintendo Switch', 'Wii U'],
    boost_score: 500
  },
  {
    franchise: 'zelda',
    priority: 'critical',
    name: 'The Legend of Zelda: A Link to the Past',
    alternativeNames: ['Zelda Link to the Past', 'A Link to the Past'],
    release_year: 1991,
    flagship: true,
    platforms: ['SNES', 'Super Nintendo'],
    boost_score: 450
  },

  // Star Fox (Known issue - Star Fox 64 should be first)
  {
    franchise: 'star fox',
    priority: 'critical',
    name: 'Star Fox 64',
    alternativeNames: ['StarFox 64', 'Lylat Wars'],
    release_year: 1997,
    flagship: true,
    platforms: ['Nintendo 64', 'N64'],
    boost_score: 500
  },
  {
    franchise: 'star fox',
    priority: 'high',
    name: 'Star Fox',
    alternativeNames: ['StarFox'],
    release_year: 1993,
    flagship: true,
    platforms: ['SNES', 'Super Nintendo'],
    boost_score: 400
  },

  // HIGH PRIORITY - Major franchises that should have good coverage
  
  // Final Fantasy
  {
    franchise: 'final fantasy',
    priority: 'high',
    name: 'Final Fantasy VII',
    alternativeNames: ['Final Fantasy 7', 'FF7', 'FFVII'],
    release_year: 1997,
    flagship: true,
    platforms: ['PlayStation', 'PS1'],
    boost_score: 500
  },
  {
    franchise: 'final fantasy',
    priority: 'high',
    name: 'Final Fantasy X',
    alternativeNames: ['Final Fantasy 10', 'FF10', 'FFX'],
    release_year: 2001,
    flagship: true,
    platforms: ['PlayStation 2', 'PS2'],
    boost_score: 450
  },
  {
    franchise: 'final fantasy',
    priority: 'high',
    name: 'Final Fantasy VI',
    alternativeNames: ['Final Fantasy 6', 'FF6', 'FFVI'],
    release_year: 1994,
    flagship: true,
    platforms: ['SNES', 'Super Nintendo'],
    boost_score: 450
  },

  // Call of Duty
  {
    franchise: 'call of duty',
    priority: 'high',
    name: 'Call of Duty 4: Modern Warfare',
    alternativeNames: ['CoD 4', 'Modern Warfare'],
    release_year: 2007,
    flagship: true,
    platforms: ['PC', 'Xbox 360', 'PlayStation 3'],
    boost_score: 500
  },
  {
    franchise: 'call of duty',
    priority: 'high',
    name: 'Call of Duty: Modern Warfare 2',
    alternativeNames: ['CoD MW2', 'Modern Warfare 2'],
    release_year: 2009,
    flagship: true,
    platforms: ['PC', 'Xbox 360', 'PlayStation 3'],
    boost_score: 450
  },

  // Resident Evil
  {
    franchise: 'resident evil',
    priority: 'high',
    name: 'Resident Evil 2',
    alternativeNames: ['RE2', 'Biohazard 2'],
    release_year: 1998,
    flagship: true,
    platforms: ['PlayStation', 'PS1'],
    boost_score: 500
  },
  {
    franchise: 'resident evil',
    priority: 'high',
    name: 'Resident Evil 4',
    alternativeNames: ['RE4', 'Biohazard 4'],
    release_year: 2005,
    flagship: true,
    platforms: ['GameCube', 'PlayStation 2'],
    boost_score: 500
  }
];

// Helper functions for working with priority games
export function getPriorityGamesByFranchise(franchise: string): PriorityGame[] {
  return PRIORITY_GAMES_DATABASE.filter(game => 
    game.franchise.toLowerCase() === franchise.toLowerCase()
  );
}

export function getFlagshipGames(): PriorityGame[] {
  return PRIORITY_GAMES_DATABASE.filter(game => game.flagship);
}

export function getCriticalPriorityGames(): PriorityGame[] {
  return PRIORITY_GAMES_DATABASE.filter(game => game.priority === 'critical');
}

export function getGameBoostScore(gameName: string, franchise?: string): number {
  const games = franchise ? 
    getPriorityGamesByFranchise(franchise) : 
    PRIORITY_GAMES_DATABASE;
    
  const game = games.find(g => 
    g.name.toLowerCase().includes(gameName.toLowerCase()) ||
    gameName.toLowerCase().includes(g.name.toLowerCase()) ||
    g.alternativeNames?.some(alt => 
      alt.toLowerCase().includes(gameName.toLowerCase()) ||
      gameName.toLowerCase().includes(alt.toLowerCase())
    )
  );
  
  return game?.boost_score || 0;
}