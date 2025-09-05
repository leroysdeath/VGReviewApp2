// Sister Game and Sequel Detection System
// Identifies related games in the same series (sequels, prequels, sister games)

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
        'legend of zelda', 'zelda adventure of link', 'zelda link to the past',
        'zelda links awakening', 'zelda ocarina of time', 'zelda majoras mask',
        'zelda wind waker', 'zelda twilight princess', 'zelda skyward sword',
        'zelda breath of the wild', 'zelda tears of the kingdom'
      ]
    },
    {
      pattern: /^(super mario)\s*(bros|world|64|sunshine|galaxy|odyssey|wonder|3d world)$/i,
      baseName: 'Super Mario',
      identifier: 'mario',
      generateSeries: (match?: RegExpMatchArray) => [
        'super mario bros', 'super mario bros 2', 'super mario bros 3',
        'super mario world', 'super mario 64', 'super mario sunshine',
        'super mario galaxy', 'super mario galaxy 2', 'super mario odyssey',
        'super mario 3d world', 'super mario wonder'
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