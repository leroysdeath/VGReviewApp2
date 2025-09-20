/**
 * Service for detecting search intent and normalizing queries
 * Handles abbreviations, Roman numerals, and common variations
 */

export class SearchIntentService {
  // Common game abbreviations and their full names
  private readonly abbreviations: Record<string, string> = {
    'GTA': 'Grand Theft Auto',
    'COD': 'Call of Duty',
    'FF': 'Final Fantasy',
    'MGS': 'Metal Gear Solid',
    'AC': 'Assassin\'s Creed',
    'BF': 'Battlefield',
    'CS': 'Counter-Strike',
    'CSGO': 'Counter-Strike: Global Offensive',
    'CS2': 'Counter-Strike 2',
    'PUBG': 'PlayerUnknown\'s Battlegrounds',
    'WOW': 'World of Warcraft',
    'LOL': 'League of Legends',
    'DOTA': 'Defense of the Ancients',
    'TF': 'Team Fortress',
    'HL': 'Half-Life',
    'SF': 'Street Fighter',
    'MK': 'Mortal Kombat',
    'RE': 'Resident Evil',
    'DMC': 'Devil May Cry',
    'GOW': 'God of War',
    'TLOU': 'The Last of Us',
    'RDR': 'Red Dead Redemption',
    'NFS': 'Need for Speed',
    'FIFA': 'EA Sports FC', // Also keep FIFA as-is since it's a known brand
    'PES': 'Pro Evolution Soccer',
    'NBA2K': 'NBA 2K',
    'NHL': 'NHL',
    'NFL': 'Madden NFL',
    'MLB': 'MLB The Show',
    'GT': 'Gran Turismo',
    'FH': 'Forza Horizon',
    'FM': 'Forza Motorsport',
    'TES': 'The Elder Scrolls',
    'FO': 'Fallout',
    'BG': 'Baldur\'s Gate',
    'DA': 'Dragon Age',
    'ME': 'Mass Effect',
    'DS': 'Dark Souls',
    'BB': 'Bloodborne',
    'ER': 'Elden Ring',
    'BOTW': 'Breath of the Wild',
    'TOTK': 'Tears of the Kingdom',
    'SMB': 'Super Mario Bros',
    'SMBW': 'Super Mario Bros Wonder',
    'MK8': 'Mario Kart 8',
    'SSBU': 'Super Smash Bros Ultimate',
    'P5': 'Persona 5',
    'P4': 'Persona 4',
    'P3': 'Persona 3',
    'KH': 'Kingdom Hearts',
    'DQ': 'Dragon Quest',
    'MH': 'Monster Hunter',
    'MHW': 'Monster Hunter World',
    'MHR': 'Monster Hunter Rise'
  };

  // Roman numeral mappings
  private readonly romanNumerals: Record<string, string> = {
    'I': '1',
    'II': '2',
    'III': '3',
    'IV': '4',
    'V': '5',
    'VI': '6',
    'VII': '7',
    'VIII': '8',
    'IX': '9',
    'X': '10',
    'XI': '11',
    'XII': '12',
    'XIII': '13',
    'XIV': '14',
    'XV': '15',
    'XVI': '16',
    'XVII': '17',
    'XVIII': '18',
    'XIX': '19',
    'XX': '20'
  };

  // Reverse mapping for numbers to Roman numerals
  private readonly arabicToRoman: Record<string, string> = Object.entries(this.romanNumerals)
    .reduce((acc, [roman, arabic]) => ({ ...acc, [arabic]: roman }), {});

  /**
   * Generate search query variants based on intent detection
   */
  generateQueryVariants(query: string): string[] {
    const variants = new Set<string>();
    const normalizedQuery = query.trim();

    // Always include original query
    variants.add(normalizedQuery);

    // Handle abbreviations
    this.addAbbreviationVariants(normalizedQuery, variants);

    // Handle Roman numerals
    this.addRomanNumeralVariants(normalizedQuery, variants);

    // Handle number to word conversions
    this.addNumberWordVariants(normalizedQuery, variants);

    // Handle common spacing/punctuation variations
    this.addPunctuationVariants(normalizedQuery, variants);

    // Handle sequel patterns
    this.addSequelPatterns(normalizedQuery, variants);

    return Array.from(variants);
  }

  /**
   * Add abbreviation expansions
   */
  private addAbbreviationVariants(query: string, variants: Set<string>): void {
    const upperQuery = query.toUpperCase();

    // Check for exact abbreviation match
    if (this.abbreviations[upperQuery]) {
      variants.add(this.abbreviations[upperQuery]);
    }

    // Check for abbreviations at the start of the query
    Object.entries(this.abbreviations).forEach(([abbr, full]) => {
      const regex = new RegExp(`^${abbr}\\b`, 'i');
      if (regex.test(query)) {
        variants.add(query.replace(regex, full));
      }
    });

    // Also check if query contains the full name and create abbreviation
    Object.entries(this.abbreviations).forEach(([abbr, full]) => {
      if (query.toLowerCase().includes(full.toLowerCase())) {
        variants.add(query.replace(new RegExp(full, 'gi'), abbr));
      }
    });
  }

  /**
   * Add Roman numeral conversions
   */
  private addRomanNumeralVariants(query: string, variants: Set<string>): void {
    // Pattern to match Roman numerals at word boundaries
    const romanPattern = /\b([IVX]+)\b/g;
    const matches = query.match(romanPattern);

    if (matches) {
      matches.forEach(match => {
        const arabic = this.romanNumerals[match];
        if (arabic) {
          // Replace Roman with Arabic
          variants.add(query.replace(match, arabic));
        }
      });
    }

    // Also check for numbers to convert to Roman
    const numberPattern = /\b(\d{1,2})\b/g;
    const numberMatches = query.match(numberPattern);

    if (numberMatches) {
      numberMatches.forEach(match => {
        const roman = this.arabicToRoman[match];
        if (roman) {
          // Replace Arabic with Roman
          variants.add(query.replace(match, roman));
        }
      });
    }
  }

  /**
   * Add number word conversions
   */
  private addNumberWordVariants(query: string, variants: Set<string>): void {
    const numberWords: Record<string, string> = {
      'one': '1',
      'two': '2',
      'three': '3',
      'four': '4',
      'five': '5',
      'six': '6',
      'seven': '7',
      'eight': '8',
      'nine': '9',
      'ten': '10'
    };

    Object.entries(numberWords).forEach(([word, number]) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (regex.test(query)) {
        variants.add(query.replace(regex, number));
      }
    });

    // Reverse: numbers to words
    Object.entries(numberWords).forEach(([word, number]) => {
      const regex = new RegExp(`\\b${number}\\b`, 'g');
      if (regex.test(query)) {
        variants.add(query.replace(regex, word));
      }
    });
  }

  /**
   * Add punctuation and spacing variations
   */
  private addPunctuationVariants(query: string, variants: Set<string>): void {
    // Remove colons and add variant
    if (query.includes(':')) {
      variants.add(query.replace(/:/g, ''));
      variants.add(query.replace(/:/g, ' '));
    }

    // Handle hyphens
    if (query.includes('-')) {
      variants.add(query.replace(/-/g, ' '));
      variants.add(query.replace(/-/g, ''));
    }

    // Handle apostrophes
    if (query.includes('\'')) {
      variants.add(query.replace(/'/g, ''));
    }

    // Handle "and" vs "&"
    if (query.includes(' and ')) {
      variants.add(query.replace(/ and /gi, ' & '));
    }
    if (query.includes(' & ')) {
      variants.add(query.replace(/ & /g, ' and '));
    }
  }

  /**
   * Add sequel pattern variations
   */
  private addSequelPatterns(query: string, variants: Set<string>): void {
    // Handle "Part X" patterns
    const partPattern = /\bpart\s+(\d+|[IVX]+)\b/gi;
    if (partPattern.test(query)) {
      // Remove "Part X" to search for base game
      variants.add(query.replace(partPattern, '').trim());
    }

    // Handle "Episode X" patterns
    const episodePattern = /\bepisode\s+(\d+|[IVX]+)\b/gi;
    if (episodePattern.test(query)) {
      variants.add(query.replace(episodePattern, '').trim());
    }

    // Handle "Chapter X" patterns
    const chapterPattern = /\bchapter\s+(\d+|[IVX]+)\b/gi;
    if (chapterPattern.test(query)) {
      variants.add(query.replace(chapterPattern, '').trim());
    }

    // Handle year in parentheses (e.g., "Doom (2016)")
    const yearPattern = /\s*\(\d{4}\)\s*/g;
    if (yearPattern.test(query)) {
      variants.add(query.replace(yearPattern, ' ').trim());
    }
  }

  /**
   * Detect if query is looking for a specific franchise
   */
  detectFranchise(query: string): string | null {
    const franchises: Record<string, string[]> = {
      'Grand Theft Auto': ['gta', 'grand theft auto', 'vice city', 'san andreas', 'liberty city'],
      'Call of Duty': ['cod', 'call of duty', 'modern warfare', 'black ops', 'warzone'],
      'Final Fantasy': ['ff', 'final fantasy'],
      'The Elder Scrolls': ['elder scrolls', 'skyrim', 'oblivion', 'morrowind', 'tes'],
      'Super Mario': ['mario', 'super mario', 'mario bros', 'mario kart', 'mario party'],
      'The Legend of Zelda': ['zelda', 'link', 'breath of the wild', 'tears of the kingdom', 'botw', 'totk'],
      'Pokemon': ['pokemon', 'pokémon', 'pikachu'],
      'Assassin\'s Creed': ['assassins creed', 'assassin\'s creed', 'ac'],
      'Metal Gear': ['metal gear', 'mgs', 'snake'],
      'Resident Evil': ['resident evil', 'biohazard', 're'],
      'Street Fighter': ['street fighter', 'sf'],
      'Mortal Kombat': ['mortal kombat', 'mk']
    };

    const lowerQuery = query.toLowerCase();
    for (const [franchise, keywords] of Object.entries(franchises)) {
      if (keywords.some(keyword => lowerQuery.includes(keyword))) {
        return franchise;
      }
    }

    return null;
  }

  /**
   * Score results based on query intent
   */
  scoreResult(query: string, gameName: string): number {
    let score = 0;
    const lowerQuery = query.toLowerCase();
    const lowerName = gameName.toLowerCase();

    // Exact match
    if (lowerName === lowerQuery) {
      score += 100;
    }

    // Starts with query
    if (lowerName.startsWith(lowerQuery)) {
      score += 50;
    }

    // Contains exact query
    if (lowerName.includes(lowerQuery)) {
      score += 30;
    }

    // Word match scoring
    const queryWords = lowerQuery.split(/\s+/);
    const nameWords = lowerName.split(/\s+/);

    queryWords.forEach(queryWord => {
      if (nameWords.some(nameWord => nameWord === queryWord)) {
        score += 20;
      } else if (nameWords.some(nameWord => nameWord.includes(queryWord))) {
        score += 10;
      }
    });

    // Franchise match bonus
    const franchise = this.detectFranchise(query);
    if (franchise && lowerName.includes(franchise.toLowerCase())) {
      score += 25;
    }

    return score;
  }
}

// Export singleton instance
export const searchIntentService = new SearchIntentService();