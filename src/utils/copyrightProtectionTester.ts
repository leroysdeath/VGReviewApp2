import { CopyrightLevel } from './copyrightPolicies';

interface TestGame {
  name: string;
  developer: string;
  publisher: string;
  category: number; // IGDB category (0=MainGame, 5=Mod, etc.)
  summary?: string;
  expectedResult: 'ALLOWED' | 'FILTERED';
  expectedReason: string;
}

interface CopyrightTestResult {
  level: CopyrightLevel;
  company: string;
  totalGames: number;
  allowedGames: number;
  filteredGames: number;
  allowedGamesList: string[];
  filteredGamesList: string[];
  correctPredictions: number;
  incorrectPredictions: number;
  accuracyPercentage: number;
}

// Test games for each copyright protection level
export const COPYRIGHT_TEST_GAMES = {
  
  // BLOCK_ALL Level Tests (extreme - filter everything from company)
  BLOCK_ALL: [
    {
      name: 'Hypothetical Blocked Game',
      developer: 'Blocked Company',
      publisher: 'Blocked Company',
      category: 0, // MainGame
      expectedResult: 'FILTERED',
      expectedReason: 'BLOCK_ALL policy - all content from this company filtered'
    },
    {
      name: 'Official Blocked Game',
      developer: 'Blocked Company',
      publisher: 'Blocked Company', 
      category: 0,
      expectedResult: 'FILTERED',
      expectedReason: 'BLOCK_ALL policy - even official games filtered'
    }
  ] as TestGame[],

  // AGGRESSIVE Level Tests (Nintendo/Disney - filter mods/fan content, allow official)
  AGGRESSIVE: [
    // Nintendo Official Games - Should be ALLOWED
    {
      name: 'Super Mario Bros.',
      developer: 'Nintendo',
      publisher: 'Nintendo',
      category: 0, // MainGame
      expectedResult: 'ALLOWED',
      expectedReason: 'Official Nintendo game from authorized developer/publisher'
    },
    {
      name: 'The Legend of Zelda: Breath of the Wild',
      developer: 'Nintendo EPD',
      publisher: 'Nintendo',
      category: 0,
      expectedResult: 'ALLOWED',
      expectedReason: 'Official Nintendo game from authorized first-party developer'
    },
    {
      name: 'Pokemon Red',
      developer: 'Game Freak',
      publisher: 'Nintendo',
      category: 0,
      expectedResult: 'ALLOWED',
      expectedReason: 'Official Pokemon game from authorized second-party developer'
    },
    
    // Nintendo Fan Content - Should be FILTERED
    {
      name: 'Super Mario Bros. ROM Hack',
      developer: 'Fan Developer',
      publisher: 'RomHack',
      category: 5, // Mod
      expectedResult: 'FILTERED',
      expectedReason: 'Nintendo franchise (AGGRESSIVE) + Category 5 (Mod) - fan content blocked'
    },
    {
      name: 'Mario Kart Unlimited',
      developer: 'Community Modder',
      publisher: 'Homebrew',
      category: 5,
      expectedResult: 'FILTERED',
      expectedReason: 'Nintendo franchise (AGGRESSIVE) + unauthorized developer - fan content blocked'
    },
    {
      name: 'Zelda Fan Game Project',
      developer: 'Indie Team',
      publisher: 'Fan Made',
      category: 0,
      summary: 'A fan-made Zelda adventure',
      expectedResult: 'FILTERED',
      expectedReason: 'Nintendo franchise (AGGRESSIVE) + fan indicators - unauthorized use blocked'
    },

    // Disney Content
    {
      name: 'Star Wars Jedi: Fallen Order',
      developer: 'Respawn Entertainment',
      publisher: 'Electronic Arts',
      category: 0,
      expectedResult: 'ALLOWED',
      expectedReason: 'Official Star Wars game from licensed developer'
    },
    {
      name: 'Star Wars Fan Mod',
      developer: 'Modding Community',
      publisher: 'Fan Made',
      category: 5,
      expectedResult: 'FILTERED',
      expectedReason: 'Disney franchise (AGGRESSIVE) + Category 5 (Mod) - fan content blocked'
    }
  ] as TestGame[],

  // MODERATE Level Tests (neutral - filter obvious fan content only)
  MODERATE: [
    // Official games - Should be ALLOWED
    {
      name: 'Halo Infinite',
      developer: 'Microsoft Game Studios',
      publisher: 'Microsoft Game Studios',
      category: 0,
      expectedResult: 'ALLOWED',
      expectedReason: 'Official game from MODERATE company - allowed'
    },
    {
      name: 'FIFA 24',
      developer: 'EA Sports',
      publisher: 'Electronic Arts',
      category: 0,
      expectedResult: 'ALLOWED',
      expectedReason: 'Official EA game - MODERATE policy allows official content'
    },

    // Well-made fan content - Should be ALLOWED (MODERATE is lenient)
    {
      name: 'Halo Custom Campaign',
      developer: 'Community Team',
      publisher: 'Fan Made',
      category: 5, // Mod
      expectedResult: 'ALLOWED',
      expectedReason: 'MODERATE company allows well-made fan content'
    },

    // Obviously problematic fan content - Should be FILTERED
    {
      name: 'Halo ROM Hack',
      developer: 'RomHacker',
      publisher: 'Illegal',
      category: 5,
      summary: 'Pirated Halo content',
      expectedResult: 'FILTERED',
      expectedReason: 'Obvious fan content with problematic indicators'
    }
  ] as TestGame[],

  // MOD_FRIENDLY Level Tests (Bethesda - encourage modding)
  MOD_FRIENDLY: [
    // Official games - Should be ALLOWED
    {
      name: 'The Elder Scrolls V: Skyrim',
      developer: 'Bethesda Game Studios',
      publisher: 'Bethesda Softworks',
      category: 0,
      expectedResult: 'ALLOWED',
      expectedReason: 'Official Bethesda game - company supports modding'
    },
    {
      name: 'Fallout 4',
      developer: 'Bethesda Game Studios',
      publisher: 'Bethesda Softworks',
      category: 0,
      expectedResult: 'ALLOWED',
      expectedReason: 'Official Bethesda game'
    },

    // Fan content and mods - Should be ALLOWED
    {
      name: 'Skyrim: Beyond Skyrim - Cyrodiil',
      developer: 'Beyond Skyrim Team',
      publisher: 'Modding Community',
      category: 5, // Mod
      expectedResult: 'ALLOWED',
      expectedReason: 'MOD_FRIENDLY company encourages fan content and mods'
    },
    {
      name: 'Enderal: Forgotten Stories',
      developer: 'SureAI',
      publisher: 'Fan Made',
      category: 5,
      expectedResult: 'ALLOWED',
      expectedReason: 'Bethesda MOD_FRIENDLY policy allows total conversion mods'
    },
    {
      name: 'Fallout: New Vegas Total Conversion',
      developer: 'Modding Team',
      publisher: 'Community',
      category: 5,
      expectedResult: 'ALLOWED',
      expectedReason: 'Bethesda actively supports modding ecosystem'
    },

    // Even extensive fan projects - Should be ALLOWED
    {
      name: 'The Elder Scrolls: Daggerfall Unity',
      developer: 'Fan Developer',
      publisher: 'Open Source',
      category: 5,
      expectedResult: 'ALLOWED',
      expectedReason: 'Bethesda allows even complete remakes by fans'
    }
  ] as TestGame[]
};

export async function testCopyrightProtectionLevel(
  level: CopyrightLevel,
  testGames: TestGame[],
  filterFunction: (games: any[]) => any[]
): Promise<CopyrightTestResult> {
  
  // Convert test games to format expected by filter
  const gameInputs = testGames.map(testGame => ({
    name: testGame.name,
    developer: testGame.developer,
    publisher: testGame.publisher,
    category: testGame.category,
    summary: testGame.summary || '',
    igdb_id: Math.floor(Math.random() * 100000) // Mock IGDB ID
  }));

  // Apply the filtering function
  const filteredResults = filterFunction(gameInputs);
  const filteredNames = filteredResults.map(game => game.name);

  const allowedGames: string[] = [];
  const filteredGames: string[] = [];
  let correctPredictions = 0;
  let incorrectPredictions = 0;

  testGames.forEach(testGame => {
    const wasAllowed = filteredNames.includes(testGame.name);
    const actualResult = wasAllowed ? 'ALLOWED' : 'FILTERED';
    
    if (wasAllowed) {
      allowedGames.push(testGame.name);
    } else {
      filteredGames.push(testGame.name);
    }

    if (actualResult === testGame.expectedResult) {
      correctPredictions++;
    } else {
      incorrectPredictions++;
      console.log(`❌ PREDICTION ERROR: "${testGame.name}" - Expected: ${testGame.expectedResult}, Actual: ${actualResult}`);
    }
  });

  const accuracyPercentage = (correctPredictions / testGames.length) * 100;
  
  return {
    level,
    company: getCompanyForLevel(level),
    totalGames: testGames.length,
    allowedGames: allowedGames.length,
    filteredGames: filteredGames.length,
    allowedGamesList: allowedGames,
    filteredGamesList: filteredGames,
    correctPredictions,
    incorrectPredictions,
    accuracyPercentage
  };
}

function getCompanyForLevel(level: CopyrightLevel): string {
  switch (level) {
    case CopyrightLevel.BLOCK_ALL:
      return 'Hypothetical Blocked Company';
    case CopyrightLevel.AGGRESSIVE:
      return 'Nintendo/Disney/Square Enix';
    case CopyrightLevel.MODERATE:
      return 'Microsoft/Sony/EA';
    case CopyrightLevel.MOD_FRIENDLY:
      return 'Bethesda/Valve/SEGA';
    default:
      return 'Unknown';
  }
}

export function generateCopyrightTestReport(results: CopyrightTestResult[]): string {
  let report = '🛡️ COPYRIGHT PROTECTION LEVELS TEST REPORT\n\n';
  
  results.forEach(result => {
    report += `📊 ${result.level} LEVEL - ${result.company}\n`;
    report += `🎯 Test Accuracy: ${result.correctPredictions}/${result.totalGames} (${result.accuracyPercentage.toFixed(1)}%)\n`;
    report += `✅ Allowed: ${result.allowedGames} games\n`;
    report += `🚫 Filtered: ${result.filteredGames} games\n`;
    
    if (result.allowedGamesList.length > 0) {
      report += `\n✅ ALLOWED GAMES:\n`;
      result.allowedGamesList.forEach(game => {
        report += `   - ${game}\n`;
      });
    }
    
    if (result.filteredGamesList.length > 0) {
      report += `\n🚫 FILTERED GAMES:\n`;
      result.filteredGamesList.forEach(game => {
        report += `   - ${game}\n`;
      });
    }
    
    report += '\n' + '='.repeat(70) + '\n\n';
  });
  
  const avgAccuracy = results.reduce((sum, r) => sum + r.accuracyPercentage, 0) / results.length;
  report += `📈 OVERALL TEST ACCURACY: ${avgAccuracy.toFixed(1)}%\n\n`;
  
  report += `📋 PROTECTION LEVEL SUMMARY:\n`;
  report += `🔒 BLOCK_ALL: Complete filtering of company content\n`;
  report += `🛡️ AGGRESSIVE: Official content allowed, fan/mod content blocked\n`;
  report += `⚖️ MODERATE: Official + quality fan content allowed, obvious fan content blocked\n`;
  report += `🎨 MOD_FRIENDLY: All content encouraged including extensive mods\n`;
  
  return report;
}

// Company examples for each level
export const COMPANY_EXAMPLES_BY_LEVEL = {
  [CopyrightLevel.BLOCK_ALL]: [
    'Currently none - emergency use only'
  ],
  [CopyrightLevel.AGGRESSIVE]: [
    'Nintendo', 'Game Freak', 'HAL Laboratory', 
    'Square Enix', 'Disney', 'Capcom', 
    'Take-Two Interactive', 'Rockstar Games', 'Konami'
  ],
  [CopyrightLevel.MODERATE]: [
    'Sony Interactive Entertainment', 'Microsoft Game Studios',
    'Electronic Arts', 'Ubisoft', 'Activision', 'Blizzard Entertainment'
  ],
  [CopyrightLevel.MOD_FRIENDLY]: [
    'Bethesda Game Studios', 'Bethesda Softworks', 'SEGA',
    'Valve', 'id Software', 'CD Projekt RED', 'Mojang', 'Paradox Interactive'
  ]
};

export function describeCopyrightLevel(level: CopyrightLevel): {
  name: string;
  description: string;
  officialGames: string;
  fanContent: string;
  mods: string;
  examples: string[];
} {
  switch (level) {
    case CopyrightLevel.BLOCK_ALL:
      return {
        name: 'BLOCK_ALL',
        description: 'Extreme case - filter ALL content from this company',
        officialGames: 'BLOCKED - Even official games are hidden',
        fanContent: 'BLOCKED - All fan content filtered',
        mods: 'BLOCKED - All mods filtered',
        examples: COMPANY_EXAMPLES_BY_LEVEL[level]
      };
      
    case CopyrightLevel.AGGRESSIVE:
      return {
        name: 'AGGRESSIVE',
        description: 'Strict protection - only official authorized content allowed',
        officialGames: 'ALLOWED - Official games from authorized developers shown',
        fanContent: 'BLOCKED - Fan games, ROM hacks, unauthorized content filtered',
        mods: 'BLOCKED - Mods and modifications filtered (Category 5)',
        examples: COMPANY_EXAMPLES_BY_LEVEL[level]
      };
      
    case CopyrightLevel.MODERATE:
      return {
        name: 'MODERATE',
        description: 'Balanced approach - filter obvious fan content only',
        officialGames: 'ALLOWED - All official games shown',
        fanContent: 'MIXED - Quality fan content allowed, obvious violations filtered',
        mods: 'MIXED - Well-made mods allowed, problematic mods filtered',
        examples: COMPANY_EXAMPLES_BY_LEVEL[level]
      };
      
    case CopyrightLevel.MOD_FRIENDLY:
      return {
        name: 'MOD_FRIENDLY',
        description: 'Pro-modding - encourage community content',
        officialGames: 'ALLOWED - All official games shown',
        fanContent: 'ALLOWED - Fan games and projects encouraged',
        mods: 'ALLOWED - Mods and total conversions actively supported',
        examples: COMPANY_EXAMPLES_BY_LEVEL[level]
      };
      
    default:
      return {
        name: 'UNKNOWN',
        description: 'Unknown protection level',
        officialGames: 'Unknown behavior',
        fanContent: 'Unknown behavior', 
        mods: 'Unknown behavior',
        examples: []
      };
  }
}