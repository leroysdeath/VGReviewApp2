/**
 * Fuzzy Search Utility
 * Implements fuzzy string matching and title normalization for better game search results
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Normalize game titles for better matching
 * Handles common variations and abbreviations
 */
export function normalizeTitle(title: string): string {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .trim()
    // Normalize spacing around special characters
    .replace(/\s*:\s*/g, ': ')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s*&\s*/g, ' & ')
    // Handle common title variations
    .replace(/\bmega\s*man\b/g, 'megaman')
    .replace(/\bmegaman\b/g, 'mega man')
    .replace(/\bbaldur's\s*gate\b/g, 'baldurs gate')
    .replace(/\bbaldurs\s*gate\b/g, 'baldurs gate')
    // Roman numerals normalization
    .replace(/\b1\b/g, 'i')
    .replace(/\b2\b/g, 'ii')
    .replace(/\b3\b/g, 'iii')
    .replace(/\b4\b/g, 'iv')
    .replace(/\b5\b/g, 'v')
    // Common abbreviations
    .replace(/\bvs\.?\b/g, 'vs')
    .replace(/\bdr\.?\b/g, 'dr')
    .replace(/\bmr\.?\b/g, 'mr')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract key terms from a title for fuzzy matching
 */
export function extractKeyTerms(title: string): string[] {
  const normalized = normalizeTitle(title);
  const words = normalized.split(/\s+/);
  
  // Filter out common words that don't help with matching
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'game', 'edition', 'version', 'collection', 'hd', 'remastered', 'remake', 'deluxe'
  ]);
  
  return words.filter(word => word.length > 1 && !stopWords.has(word));
}

/**
 * Calculate fuzzy match score between query and title
 */
export function fuzzyMatchScore(query: string, title: string): number {
  if (!query || !title) return 0;
  
  const normalizedQuery = normalizeTitle(query);
  const normalizedTitle = normalizeTitle(title);
  
  // Exact match gets highest score
  if (normalizedQuery === normalizedTitle) {
    return 1.0;
  }
  
  // Direct substring match gets high score
  if (normalizedTitle.includes(normalizedQuery) || normalizedQuery.includes(normalizedTitle)) {
    const longer = Math.max(normalizedQuery.length, normalizedTitle.length);
    const shorter = Math.min(normalizedQuery.length, normalizedTitle.length);
    return 0.9 * (shorter / longer);
  }
  
  const queryTerms = extractKeyTerms(query);
  const titleTerms = extractKeyTerms(title);
  
  if (queryTerms.length === 0 || titleTerms.length === 0) {
    return 0;
  }
  
  // Calculate term-based fuzzy matching
  let totalScore = 0;
  let matchedTerms = 0;
  
  for (const queryTerm of queryTerms) {
    let bestTermScore = 0;
    
    for (const titleTerm of titleTerms) {
      // Exact term match
      if (queryTerm === titleTerm) {
        bestTermScore = 1.0;
        break;
      }
      
      // Substring match
      if (titleTerm.includes(queryTerm) || queryTerm.includes(titleTerm)) {
        const longer = Math.max(queryTerm.length, titleTerm.length);
        const shorter = Math.min(queryTerm.length, titleTerm.length);
        bestTermScore = Math.max(bestTermScore, 0.8 * (shorter / longer));
        continue;
      }
      
      // Levenshtein distance for close matches
      if (Math.min(queryTerm.length, titleTerm.length) >= 4) {
        const distance = levenshteinDistance(queryTerm, titleTerm);
        const maxLength = Math.max(queryTerm.length, titleTerm.length);
        const similarity = 1 - (distance / maxLength);
        
        // Only consider reasonably similar terms (60% similarity)
        if (similarity >= 0.6) {
          bestTermScore = Math.max(bestTermScore, 0.6 * similarity);
        }
      }
    }
    
    if (bestTermScore > 0) {
      totalScore += bestTermScore;
      matchedTerms++;
    }
  }
  
  if (matchedTerms === 0) return 0;
  
  // Average score of matched terms, with bonus for matching more terms
  const averageScore = totalScore / matchedTerms;
  const completenessBonus = matchedTerms / queryTerms.length;
  
  return Math.min(0.95, averageScore * (0.7 + 0.3 * completenessBonus));
}

/**
 * Generate fuzzy search patterns for a query
 */
export function generateFuzzyPatterns(query: string): string[] {
  const patterns: string[] = [query]; // Start with original query
  const normalized = normalizeTitle(query);
  
  if (normalized !== query.toLowerCase()) {
    patterns.push(normalized);
  }
  
  const terms = extractKeyTerms(query);
  
  // Add individual terms for broader matching
  terms.forEach(term => {
    if (term.length >= 3) {
      patterns.push(term);
    }
  });
  
  // Add common variations for specific series
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('mario')) {
    patterns.push(
      'super mario', 'new super mario', 'mario bros', 
      'super mario bros', 'super mario world', 'mario kart',
      'paper mario', 'mario party', 'mario rpg'
    );
  }
  
  if (lowerQuery.includes('mega man') || lowerQuery.includes('megaman')) {
    patterns.push(
      'mega man', 'megaman', 'rockman', 
      'mega man x', 'megaman x', 'mega man zero', 'mega man legends'
    );
  }
  
  if (lowerQuery.includes('baldur')) {
    patterns.push(
      'baldurs gate', 'baldur\'s gate', 'baldurs gate dark alliance',
      'baldur\'s gate dark alliance', 'baldurs gate 3', 'bg3'
    );
  }
  
  if (lowerQuery.includes('zelda')) {
    patterns.push(
      'legend of zelda', 'zelda', 'ocarina of time', 'majora\'s mask',
      'wind waker', 'twilight princess', 'breath of the wild', 'tears of the kingdom'
    );
  }
  
  if (lowerQuery.includes('final fantasy')) {
    patterns.push(
      'final fantasy', 'ff', 'final fantasy vii', 'final fantasy x',
      'final fantasy tactics', 'final fantasy crystal'
    );
  }
  
  // Remove duplicates and empty patterns
  return Array.from(new Set(patterns.filter(p => p.trim().length > 0)));
}

/**
 * Rank search results using fuzzy matching
 */
export function rankByFuzzyMatch(games: any[], query: string): any[] {
  if (!query.trim()) return games;
  
  const gamesWithScores = games.map(game => ({
    game,
    fuzzyScore: fuzzyMatchScore(query, game.name),
    alternativeScore: game.alternative_names 
      ? Math.max(...game.alternative_names.map((alt: any) => fuzzyMatchScore(query, alt.name || '')))
      : 0
  }));
  
  // Sort by best fuzzy score (either main name or alternative name)
  return gamesWithScores
    .map(item => ({
      ...item.game,
      _fuzzyScore: Math.max(item.fuzzyScore, item.alternativeScore)
    }))
    .sort((a, b) => (b._fuzzyScore || 0) - (a._fuzzyScore || 0));
}