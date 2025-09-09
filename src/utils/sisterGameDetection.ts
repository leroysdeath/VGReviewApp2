// Sister Game and Sequel Detection System
// Identifies related games in the same series (sequels, prequels, sister games)

import { getGameBoostScore, getPriorityGamesByFranchise } from '../data/priorityGames';

interface GameSeriesInfo {
  baseName: string;
  seriesIdentifier: string;
  numberPattern?: string;
  versionPattern?: string;
  type: 'numbered' | 'versioned' | 'subtitled' | 'generational';
}

interface SisterGameQuery {
  originalQuery: string;
  expandedQueries: string[];
  seriesInfo: GameSeriesInfo;
}

/**
 * Database of known game series patterns for accurate detection
 */
const SERIES_PATTERNS = {
  // Numbered series patterns
  numbered: [
    {
      pattern: /^(final fantasy)\s*([ivx]+|\d+)$/i,
      baseName: 'Final Fantasy',
      identifier: 'final fantasy',
      generateSeries: (match: RegExpMatchArray) => {
        const numbers = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi'];
        const arabicNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'];
        return [
          ...numbers.map(num => `final fantasy ${num}`),
          ...arabicNumbers.map(num => `final fantasy ${num}`)
        ];
      }
    },
    {
      pattern: /^(dragon quest)\s*([ivx]+|\d+)$/i,
      baseName: 'Dragon Quest',
      identifier: 'dragon quest',
      generateSeries: (match: RegExpMatchArray) => {
        const numbers = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi'];
        const arabicNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
        return [
          ...numbers.map(num => `dragon quest ${num}`),
          ...arabicNumbers.map(num => `dragon quest ${num}`)
        ];
      }
    },
    {
      pattern: /^(grand theft auto)\s*(vice city|san andreas|\d+)$/i,
      baseName: 'Grand Theft Auto',
      identifier: 'grand theft auto',
      generateSeries: (match?: RegExpMatchArray) => [
        'grand theft auto', 'grand theft auto 2', 'grand theft auto iii', 'grand theft auto 3',
        'grand theft auto vice city', 'grand theft auto san andreas', 
        'grand theft auto iv', 'grand theft auto 4', 'grand theft auto v', 'grand theft auto 5'
      ]
    },
    {
      pattern: /^(elder scrolls)\s*([ivx]+|\d+|morrowind|oblivion|skyrim)$/i,
      baseName: 'The Elder Scrolls',
      identifier: 'elder scrolls',
      generateSeries: (match?: RegExpMatchArray) => [
        'elder scrolls arena', 'elder scrolls daggerfall', 'elder scrolls morrowind',
        'elder scrolls oblivion', 'elder scrolls skyrim', 'elder scrolls online'
      ]
    }
  ],

  // Version-based series (Pokemon colors, etc.)
  versioned: [
    {
      pattern: /^(pokemon)\s*(red|blue|yellow|green|gold|silver|crystal|ruby|sapphire|emerald|diamond|pearl|platinum|black|white|x|y|sun|moon|sword|shield|scarlet|violet)$/i,
      baseName: 'Pokemon',
      identifier: 'pokemon',
      generateSeries: (match?: RegExpMatchArray) => [
        'pokemon red', 'pokemon blue', 'pokemon green', 'pokemon yellow',
        'pokemon gold', 'pokemon silver', 'pokemon crystal',
        'pokemon ruby', 'pokemon sapphire', 'pokemon emerald',
        'pokemon diamond', 'pokemon pearl', 'pokemon platinum',
        'pokemon black', 'pokemon white', 'pokemon black 2', 'pokemon white 2',
        'pokemon x', 'pokemon y', 'pokemon sun', 'pokemon moon',
        'pokemon sword', 'pokemon shield', 'pokemon scarlet', 'pokemon violet'
      ]
    }
  ],

  // Subtitle-based series
  subtitled: [
    {
      pattern: /^(the\s+)?(legend\s+of\s+)?zelda(\s*:?\s*(.+))?$/i,
      baseName: 'The Legend of Zelda',
      identifier: 'zelda',
      generateSeries: (match?: RegExpMatchArray) => [
        // Full titles with "The Legend of Zelda" prefix for accurate matching
        'The Legend of Zelda', 
        'The Legend of Zelda: A Link to the Past',
        'The Legend of Zelda: Link\'s Awakening',
        'The Legend of Zelda: Ocarina of Time',
        'The Legend of Zelda: Majora\'s Mask',
        'The Legend of Zelda: The Wind Waker',
        'The Legend of Zelda: Twilight Princess',
        'The Legend of Zelda: Skyward Sword',
        'The Legend of Zelda: Breath of the Wild',
        'The Legend of Zelda: Tears of the Kingdom',
        'The Legend of Zelda: A Link Between Worlds',
        'The Legend of Zelda: Tri Force Heroes',
        'The Legend of Zelda: Four Swords',
        'The Legend of Zelda: The Minish Cap',
        'The Legend of Zelda: Phantom Hourglass',
        'The Legend of Zelda: Spirit Tracks',
        // Shorter variations for broader matching
        'Zelda II: The Adventure of Link',
        'Ocarina of Time',
        'Majora\'s Mask',
        'Wind Waker',
        'Twilight Princess',
        'Breath of the Wild'
      ]
    },
    {
      pattern: /^(super mario)\s*(bros|world|64|sunshine|galaxy|odyssey|wonder|3d world)$/i,
      baseName: 'Super Mario',
      identifier: 'mario',
      generateSeries: (match?: RegExpMatchArray) => [
        // Focus on mainline flagship Mario titles only
        'Super Mario Bros.', 'Super Mario Bros. 2', 'Super Mario Bros. 3',
        'Super Mario World', 'Super Mario World 2: Yoshi\'s Island',
        'Super Mario 64', 'Super Mario Sunshine',
        'Super Mario Galaxy', 'Super Mario Galaxy 2', 
        'Super Mario 3D Land', 'Super Mario 3D World',
        'Super Mario Odyssey', 'Super Mario Wonder',
        'New Super Mario Bros.', 'New Super Mario Bros. Wii',
        'New Super Mario Bros. 2', 'New Super Mario Bros. U',
        // Avoid spin-offs by NOT including these terms:
        // 'Mario Kart', 'Mario Party', 'Mario Tennis', 'Mario Golf',
        // 'Paper Mario', 'Mario & Luigi', 'Dr. Mario', 'Mario Sports'
      ]
    },
    {
      pattern: /^(call of duty)(?:\s*:?\s*(.+))?$/i,
      baseName: 'Call of Duty',
      identifier: 'call of duty',
      generateSeries: (match?: RegExpMatchArray) => [
        'call of duty', 'call of duty 2', 'call of duty 3',
        'call of duty modern warfare', 'call of duty world at war',
        'call of duty modern warfare 2', 'call of duty black ops',
        'call of duty modern warfare 3', 'call of duty black ops 2',
        'call of duty ghosts', 'call of duty advanced warfare',
        'call of duty black ops 3', 'call of duty infinite warfare',
        'call of duty wwii', 'call of duty black ops 4', 'call of duty modern warfare',
        'call of duty black ops cold war', 'call of duty vanguard', 'call of duty modern warfare 2'
      ]
    },
    {
      pattern: /^(assassins?\s*creed)(?:\s*:?\s*(.+))?$/i,
      baseName: 'Assassin\'s Creed',
      identifier: 'assassins creed',
      generateSeries: (match?: RegExpMatchArray) => [
        'assassins creed', 'assassins creed ii', 'assassins creed brotherhood',
        'assassins creed revelations', 'assassins creed iii', 'assassins creed iv black flag',
        'assassins creed unity', 'assassins creed syndicate', 'assassins creed origins',
        'assassins creed odyssey', 'assassins creed valhalla', 'assassins creed mirage'
      ]
    },
    {
      pattern: /^(prince of persia)(?:\s*:?\s*(.+))?$/i,
      baseName: 'Prince of Persia',
      identifier: 'prince of persia',
      generateSeries: (match?: RegExpMatchArray) => [
        'prince of persia', 'prince of persia 2', 'prince of persia sands of time',
        'prince of persia warrior within', 'prince of persia two thrones',
        'prince of persia 2008', 'prince of persia forgotten sands'
      ]
    },
    {
      pattern: /^(tom clancys?)(?:\s+(.+))?$/i,
      baseName: 'Tom Clancy\'s',
      identifier: 'tom clancy',
      generateSeries: (match?: RegExpMatchArray) => [
        'tom clancys rainbow six', 'tom clancys splinter cell', 'tom clancys ghost recon',
        'tom clancys the division', 'tom clancys endwar', 'tom clancys hawx',
        'tom clancys rainbow six siege', 'tom clancys the division 2'
      ]
    },
    {
      pattern: /^(kingdom hearts)(?:\s*(.+))?$/i,
      baseName: 'Kingdom Hearts',
      identifier: 'kingdom hearts',
      generateSeries: (match?: RegExpMatchArray) => [
        'kingdom hearts', 'kingdom hearts chain of memories', 'kingdom hearts ii',
        'kingdom hearts birth by sleep', 'kingdom hearts dream drop distance',
        'kingdom hearts iii', 'kingdom hearts union x'
      ]
    },
    {
      pattern: /^(elder scrolls)(?:\s*:?\s*(.+))?$/i,
      baseName: 'The Elder Scrolls',
      identifier: 'elder scrolls',
      generateSeries: (match?: RegExpMatchArray) => [
        'elder scrolls arena', 'elder scrolls daggerfall', 'elder scrolls morrowind',
        'elder scrolls oblivion', 'elder scrolls skyrim', 'elder scrolls online',
        'elder scrolls blades'
      ]
    },
    {
      pattern: /^(fallout)\s*(\d+|new vegas|tactics)?$/i,
      baseName: 'Fallout',
      identifier: 'fallout',
      generateSeries: (match?: RegExpMatchArray) => [
        'fallout', 'fallout 2', 'fallout tactics', 'fallout 3',
        'fallout new vegas', 'fallout 4', 'fallout 76', 'fallout shelter'
      ]
    },
    {
      pattern: /^(monster hunter)(?:\s*(.+))?$/i,
      baseName: 'Monster Hunter',
      identifier: 'monster hunter',
      generateSeries: (match?: RegExpMatchArray) => [
        'monster hunter', 'monster hunter freedom', 'monster hunter freedom 2',
        'monster hunter freedom unite', 'monster hunter tri', 'monster hunter 3',
        'monster hunter 4', 'monster hunter 4 ultimate', 'monster hunter generations',
        'monster hunter world', 'monster hunter rise'
      ]
    }
  ],

  // Generational series (Street Fighter, Tekken, etc.)
  generational: [
    {
      pattern: /^(street fighter)\s*([ivx]+|\d+|alpha|ex|zero)?$/i,
      baseName: 'Street Fighter',
      identifier: 'street fighter',
      generateSeries: (match?: RegExpMatchArray) => [
        'street fighter', 'street fighter ii', 'street fighter 2',
        'street fighter alpha', 'street fighter iii', 'street fighter 3',
        'street fighter iv', 'street fighter 4', 'street fighter v', 'street fighter 5',
        'street fighter vi', 'street fighter 6'
      ]
    },
    {
      pattern: /^(tekken)\s*(\d+)?$/i,
      baseName: 'Tekken',
      identifier: 'tekken',
      generateSeries: (match?: RegExpMatchArray) => [
        'tekken', 'tekken 2', 'tekken 3', 'tekken 4', 'tekken 5', 'tekken 6', 'tekken 7', 'tekken 8'
      ]
    },
    {
      pattern: /^(resident evil)\s*(\d+|village|biohazard)?$/i,
      baseName: 'Resident Evil',
      identifier: 'resident evil',
      generateSeries: (match?: RegExpMatchArray) => [
        'resident evil', 'resident evil 2', 'resident evil 3', 'resident evil 4',
        'resident evil 5', 'resident evil 6', 'resident evil 7', 'resident evil village',
        'resident evil code veronica', 'resident evil revelations'
      ]
    },
    {
      pattern: /^(metal gear solid)\s*([ivx]+|\d+)?$/i,
      baseName: 'Metal Gear Solid',
      identifier: 'metal gear solid',
      generateSeries: (match?: RegExpMatchArray) => [
        'metal gear solid', 'metal gear solid 2', 'metal gear solid 3',
        'metal gear solid 4', 'metal gear solid 5', 'metal gear solid v'
      ]
    },
    {
      pattern: /^(silent hill)\s*(\d+)?$/i,
      baseName: 'Silent Hill',
      identifier: 'silent hill',
      generateSeries: (match?: RegExpMatchArray) => [
        'silent hill', 'silent hill 2', 'silent hill 3', 'silent hill 4',
        'silent hill origins', 'silent hill homecoming', 'silent hill downpour'
      ]
    },
    {
      pattern: /^(battlefield)\s*(\d+|bad company|vietnam)?$/i,
      baseName: 'Battlefield',
      identifier: 'battlefield',
      generateSeries: (match?: RegExpMatchArray) => [
        'battlefield 1942', 'battlefield vietnam', 'battlefield 2',
        'battlefield bad company', 'battlefield bad company 2', 'battlefield 3',
        'battlefield 4', 'battlefield 1', 'battlefield v', 'battlefield 2042'
      ]
    },
    {
      pattern: /^(gran turismo)\s*(\d+|sport)?$/i,
      baseName: 'Gran Turismo',
      identifier: 'gran turismo',
      generateSeries: (match?: RegExpMatchArray) => [
        'gran turismo', 'gran turismo 2', 'gran turismo 3', 'gran turismo 4',
        'gran turismo 5', 'gran turismo 6', 'gran turismo sport', 'gran turismo 7'
      ]
    },
    {
      pattern: /^(forza)\s*(motorsport|horizon)?\s*(\d+)?$/i,
      baseName: 'Forza',
      identifier: 'forza',
      generateSeries: (match?: RegExpMatchArray) => [
        'forza motorsport', 'forza motorsport 2', 'forza motorsport 3', 'forza motorsport 4',
        'forza horizon', 'forza horizon 2', 'forza horizon 3', 'forza horizon 4', 'forza horizon 5'
      ]
    },
    {
      pattern: /^(medal of honor)(?:\s*:?\s*(.+))?$/i,
      baseName: 'Medal of Honor',
      identifier: 'medal of honor',
      generateSeries: (match?: RegExpMatchArray) => [
        'medal of honor', 'medal of honor underground', 'medal of honor allied assault',
        'medal of honor pacific assault', 'medal of honor european assault',
        'medal of honor airborne', 'medal of honor 2010', 'medal of honor warfighter'
      ]
    },
    {
      pattern: /^(hitman)\s*(\d+|codename|contracts|blood money|absolution)?$/i,
      baseName: 'Hitman',
      identifier: 'hitman',
      generateSeries: (match?: RegExpMatchArray) => [
        'hitman codename 47', 'hitman 2 silent assassin', 'hitman contracts',
        'hitman blood money', 'hitman absolution', 'hitman', 'hitman 2', 'hitman 3'
      ]
    }
  ]
};

/**
 * Detect if a search query matches a known game series pattern
 */
export function detectGameSeries(searchQuery: string): SisterGameQuery | null {
  const normalizedQuery = searchQuery.toLowerCase().trim();
  
  // Check numbered series
  for (const seriesPattern of SERIES_PATTERNS.numbered) {
    const match = normalizedQuery.match(seriesPattern.pattern);
    if (match) {
      console.log(`🔢 NUMBERED SERIES DETECTED: "${searchQuery}" matches ${seriesPattern.baseName}`);
      return {
        originalQuery: searchQuery,
        expandedQueries: seriesPattern.generateSeries(match),
        seriesInfo: {
          baseName: seriesPattern.baseName,
          seriesIdentifier: seriesPattern.identifier,
          type: 'numbered'
        }
      };
    }
  }

  // Check versioned series
  for (const seriesPattern of SERIES_PATTERNS.versioned) {
    const match = normalizedQuery.match(seriesPattern.pattern);
    if (match) {
      console.log(`🎨 VERSIONED SERIES DETECTED: "${searchQuery}" matches ${seriesPattern.baseName}`);
      return {
        originalQuery: searchQuery,
        expandedQueries: seriesPattern.generateSeries(match),
        seriesInfo: {
          baseName: seriesPattern.baseName,
          seriesIdentifier: seriesPattern.identifier,
          versionPattern: match[2],
          type: 'versioned'
        }
      };
    }
  }

  // Check subtitled series
  for (const seriesPattern of SERIES_PATTERNS.subtitled) {
    const match = normalizedQuery.match(seriesPattern.pattern);
    if (match) {
      console.log(`📖 SUBTITLED SERIES DETECTED: "${searchQuery}" matches ${seriesPattern.baseName}`);
      return {
        originalQuery: searchQuery,
        expandedQueries: seriesPattern.generateSeries(match),
        seriesInfo: {
          baseName: seriesPattern.baseName,
          seriesIdentifier: seriesPattern.identifier,
          type: 'subtitled'
        }
      };
    }
  }

  // Check generational series
  for (const seriesPattern of SERIES_PATTERNS.generational) {
    const match = normalizedQuery.match(seriesPattern.pattern);
    if (match) {
      console.log(`🏆 GENERATIONAL SERIES DETECTED: "${searchQuery}" matches ${seriesPattern.baseName}`);
      return {
        originalQuery: searchQuery,
        expandedQueries: seriesPattern.generateSeries(match),
        seriesInfo: {
          baseName: seriesPattern.baseName,
          seriesIdentifier: seriesPattern.identifier,
          type: 'generational'
        }
      };
    }
  }

  return null;
}

/**
 * Calculate genre similarity bonus for sister games
 */
export function calculateGenreSimilarityBonus(originalGameGenres: string[], relatedGameGenres: string[]): number {
  if (!originalGameGenres?.length || !relatedGameGenres?.length) {
    return 0;
  }

  const normalizeGenre = (genre: string) => genre.toLowerCase().trim();
  const originalNormalized = originalGameGenres.map(normalizeGenre);
  const relatedNormalized = relatedGameGenres.map(normalizeGenre);

  // Count exact genre matches
  let exactMatches = 0;
  let partialMatches = 0;

  originalNormalized.forEach(originalGenre => {
    if (relatedNormalized.includes(originalGenre)) {
      exactMatches++;
    } else {
      // Check for partial matches (e.g., "action" in "action-adventure")
      const partialMatch = relatedNormalized.some(relatedGenre => 
        relatedGenre.includes(originalGenre) || originalGenre.includes(relatedGenre)
      );
      if (partialMatch) {
        partialMatches++;
      }
    }
  });

  // Calculate similarity score
  const totalMatches = exactMatches + (partialMatches * 0.5);
  const maxPossibleMatches = Math.max(originalNormalized.length, relatedNormalized.length);
  const similarityRatio = totalMatches / maxPossibleMatches;

  // Return bonus points based on genre similarity
  if (similarityRatio >= 0.8) {
    return 200; // Very similar genres
  } else if (similarityRatio >= 0.5) {
    return 100; // Somewhat similar genres
  } else if (similarityRatio >= 0.3) {
    return 50;  // Slightly similar genres
  }

  return 0; // No significant genre similarity
}

/**
 * Determine if a game is likely a sister/sequel based on title analysis
 */
export function isSisterGame(originalQuery: string, candidateName: string, seriesInfo: GameSeriesInfo): {
  isSister: boolean;
  confidence: number;
  relationship: 'exact' | 'sequel' | 'prequel' | 'sister' | 'spin-off' | 'none';
} {
  const originalLower = originalQuery.toLowerCase().trim();
  const candidateLower = candidateName.toLowerCase().trim();

  // Exact match
  if (originalLower === candidateLower) {
    return { isSister: true, confidence: 1.0, relationship: 'exact' };
  }

  // Check if candidate contains the series identifier
  if (!candidateLower.includes(seriesInfo.seriesIdentifier.toLowerCase())) {
    return { isSister: false, confidence: 0.0, relationship: 'none' };
  }

  // Numbered series analysis
  if (seriesInfo.type === 'numbered') {
    const originalNumber = extractNumber(originalLower);
    const candidateNumber = extractNumber(candidateLower);
    
    if (originalNumber && candidateNumber) {
      const numberDiff = Math.abs(originalNumber - candidateNumber);
      if (numberDiff === 0) {
        return { isSister: true, confidence: 1.0, relationship: 'exact' };
      } else if (numberDiff === 1) {
        const relationship = candidateNumber > originalNumber ? 'sequel' : 'prequel';
        return { isSister: true, confidence: 0.9, relationship };
      } else if (numberDiff <= 3) {
        const relationship = candidateNumber > originalNumber ? 'sequel' : 'prequel';
        return { isSister: true, confidence: 0.7, relationship };
      } else {
        return { isSister: true, confidence: 0.5, relationship: 'sequel' };
      }
    }
  }

  // Versioned series analysis (like Pokemon colors)
  if (seriesInfo.type === 'versioned') {
    // Different versions of the same generation are sisters
    return { isSister: true, confidence: 0.8, relationship: 'sister' };
  }

  // Subtitled series analysis
  if (seriesInfo.type === 'subtitled') {
    return { isSister: true, confidence: 0.7, relationship: 'sister' };
  }

  // Generational series analysis
  if (seriesInfo.type === 'generational') {
    return { isSister: true, confidence: 0.6, relationship: 'sister' };
  }

  return { isSister: false, confidence: 0.0, relationship: 'none' };
}

/**
 * Extract number from game title (handles both Roman numerals and Arabic numbers)
 */
function extractNumber(title: string): number | null {
  // Roman numerals mapping
  const romanNumerals: { [key: string]: number } = {
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
    'xi': 11, 'xii': 12, 'xiii': 13, 'xiv': 14, 'xv': 15, 'xvi': 16
  };

  // Try to find Roman numerals first
  const romanMatch = title.match(/\b([ivx]+)\b/i);
  if (romanMatch) {
    const roman = romanMatch[1].toLowerCase();
    if (romanNumerals[roman]) {
      return romanNumerals[roman];
    }
  }

  // Try to find Arabic numbers
  const numberMatch = title.match(/\b(\d+)\b/);
  if (numberMatch) {
    return parseInt(numberMatch[1], 10);
  }

  return null;
}

/**
 * Generate optimized search queries for sister games with API limits in mind
 */
export function generateSisterGameQueries(originalQuery: string): string[] {
  const seriesDetection = detectGameSeries(originalQuery);
  
  if (!seriesDetection) {
    console.log(`📝 NO SERIES DETECTED for "${originalQuery}"`);
    return [];
  }

  // Limit the number of expanded queries to respect API limits
  const maxQueries = 8; // Reasonable limit to avoid API overload
  const limitedQueries = seriesDetection.expandedQueries.slice(0, maxQueries);
  
  console.log(`🎯 SISTER GAME EXPANSION: "${originalQuery}" → ${limitedQueries.length} related queries`);
  console.log(`   Series: ${seriesDetection.seriesInfo.baseName} (${seriesDetection.seriesInfo.type})`);
  
  return limitedQueries;
}

/**
 * Apply sister game scoring boost to search results
 */
export function applySisterGameBoost(games: any[], originalQuery: string, originalGameGenres?: string[]): any[] {
  const seriesDetection = detectGameSeries(originalQuery);
  
  if (!seriesDetection) {
    return games;
  }

  console.log(`🚀 APPLYING SISTER GAME BOOSTS for series: ${seriesDetection.seriesInfo.baseName}`);

  return games.map(game => {
    const sisterAnalysis = isSisterGame(originalQuery, game.name, seriesDetection.seriesInfo);
    
    if (sisterAnalysis.isSister) {
      // Base sister game boost
      let sisterBoost = 0;
      switch (sisterAnalysis.relationship) {
        case 'exact': sisterBoost = 300; break;
        case 'sequel': sisterBoost = 200; break;
        case 'prequel': sisterBoost = 200; break;
        case 'sister': sisterBoost = 150; break;
        case 'spin-off': sisterBoost = 100; break;
      }

      // Apply confidence multiplier
      sisterBoost = Math.round(sisterBoost * sisterAnalysis.confidence);

      // Genre similarity bonus
      const genreBonus = originalGameGenres ? 
        calculateGenreSimilarityBonus(originalGameGenres, game.genres || []) : 0;

      const totalBoost = sisterBoost + genreBonus;

      console.log(`   🎮 "${game.name}": ${sisterAnalysis.relationship} (+${sisterBoost}) + genre (+${genreBonus}) = +${totalBoost}`);

      return {
        ...game,
        _sisterGameBoost: totalBoost,
        _sisterGameRelationship: sisterAnalysis.relationship,
        _sisterGameConfidence: sisterAnalysis.confidence
      };
    }

    return game;
  });
}

/**
 * Detect if a game is a spin-off or non-flagship title
 */
function isSpinOff(gameName: string, franchiseBaseName: string): boolean {
  const lowerName = gameName.toLowerCase();
  const lowerBase = franchiseBaseName.toLowerCase();
  
  // Mario spin-off patterns
  if (lowerBase.includes('mario')) {
    const spinOffPatterns = [
      'kart', 'party', 'tennis', 'golf', 'sports', 'strikers', 'baseball',
      'basketball', 'olympic', 'paper mario', 'mario & luigi', 'dr. mario',
      'mario vs', 'mario is missing', 'mario teaches', 'hotel mario'
    ];
    return spinOffPatterns.some(pattern => lowerName.includes(pattern));
  }
  
  // Zelda spin-off patterns
  if (lowerBase.includes('zelda')) {
    const spinOffPatterns = [
      'link\'s crossbow', 'tingle', 'hyrule warriors', 'cadence of hyrule',
      'zelda game & watch', 'bs zelda'
    ];
    return spinOffPatterns.some(pattern => lowerName.includes(pattern));
  }
  
  // Pokemon spin-off patterns
  if (lowerBase.includes('pokemon') || lowerBase.includes('pokémon')) {
    const spinOffPatterns = [
      'mystery dungeon', 'ranger', 'rumble', 'snap', 'stadium', 'colosseum',
      'xd', 'pinball', 'puzzle', 'trozei', 'dash', 'channel', 'go', 'unite',
      'cafe', 'quest', 'masters', 'duel', 'magikarp', 'sleep'
    ];
    return spinOffPatterns.some(pattern => lowerName.includes(pattern));
  }
  
  // Generic spin-off indicators
  const genericSpinOffPatterns = [
    'mobile', 'pinball', 'puzzle', 'racing', 'party', 'sports', 
    'tactics', 'warriors', 'all-stars', 'remix', 'collection'
  ];
  
  return genericSpinOffPatterns.some(pattern => lowerName.includes(pattern));
}

/**
 * Apply flagship title prioritization with priority game database
 */
export function prioritizeFlagshipTitles(games: any[], query: string): any[] {
  const seriesInfo = detectGameSeries(query);
  if (!seriesInfo) return games;
  
  const baseName = seriesInfo.seriesInfo.baseName;
  
  // Import priority games database - moved to top of file
  // (imports are handled at top of file)
  
  return games.map(game => {
    let totalBoost = game._sisterGameBoost || 0;
    let flagshipStatus = 'unknown';
    
    // Check priority games database for flagship boost
    const priorityBoost = getGameBoostScore(game.name, query);
    if (priorityBoost > 0) {
      totalBoost += priorityBoost;
      flagshipStatus = 'flagship';
      console.log(`🏆 Flagship game detected: "${game.name}" (+${priorityBoost} priority boost)`);
    }
    
    // Check if it's a spin-off and penalize
    if (isSpinOff(game.name, baseName)) {
      totalBoost = Math.max(0, totalBoost - 100);
      if (flagshipStatus === 'unknown') {
        flagshipStatus = 'spin-off';
      }
    }
    
    // Check if it's already identified as a flagship by sister game logic
    if (game._sisterGameRelationship === 'exact' || 
        game._sisterGameRelationship === 'sequel' ||
        game._sisterGameRelationship === 'prequel') {
      if (flagshipStatus === 'unknown') {
        flagshipStatus = 'flagship';
      }
    }
    
    return {
      ...game,
      _sisterGameBoost: totalBoost,
      _flagshipStatus: flagshipStatus,
      _priorityBoost: priorityBoost
    };
  });
}