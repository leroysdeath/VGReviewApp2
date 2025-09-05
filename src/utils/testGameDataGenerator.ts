/**
 * Test Game Data Generator
 * 
 * Generates curated lists of games by series for unit testing search/sorting/filtering
 * Ensures tests catch regressions in search quality and franchise detection
 */

import { FLAGSHIP_GAMES, type FlagshipGame } from './flagshipGames';
import { type GameMetrics } from './iconicGameDetection';

export interface TestGameSeries {
  franchise: string;
  expectedTopGames: TestGame[];
  decoyGames: TestGame[];        // Games that should be filtered out
  edgeCases: TestGame[];         // Borderline cases to test thresholds
  expectedSearchQueries: string[];
}

export interface TestGame extends GameMetrics {
  name: string;
  igdb_id?: number;
  category: number;              // IGDB category
  rating?: number;               // IGDB rating (0-100)
  metacritic_score?: number;     // Metacritic score (0-100)
  user_rating?: number;          // User rating (0-5)
  user_rating_count?: number;    // Number of user ratings
  follows?: number;              // IGDB follows count
  hypes?: number;               // IGDB hypes count
  first_release_date?: number;   // Unix timestamp
  developer?: string;
  publisher?: string;
  platforms?: { name: string }[];
  genres?: { name: string }[];
  summary?: string;
  testReason: string;           // Why this game is in the test set
}

/**
 * Generate comprehensive test data for major gaming franchises
 */
export function generateTestGameSeries(): TestGameSeries[] {
  return [
    generateMarioTestSeries(),
    generatePokemonTestSeries(),
    generateZeldaTestSeries(),
    generateFinalFantasyTestSeries(),
    generateStreetFighterTestSeries(),
    generateMegaManTestSeries(),
    generateMetroidTestSeries(),
    generateForzaTestSeries(),
    generateMarioPartyTestSeries(),
    generateMortalKombatTestSeries(),
    generateMetalGearTestSeries(),
  ];
}

/**
 * Mario franchise test data
 */
function generateMarioTestSeries(): TestGameSeries {
  return {
    franchise: 'mario',
    expectedTopGames: [
      {
        id: 1,
        name: 'Super Mario Bros. 3',
        igdb_id: 1020,
        category: 0, // Main game
        rating: 94,
        metacritic_score: 97,
        user_rating: 4.8,
        user_rating_count: 150000,
        follows: 200000,
        first_release_date: 594259200, // 1988-10-23
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        platforms: [{ name: 'Nintendo Entertainment System' }],
        genres: [{ name: 'Platform' }],
        summary: 'The pinnacle of 2D Mario platforming with revolutionary power-ups.',
        testReason: 'Flagship game - should always appear first in Mario searches'
      },
      {
        id: 2,
        name: 'Super Mario 64',
        igdb_id: 1074,
        category: 0,
        rating: 93,
        metacritic_score: 94,
        user_rating: 4.7,
        user_rating_count: 180000,
        follows: 190000,
        first_release_date: 835142400, // 1996-06-23
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        platforms: [{ name: 'Nintendo 64' }],
        genres: [{ name: 'Platform' }],
        summary: '3D platforming pioneer with revolutionary analog control.',
        testReason: 'Technical flagship - 3D Mario breakthrough'
      },
      {
        id: 3,
        name: 'Super Mario Odyssey',
        igdb_id: 25076,
        category: 0,
        rating: 91,
        metacritic_score: 97,
        user_rating: 4.6,
        user_rating_count: 120000,
        follows: 160000,
        first_release_date: 1509062400, // 2017-10-27
        developer: 'Nintendo EPD',
        publisher: 'Nintendo',
        platforms: [{ name: 'Nintendo Switch' }],
        genres: [{ name: 'Platform' }],
        summary: 'Modern Mario masterpiece with capture mechanic.',
        testReason: 'Modern flagship - Switch era Mario'
      },
      {
        id: 4,
        name: 'Super Mario World',
        igdb_id: 1019,
        category: 0,
        rating: 92,
        metacritic_score: 94,
        user_rating: 4.7,
        user_rating_count: 140000,
        follows: 175000,
        first_release_date: 658281600, // 1990-11-21
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        platforms: [{ name: 'Super Nintendo Entertainment System' }],
        genres: [{ name: 'Platform' }],
        summary: 'SNES launch title that introduced Yoshi.',
        testReason: 'Innovation flagship - Yoshi introduction'
      }
    ],
    decoyGames: [
      {
        id: 101,
        name: 'Super Mario All-Stars + Super Mario World',
        igdb_id: 2001,
        category: 3, // Bundle/Pack - should be filtered
        rating: 85,
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        platforms: [{ name: 'Super Nintendo Entertainment System' }],
        genres: [{ name: 'Platform' }],
        summary: 'Collection bundle of multiple Mario games.',
        testReason: 'Bundle - should be filtered by pack filter'
      },
      {
        id: 102,
        name: 'Super Mario Bros. 3-e - Para Beetle Challenge',
        igdb_id: 2002,
        category: 0,
        rating: 70,
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        platforms: [{ name: 'Game Boy Advance' }],
        genres: [{ name: 'Platform' }],
        summary: 'E-reader card mini-game challenge.',
        testReason: 'E-reader content - should be filtered by e-reader filter'
      },
      {
        id: 103,
        name: 'Super Mario ROM Hack Ultimate',
        igdb_id: 2003,
        category: 5, // Mod
        rating: 75,
        developer: 'Fan Developer',
        publisher: 'Homebrew',
        platforms: [{ name: 'PC' }],
        genres: [{ name: 'Platform' }],
        summary: 'Fan-made ROM hack with custom levels.',
        testReason: 'Fan content - should be filtered by content protection'
      }
    ],
    edgeCases: [
      {
        id: 201,
        name: 'Mario Kart 8 Deluxe',
        igdb_id: 3001,
        category: 0,
        rating: 88,
        metacritic_score: 92,
        developer: 'Nintendo EPD',
        publisher: 'Nintendo',
        platforms: [{ name: 'Nintendo Switch' }],
        genres: [{ name: 'Racing' }],
        summary: 'Enhanced Switch version of Mario Kart 8.',
        testReason: 'Related franchise - should appear but lower priority than platformers'
      },
      {
        id: 202,
        name: 'New Super Mario Bros.',
        igdb_id: 3002,
        category: 0,
        rating: 82,
        metacritic_score: 89,
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        platforms: [{ name: 'Nintendo DS' }],
        genres: [{ name: 'Platform' }],
        summary: 'Modern 2D Mario revival for handheld.',
        testReason: 'Good but not flagship - should appear but rank below flagships'
      }
    ],
    expectedSearchQueries: [
      'mario', 'super mario', 'mario bros', 'mario 64', 'mario odyssey', 'mario 3'
    ]
  };
}

/**
 * Pokemon franchise test data
 */
function generatePokemonTestSeries(): TestGameSeries {
  return {
    franchise: 'pokemon',
    expectedTopGames: [
      {
        id: 11,
        name: 'Pokemon Red',
        igdb_id: 1447,
        category: 0,
        rating: 89,
        metacritic_score: 82,
        user_rating: 4.5,
        user_rating_count: 200000,
        follows: 250000,
        first_release_date: 856224000, // 1996-02-27
        developer: 'Game Freak',
        publisher: 'Nintendo',
        platforms: [{ name: 'Game Boy' }],
        genres: [{ name: 'Role-playing (RPG)' }],
        summary: 'The original Pokemon adventure that started it all.',
        testReason: 'Series originator - absolute flagship'
      },
      {
        id: 12,
        name: 'Pokemon Blue',
        igdb_id: 1448,
        category: 0,
        rating: 89,
        metacritic_score: 82,
        user_rating: 4.5,
        user_rating_count: 195000,
        follows: 245000,
        first_release_date: 856224000, // 1996-02-27
        developer: 'Game Freak',
        publisher: 'Nintendo',
        platforms: [{ name: 'Game Boy' }],
        genres: [{ name: 'Role-playing (RPG)' }],
        summary: 'The blue version of the original Pokemon adventure.',
        testReason: 'Series originator - paired with Red'
      },
      {
        id: 13,
        name: 'Pokemon Gold',
        igdb_id: 1451,
        category: 0,
        rating: 91,
        metacritic_score: 84,
        user_rating: 4.6,
        user_rating_count: 170000,
        follows: 220000,
        first_release_date: 942019200, // 1999-11-10
        developer: 'Game Freak',
        publisher: 'The Pokemon Company',
        platforms: [{ name: 'Game Boy Color' }],
        genres: [{ name: 'Role-playing (RPG)' }],
        summary: 'Generation 2 Pokemon with day/night cycle.',
        testReason: 'Innovation flagship - Gen 2 breakthrough'
      }
    ],
    decoyGames: [
      {
        id: 111,
        name: 'Pokemon Crystal Clear ROM Hack',
        igdb_id: 2011,
        category: 5, // Mod
        rating: 78,
        developer: 'ShockSlayer',
        publisher: 'RomHack',
        platforms: [{ name: 'Game Boy Color' }],
        genres: [{ name: 'Role-playing (RPG)' }],
        summary: 'Popular open-world Pokemon ROM hack.',
        testReason: 'Fan content - should be filtered by content protection'
      },
      {
        id: 112,
        name: 'Pokemon Season Pass Bundle',
        igdb_id: 2012,
        category: 3, // Bundle
        rating: 75,
        developer: 'Game Freak',
        publisher: 'Nintendo',
        platforms: [{ name: 'Nintendo Switch' }],
        genres: [{ name: 'Role-playing (RPG)' }],
        summary: 'Bundle pack with multiple Pokemon expansions.',
        testReason: 'Bundle - should be filtered by pack filter'
      }
    ],
    edgeCases: [
      {
        id: 211,
        name: 'Pokemon Stadium',
        igdb_id: 3011,
        category: 0,
        rating: 79,
        metacritic_score: 78,
        developer: 'HAL Laboratory',
        publisher: 'Nintendo',
        platforms: [{ name: 'Nintendo 64' }],
        genres: [{ name: 'Fighting' }],
        summary: 'Pokemon battle arena for Nintendo 64.',
        testReason: 'Spin-off - should appear but lower priority than main series'
      }
    ],
    expectedSearchQueries: [
      'pokemon', 'pokémon', 'pokemon red', 'pokemon blue', 'pokemon gold'
    ]
  };
}

/**
 * Zelda franchise test data
 */
function generateZeldaTestSeries(): TestGameSeries {
  return {
    franchise: 'zelda',
    expectedTopGames: [
      {
        id: 21,
        name: 'The Legend of Zelda: Ocarina of Time',
        igdb_id: 1030,
        category: 0,
        rating: 96,
        metacritic_score: 99,
        user_rating: 4.9,
        user_rating_count: 300000,
        follows: 400000,
        first_release_date: 911606400, // 1998-11-21
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        platforms: [{ name: 'Nintendo 64' }],
        genres: [{ name: 'Role-playing (RPG)' }, { name: 'Adventure' }],
        summary: 'Revolutionary 3D adventure game and N64 masterpiece.',
        testReason: 'Peak flagship - highest rated Zelda game'
      },
      {
        id: 22,
        name: 'The Legend of Zelda: Breath of the Wild',
        igdb_id: 7346,
        category: 0,
        rating: 94,
        metacritic_score: 97,
        user_rating: 4.7,
        user_rating_count: 250000,
        follows: 350000,
        first_release_date: 1488326400, // 2017-03-03
        developer: 'Nintendo EPD',
        publisher: 'Nintendo',
        platforms: [{ name: 'Nintendo Switch' }],
        genres: [{ name: 'Role-playing (RPG)' }, { name: 'Adventure' }],
        summary: 'Open-world Zelda that revolutionized the franchise.',
        testReason: 'Modern flagship - franchise reinvention'
      },
      {
        id: 23,
        name: 'The Legend of Zelda: Tears of the Kingdom',
        igdb_id: 119133,
        category: 0,
        rating: 93,
        metacritic_score: 96,
        user_rating: 4.6,
        user_rating_count: 180000,
        follows: 320000,
        first_release_date: 1683763200, // 2023-05-12
        developer: 'Nintendo EPD',
        publisher: 'Nintendo',
        platforms: [{ name: 'Nintendo Switch' }],
        genres: [{ name: 'Role-playing (RPG)' }, { name: 'Adventure' }],
        summary: 'Direct sequel to Breath of the Wild with building mechanics.',
        testReason: 'Modern flagship - latest major release'
      }
    ],
    decoyGames: [
      {
        id: 121,
        name: 'The Legend of Zelda: Collectors Edition',
        igdb_id: 2021,
        category: 3, // Bundle
        rating: 82,
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        platforms: [{ name: 'GameCube' }],
        genres: [{ name: 'Role-playing (RPG)' }],
        summary: 'Collection of classic Zelda games.',
        testReason: 'Bundle - should be filtered by pack filter'
      }
    ],
    edgeCases: [
      {
        id: 221,
        name: 'The Legend of Zelda: Links Awakening',
        igdb_id: 3021,
        category: 0,
        rating: 85,
        metacritic_score: 86,
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        platforms: [{ name: 'Game Boy' }],
        genres: [{ name: 'Role-playing (RPG)' }],
        summary: 'Beloved Game Boy adventure.',
        testReason: 'High quality but not flagship - should appear but rank below flagships'
      }
    ],
    expectedSearchQueries: [
      'zelda', 'legend of zelda', 'ocarina of time', 'breath of the wild', 'tears of the kingdom'
    ]
  };
}

/**
 * Final Fantasy franchise test data
 */
function generateFinalFantasyTestSeries(): TestGameSeries {
  return {
    franchise: 'final fantasy',
    expectedTopGames: [
      {
        id: 31,
        name: 'Final Fantasy VII',
        igdb_id: 1040,
        category: 0,
        rating: 92,
        metacritic_score: 92,
        user_rating: 4.6,
        user_rating_count: 280000,
        follows: 300000,
        first_release_date: 853891200, // 1997-01-31
        developer: 'Square',
        publisher: 'Square Enix',
        platforms: [{ name: 'PlayStation' }],
        genres: [{ name: 'Role-playing (RPG)' }],
        summary: 'The game that brought JRPGs to the mainstream.',
        testReason: 'Cultural flagship - mainstream breakthrough'
      },
      {
        id: 32,
        name: 'Final Fantasy VI',
        igdb_id: 1041,
        category: 0,
        rating: 91,
        metacritic_score: 90,
        user_rating: 4.7,
        user_rating_count: 150000,
        follows: 180000,
        first_release_date: 765072000, // 1994-04-02
        developer: 'Square',
        publisher: 'Square Enix',
        platforms: [{ name: 'Super Nintendo Entertainment System' }],
        genres: [{ name: 'Role-playing (RPG)' }],
        summary: 'Peak of 2D Final Fantasy with ensemble cast.',
        testReason: 'Peak flagship - 2D series pinnacle'
      }
    ],
    decoyGames: [
      {
        id: 131,
        name: 'Final Fantasy XIII-2 Season Pass',
        igdb_id: 2031,
        category: 7, // Season content
        rating: 72,
        developer: 'Square Enix',
        publisher: 'Square Enix',
        platforms: [{ name: 'PlayStation 3' }],
        genres: [{ name: 'Role-playing (RPG)' }],
        summary: 'Additional content season for FFXIII-2.',
        testReason: 'Season content - should be filtered by season filter'
      }
    ],
    edgeCases: [
      {
        id: 231,
        name: 'Final Fantasy XIV',
        igdb_id: 3031,
        category: 0,
        rating: 86,
        metacritic_score: 83,
        developer: 'Square Enix',
        publisher: 'Square Enix',
        platforms: [{ name: 'PC' }],
        genres: [{ name: 'Role-playing (RPG)' }],
        summary: 'Popular MMORPG in the Final Fantasy universe.',
        testReason: 'MMO - different genre, should rank below single-player flagships'
      }
    ],
    expectedSearchQueries: [
      'final fantasy', 'ff', 'final fantasy 7', 'ff7', 'final fantasy vii'
    ]
  };
}

/**
 * Street Fighter franchise test data
 */
function generateStreetFighterTestSeries(): TestGameSeries {
  return {
    franchise: 'street fighter',
    expectedTopGames: [
      {
        id: 41,
        name: 'Street Fighter II',
        igdb_id: 1050,
        category: 0,
        rating: 90,
        metacritic_score: 94,
        user_rating: 4.5,
        user_rating_count: 120000,
        follows: 180000,
        first_release_date: 666403200, // 1991-02-06
        developer: 'Capcom',
        publisher: 'Capcom',
        platforms: [{ name: 'Arcade' }],
        genres: [{ name: 'Fighting' }],
        summary: 'The fighting game that defined the genre.',
        testReason: 'Cultural flagship - genre definer'
      }
    ],
    decoyGames: [],
    edgeCases: [],
    expectedSearchQueries: ['street fighter', 'sf2', 'street fighter 2']
  };
}

/**
 * Generate test data for less prominent franchises
 */
function generateMegaManTestSeries(): TestGameSeries {
  return {
    franchise: 'mega man',
    expectedTopGames: [
      {
        id: 51,
        name: 'Mega Man 2',
        igdb_id: 1060,
        category: 0,
        rating: 88,
        metacritic_score: 87,
        developer: 'Capcom',
        publisher: 'Capcom',
        platforms: [{ name: 'Nintendo Entertainment System' }],
        genres: [{ name: 'Platform' }, { name: 'Shooter' }],
        summary: 'Widely considered the best Mega Man game.',
        testReason: 'Peak flagship - series best'
      }
    ],
    decoyGames: [],
    edgeCases: [],
    expectedSearchQueries: ['mega man', 'megaman', 'mega man 2']
  };
}

function generateMetroidTestSeries(): TestGameSeries {
  return {
    franchise: 'metroid',
    expectedTopGames: [
      {
        id: 61,
        name: 'Super Metroid',
        igdb_id: 1070,
        category: 0,
        rating: 93,
        metacritic_score: 96,
        developer: 'Nintendo R&D1',
        publisher: 'Nintendo',
        platforms: [{ name: 'Super Nintendo Entertainment System' }],
        genres: [{ name: 'Shooter' }, { name: 'Adventure' }],
        summary: 'The pinnacle of 2D Metroidvania design.',
        testReason: 'Peak flagship - genre perfection'
      }
    ],
    decoyGames: [],
    edgeCases: [],
    expectedSearchQueries: ['metroid', 'super metroid']
  };
}

function generateForzaTestSeries(): TestGameSeries {
  return {
    franchise: 'forza',
    expectedTopGames: [
      {
        id: 71,
        name: 'Forza Horizon 4',
        igdb_id: 1080,
        category: 0,
        rating: 87,
        metacritic_score: 92,
        developer: 'Playground Games',
        publisher: 'Microsoft',
        platforms: [{ name: 'Xbox One' }],
        genres: [{ name: 'Racing' }],
        summary: 'Open-world racing in beautiful Britain.',
        testReason: 'Peak flagship - Horizon series best'
      }
    ],
    decoyGames: [],
    edgeCases: [],
    expectedSearchQueries: ['forza', 'forza horizon']
  };
}

function generateMarioPartyTestSeries(): TestGameSeries {
  return {
    franchise: 'mario party',
    expectedTopGames: [
      {
        id: 81,
        name: 'Mario Party Superstars',
        igdb_id: 1090,
        category: 0,
        rating: 84,
        metacritic_score: 79,
        developer: 'NDcube',
        publisher: 'Nintendo',
        platforms: [{ name: 'Nintendo Switch' }],
        genres: [{ name: 'Strategy' }],
        summary: 'Classic Mario Party boards with online play.',
        testReason: 'Modern flagship - franchise revival'
      }
    ],
    decoyGames: [],
    edgeCases: [],
    expectedSearchQueries: ['mario party', 'superstars']
  };
}

function generateMortalKombatTestSeries(): TestGameSeries {
  return {
    franchise: 'mortal kombat',
    expectedTopGames: [
      {
        id: 91,
        name: 'Mortal Kombat II',
        igdb_id: 1100,
        category: 0,
        rating: 86,
        metacritic_score: 88,
        developer: 'NetherRealm Studios',
        publisher: 'WB Games',
        platforms: [{ name: 'Arcade' }],
        genres: [{ name: 'Fighting' }],
        summary: 'The peak of classic Mortal Kombat.',
        testReason: 'Peak flagship - series best'
      }
    ],
    decoyGames: [],
    edgeCases: [],
    expectedSearchQueries: ['mortal kombat', 'mk', 'mortal kombat 2']
  };
}

function generateMetalGearTestSeries(): TestGameSeries {
  return {
    franchise: 'metal gear',
    expectedTopGames: [
      {
        id: 101,
        name: 'Metal Gear Solid',
        igdb_id: 1110,
        category: 0,
        rating: 92,
        metacritic_score: 96,
        developer: 'Konami',
        publisher: 'Konami',
        platforms: [{ name: 'PlayStation' }],
        genres: [{ name: 'Shooter' }, { name: 'Adventure' }],
        summary: 'Stealth action masterpiece that defined the genre.',
        testReason: 'Technical flagship - stealth genre pioneer'
      },
      {
        id: 102,
        name: 'Metal Gear Solid: Twin Snakes',
        igdb_id: 1111,
        category: 0,
        rating: 85,
        metacritic_score: 85,
        developer: 'Silicon Knights',
        publisher: 'Konami',
        platforms: [{ name: 'GameCube' }],
        genres: [{ name: 'Shooter' }, { name: 'Adventure' }],
        summary: 'Enhanced GameCube remake of the original.',
        testReason: 'Technical flagship - updated version'
      }
    ],
    decoyGames: [],
    edgeCases: [],
    expectedSearchQueries: ['metal gear', 'metal gear solid', 'twin snakes']
  };
}

/**
 * Create a comprehensive test suite for search functionality
 */
export function generateSearchTestSuite(): {
  franchiseTests: TestGameSeries[];
  globalTestCases: {
    name: string;
    input: string;
    expectedBehavior: string;
    testGames: TestGame[];
  }[];
} {
  const franchiseTests = generateTestGameSeries();
  
  const globalTestCases = [
    {
      name: 'Generic franchise search quality',
      input: 'mario',
      expectedBehavior: 'Should prioritize flagship Mario platformers over spin-offs',
      testGames: franchiseTests.find(t => t.franchise === 'mario')?.expectedTopGames || []
    },
    {
      name: 'Specific game search precision',
      input: 'super mario 64',
      expectedBehavior: 'Should return exact match as top result',
      testGames: [franchiseTests.find(t => t.franchise === 'mario')?.expectedTopGames[1]!]
    },
    {
      name: 'Content filtering effectiveness',
      input: 'pokemon rom hack',
      expectedBehavior: 'Should filter out fan-made content',
      testGames: franchiseTests.find(t => t.franchise === 'pokemon')?.decoyGames || []
    },
    {
      name: 'Bundle filtering precision',
      input: 'mario all stars',
      expectedBehavior: 'Should filter out collection bundles',
      testGames: franchiseTests.find(t => t.franchise === 'mario')?.decoyGames || []
    },
    {
      name: 'E-reader content removal',
      input: 'mario bros 3-e para beetle',
      expectedBehavior: 'Should filter out e-reader micro-content',
      testGames: franchiseTests.find(t => t.franchise === 'mario')?.decoyGames.filter(g => g.name.includes('-e')) || []
    }
  ];
  
  return {
    franchiseTests,
    globalTestCases
  };
}

/**
 * Extract expected top games for a specific franchise
 */
export function getExpectedTopGames(franchise: string, limit: number = 5): TestGame[] {
  const testSeries = generateTestGameSeries();
  const franchiseData = testSeries.find(series => series.franchise === franchise);
  
  if (!franchiseData) {
    throw new Error(`No test data available for franchise: ${franchise}`);
  }
  
  return franchiseData.expectedTopGames.slice(0, limit);
}

/**
 * Get games that should be filtered out for testing
 */
export function getFilterDecoyGames(franchise?: string): TestGame[] {
  const testSeries = generateTestGameSeries();
  
  if (franchise) {
    const franchiseData = testSeries.find(series => series.franchise === franchise);
    return franchiseData?.decoyGames || [];
  }
  
  // Return all decoy games across franchises
  return testSeries.flatMap(series => series.decoyGames);
}

/**
 * Generate test data based on existing flagship games database
 */
export function generateTestDataFromFlagships(): { [franchise: string]: TestGame[] } {
  const testData: { [franchise: string]: TestGame[] } = {};
  
  Object.entries(FLAGSHIP_GAMES).forEach(([franchise, data]) => {
    testData[franchise] = data.flagships.map((flagship, index) => ({
      id: 1000 + index,
      name: flagship.names[0], // Use primary name
      category: 0, // Main game
      rating: 85 + (flagship.significance === 'peak' ? 10 : 5),
      metacritic_score: 85 + (flagship.significance === 'cultural' ? 10 : 5),
      first_release_date: flagship.releaseYear ? new Date(flagship.releaseYear, 0, 1).getTime() / 1000 : undefined,
      platforms: flagship.platforms?.map(name => ({ name })),
      genres: [{ name: 'Adventure' }], // Default genre
      summary: flagship.reason,
      testReason: `Generated from flagship data - ${flagship.significance}`
    }));
  });
  
  return testData;
}

/**
 * Validate search results against expected flagship games
 */
export function validateSearchResults(
  searchQuery: string,
  actualResults: any[],
  expectedFranchise?: string
): {
  passed: boolean;
  issues: string[];
  score: number;
  flagshipCoverage: number;
} {
  const issues: string[] = [];
  let score = 100; // Start with perfect score
  
  // Detect franchise from query
  const detectedFranchise = expectedFranchise || detectFranchiseSearch(searchQuery);
  
  if (!detectedFranchise) {
    return {
      passed: true,
      issues: ['No franchise detected - generic search validation not implemented'],
      score: 100,
      flagshipCoverage: 100
    };
  }
  
  // Get expected flagship games for this franchise
  const expectedGames = getExpectedTopGames(detectedFranchise, 5);
  const actualGameNames = actualResults.map(g => g.name?.toLowerCase() || '');
  
  // Check flagship coverage
  let flagshipsFound = 0;
  expectedGames.forEach(expectedGame => {
    const found = actualGameNames.some(actualName => 
      actualName.includes(expectedGame.name.toLowerCase()) ||
      expectedGame.name.toLowerCase().includes(actualName)
    );
    
    if (found) {
      flagshipsFound++;
    } else {
      issues.push(`Missing flagship game: ${expectedGame.name}`);
      score -= 15; // Penalize missing flagships heavily
    }
  });
  
  const flagshipCoverage = (flagshipsFound / expectedGames.length) * 100;
  
  // Check for unexpected filtering
  if (actualResults.length === 0) {
    issues.push('No results returned - possible over-filtering');
    score = 0;
  } else if (actualResults.length < 3 && flagshipsFound === 0) {
    issues.push('Too few results and no flagships - search system may be broken');
    score -= 30;
  }
  
  // Quality threshold
  const passed = score >= 70 && flagshipCoverage >= 60;
  
  return {
    passed,
    issues,
    score,
    flagshipCoverage
  };
}