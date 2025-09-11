// IGDB API Service with Enhanced Iconic Game Support
import { filterProtectedContent, getFilterStats } from '../utils/contentProtectionFilter';
import { sortGamesByPriority, calculateGamePriority } from '../utils/gamePrioritization';
import { generateFuzzyPatterns, rankByFuzzyMatch, fuzzyMatchScore } from '../utils/fuzzySearch';
import { 
  detectFranchiseSearch, 
  generateFlagshipSearchPatterns,
  getFlagshipGames 
} from '../utils/flagshipGames';
import { 
  applyIconicBoost,
  calculateIconicScore 
} from '../utils/iconicGameDetection';
import { 
  calculateGameQuality,
  prioritizeOriginalVersions,
  sortByGameQuality 
} from '../utils/gameQualityScoring';

// Define the transformed game type
interface TransformedGame {
  id: number;
  igdb_id: number;
  name: string;
  summary?: string;
  description?: string;
  first_release_date?: Date;
  release_date?: string;
  rating?: number;
  igdb_rating?: number;
  category?: number;
  cover?: { id: number; url: string };
  cover_url?: string;
  screenshots?: string[];
  genres: string[];
  genre?: string;
  platforms: string[];
  developer?: string;
  publisher?: string;
  alternative_names: string[];
  collection?: string;
  franchise?: string;
  franchises: string[];
  dlcs: number[];
  expansions: number[];
  similar_games: number[];
}

/**
 * Calculate relevance score for search results with fuzzy matching
 * Prevents unrelated games from appearing while allowing for title variations
 */
function calculateSearchRelevance(game: IGDBGame | TransformedGame, searchQuery: string): number {
  if (!searchQuery || !searchQuery.trim()) return 1;

  const query = searchQuery.toLowerCase().trim();
  const gameName = (game.name || '').toLowerCase();
  const developer = ((game as any).developer || '').toLowerCase();
  const publisher = ((game as any).publisher || '').toLowerCase();
  const summary = (game.summary || '').toLowerCase();
  const genres = Array.isArray(game.genres) ? game.genres.join(' ').toLowerCase() : '';

  let relevanceScore = 0;
  let maxPossibleScore = 0;

  // Fuzzy name match (highest relevance) - enhanced with fuzzy matching
  maxPossibleScore += 100;
  const fuzzyScore = fuzzyMatchScore(query, game.name || '');
  if (fuzzyScore > 0.8) {
    // High fuzzy match
    relevanceScore += 100 * fuzzyScore;
  } else if (gameName === query) {
    relevanceScore += 100;
  } else if (gameName.includes(query) || query.includes(gameName)) {
    // Calculate how much of the name matches
    const matchRatio = Math.min(query.length, gameName.length) / Math.max(query.length, gameName.length);
    relevanceScore += 100 * matchRatio;
  } else if (fuzzyScore > 0.3) {
    // Lower fuzzy match still gets some points
    relevanceScore += 100 * fuzzyScore * 0.7;
  }

  // Alternative names fuzzy matching (high relevance)
  maxPossibleScore += 80;
  if (game.alternative_names && Array.isArray(game.alternative_names)) {
    let bestAltScore = 0;
    for (const altName of game.alternative_names) {
      const altFuzzyScore = fuzzyMatchScore(query, altName.name || '');
      bestAltScore = Math.max(bestAltScore, altFuzzyScore);
    }
    if (bestAltScore > 0.3) {
      relevanceScore += 80 * bestAltScore;
    }
  }

  // Query words in name (very high relevance) - enhanced for variations
  maxPossibleScore += 60;
  const queryWords = query.split(/\s+/);
  const nameWords = gameName.split(/\s+/);
  let nameWordMatches = 0;
  queryWords.forEach(queryWord => {
    if (nameWords.some(nameWord => {
      // Exact match
      if (nameWord.includes(queryWord) || queryWord.includes(nameWord)) return true;
      // Fuzzy match for individual words
      return fuzzyMatchScore(queryWord, nameWord) > 0.6;
    })) {
      nameWordMatches++;
    }
  });
  if (queryWords.length > 0) {
    relevanceScore += 60 * (nameWordMatches / queryWords.length);
  }

  // Developer/Publisher match (medium relevance)
  maxPossibleScore += 30;
  queryWords.forEach(queryWord => {
    if (developer.includes(queryWord) || publisher.includes(queryWord)) {
      relevanceScore += 30 / queryWords.length;
    }
  });

  // Summary/Description match (lower relevance)
  maxPossibleScore += 20;
  queryWords.forEach(queryWord => {
    if (summary.includes(queryWord)) {
      relevanceScore += 20 / queryWords.length;
    }
  });

  // Genre match (lowest relevance)
  maxPossibleScore += 10;
  queryWords.forEach(queryWord => {
    if (genres.includes(queryWord)) {
      relevanceScore += 10 / queryWords.length;
    }
  });

  // Calculate final relevance as percentage
  const finalRelevance = maxPossibleScore > 0 ? (relevanceScore / maxPossibleScore) : 0;
  
  return finalRelevance;
}

/**
 * Get dynamic relevance threshold based on search context
 */
function getRelevanceThreshold(searchQuery: string): number {
  const franchise = detectFranchiseSearch(searchQuery);
  
  // Lower threshold for franchise searches (more permissive for iconic games)
  if (franchise) {
    console.log(`🎯 Franchise search detected: "${franchise}" - Using lower relevance threshold`);
    return 0.08; // More permissive for franchise searches
  }
  
  // Standard threshold for general searches
  return 0.12;
}

/**
 * Filter out games with insufficient search relevance (with dynamic thresholds)
 */
function filterByRelevance(games: (IGDBGame | TransformedGame)[], searchQuery?: string): (IGDBGame | TransformedGame)[] {
  if (!searchQuery || !searchQuery.trim()) {
    return games;
  }

  const threshold = getRelevanceThreshold(searchQuery);
  
  return games.filter(game => {
    const relevance = calculateSearchRelevance(game, searchQuery);
    
    // Apply dynamic threshold
    if (relevance < threshold) {
      console.log(`🚫 FILTERED: "${game.name}" - relevance ${relevance.toFixed(3)} below threshold ${threshold.toFixed(3)}`);
      return false;
    }
    
    return true;
  });
}

/**
 * Filter out season games (IGDB category 7)
 * Seasons are episodic content that doesn't represent complete games
 */
function filterSeasonGames(games: (IGDBGame | TransformedGame)[]): (IGDBGame | TransformedGame)[] {
  return games.filter(game => {
    if (game.category === 7) {
      console.log(`🚫 SEASON FILTERED: "${game.name}" - category 7 (Season)`);
      return false;
    }
    return true;
  });
}

/**
 * Filter out pack/bundle games (IGDB category 3)
 * Packs/bundles are collections of games, not individual games
 */
function filterPackGames(games: (IGDBGame | TransformedGame)[]): (IGDBGame | TransformedGame)[] {
  return games.filter(game => {
    if (game.category === 3) {
      // Only filter actual bundles/collections, not regular editions
      const name = game.name?.toLowerCase() || '';
      
      // Allow regular editions through even if they're categorized as bundle
      const isRegularEdition = !name.includes('collector') && 
                               !name.includes('bundle') && 
                               !name.includes('collection') &&
                               !name.includes('anthology') &&
                               !name.includes('compilation') &&
                               !name.includes('all-stars') &&
                               !name.includes('complete edition') &&
                               !name.includes('ultimate edition') &&
                               !name.includes('definitive edition');
      
      if (isRegularEdition) {
        console.log(`✅ PACK ALLOWED: "${game.name}" - regular edition despite category 3`);
        return true; // Keep regular editions
      }
      
      console.log(`🚫 PACK FILTERED: "${game.name}" - actual bundle/collection`);
      return false; // Filter actual bundles
    }
    return true;
  });
}

/**
 * Filter out e-reader card content (simplified)
 * Only catches the most obvious e-reader patterns
 */
function filterEReaderContent(games: (IGDBGame | TransformedGame)[]): (IGDBGame | TransformedGame)[] {
  return games.filter(game => {
    if (!game.name) return true;
    
    // Only primary e-reader pattern - let IGDB categories handle the rest
    if (/-e\s*-\s*.+/i.test(game.name)) {
      console.log(`🚫 E-READER FILTERED: "${game.name}" - e-reader card pattern`);
      return false;
    }
    
    return true;
  });
}

/**
 * Enhanced sequel and series detection for search suggestions
 */
async function findSequelsAndSeries(baseQuery: string, primaryResults: IGDBGame[]): Promise<IGDBGame[]> {
  try {
    // Extract franchise information from primary results
    const franchiseIds = new Set<number>();
    const franchiseNames = new Set<string>();
    
    primaryResults.forEach(game => {
      if (game.franchises) {
        game.franchises.forEach(franchise => {
          franchiseIds.add(franchise.id);
          franchiseNames.add(franchise.name.toLowerCase());
        });
      }
    });

    // Enhanced fuzzy patterns to search for more comprehensive results
    const fuzzyPatterns = generateFuzzyPatterns(baseQuery);
    const sequelPatterns = generateSequelPatterns(baseQuery);
    const allPatterns = [...new Set([...fuzzyPatterns, ...sequelPatterns])];
    console.log(`🔍 Looking for games with ${allPatterns.length} patterns:`, allPatterns.slice(0, 5));

    // Search for sequels using multiple approaches
    const sequelSearches: Promise<IGDBGame[]>[] = [];

    const endpoint = '/.netlify/functions/igdb-search'; // Use static endpoint
    
    // 1. Search using top patterns only (reduced API calls)
    for (const pattern of allPatterns.slice(0, 5)) { // Reduced from 12 to 5
      sequelSearches.push(
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ searchTerm: pattern, limit: 5 })
        })
        .then(res => res.json())
        .then(data => data.success ? data.games || [] : [])
        .catch(() => [])
      );
    }

    // 2. If we have franchise info, search by franchise
    if (franchiseIds.size > 0) {
      const franchiseQuery = Array.from(franchiseNames).join(' ');
      sequelSearches.push(
        fetch(endpoint, {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ searchTerm: franchiseQuery, limit: 10 })
        })
        .then(res => res.json())
        .then(data => data.success ? data.games || [] : [])
        .catch(() => [])
      );
    }

    // Execute all searches in parallel
    const allSequelResults = await Promise.all(sequelSearches);
    const flatSequels = allSequelResults.flat();

    // First deduplicate within sequel results (multiple patterns might find same game)
    const deduplicatedSequels = deduplicateGames(flatSequels);
    console.log(`🔧 Sequel deduplication: ${flatSequels.length} → ${deduplicatedSequels.length} sequels (removed ${flatSequels.length - deduplicatedSequels.length} duplicates)`);

    // Filter out games already in primary results and check relevance
    const existingIds = new Set(primaryResults.map(g => g.id));
    const uniqueSequels = deduplicatedSequels.filter(game => 
      !existingIds.has(game.id) && 
      isRelevantSequel(game, baseQuery, franchiseNames)
    );

    // Apply content protection filtering to sequels FIRST
    const transformedSequels = uniqueSequels.map(game => ({
      id: game.id,
      name: game.name,
      allNames: [game.name, ...(game.alternative_names?.map(alt => alt.name) || [])].filter(Boolean),
      developer: game.involved_companies?.[0]?.company?.name,
      publisher: game.involved_companies?.[0]?.company?.name,
      summary: game.summary,
      description: game.summary,
      category: game.category,
      genres: game.genres?.map(g => g.name) || [],
      franchise: game.franchise?.name,
      collection: game.collection?.name,
    }));
    const protectedSequels = filterProtectedContent(transformedSequels);
    const protectedSequelGames = protectedSequels.map(game => uniqueSequels.find(raw => raw.id === game.id)!);
    
    // Apply season filtering to sequels
    const seasonFilteredSequels = filterSeasonGames(protectedSequelGames);
    
    // Apply pack filtering to sequels
    const packFilteredSequels = filterPackGames(seasonFilteredSequels);
    
    // Apply e-reader filtering to sequels
    const eReaderFilteredSequels = filterEReaderContent(packFilteredSequels);
    
    // Apply relevance filtering to sequels too
    const relevantSequels = filterByRelevance(eReaderFilteredSequels, baseQuery);
    
    console.log(`🎯 Found ${relevantSequels.length} relevant sequels for "${baseQuery}"`);
    return relevantSequels;

  } catch (error) {
    console.error('Error finding sequels:', error);
    return [];
  }
}

/**
 * Generate sequel search patterns for a base query
 */
function generateSequelPatterns(baseQuery: string): string[] {
  const patterns: string[] = [];
  const query = baseQuery.toLowerCase().trim();

  // Numbers 1-10 for numbered sequels
  for (let i = 1; i <= 10; i++) {
    patterns.push(`${query} ${i}`);
    patterns.push(`${query} ${toRomanNumeral(i)}`);
  }

  // Common sequel naming patterns
  const sequelWords = [
    'world', 'bros', 'super', 'mega', 'ultra', 'x', 'zero', 
    'advanced', 'dx', 'collection', 'legacy', 'anniversary',
    'remastered', 'remake', 'hd', 'deluxe', 'special'
  ];

  sequelWords.forEach(word => {
    patterns.push(`${query} ${word}`);
    patterns.push(`${word} ${query}`);
    patterns.push(`super ${query}`);
  });

  // Special patterns for common series
  if (query.includes('mario')) {
    patterns.push('super mario world', 'super mario bros', 'new super mario bros');
  }
  
  if (query.includes('mega man') || query.includes('megaman')) {
    patterns.push('mega man x', 'megaman x', 'rockman', 'mega man zero');
  }

  if (query.includes('zelda')) {
    patterns.push('legend of zelda', 'ocarina of time', 'breath of the wild', 'tears of the kingdom');
  }

  return patterns;
}

/**
 * Convert number to Roman numeral
 */
function toRomanNumeral(num: number): string {
  const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return romanNumerals[num] || num.toString();
}

/**
 * Check if a game is a relevant sequel to the base query
 */
function isRelevantSequel(game: IGDBGame, baseQuery: string, franchiseNames: Set<string>): boolean {
  const gameName = game.name.toLowerCase();
  const query = baseQuery.toLowerCase();

  // Check if game belongs to same franchise
  if (game.franchises) {
    const gameHasFranchise = game.franchises.some(franchise => 
      franchiseNames.has(franchise.name.toLowerCase())
    );
    if (gameHasFranchise) return true;
  }

  // Check for common sequel indicators
  const sequelIndicators = [
    /\d+/,  // Contains numbers
    /\b(ii|iii|iv|v|vi|vii|viii|ix|x)\b/i,  // Roman numerals
    /\b(world|bros|super|mega|ultra|zero|x)\b/i,  // Common sequel words
    /\b(collection|legacy|remastered|hd|dx)\b/i  // Compilation indicators
  ];

  // Game should contain base query terms and sequel indicators
  const queryWords = query.split(/\s+/);
  const hasQueryWord = queryWords.some(word => gameName.includes(word));
  const hasSequelIndicator = sequelIndicators.some(pattern => pattern.test(gameName));

  return hasQueryWord && hasSequelIndicator;
}

/**
 * Deduplicate games array by ID, preserving first occurrence and priority
 */
function deduplicateGames(games: IGDBGame[]): IGDBGame[] {
  const seenIds = new Set<number>();
  const uniqueGames: IGDBGame[] = [];

  for (const game of games) {
    if (!seenIds.has(game.id)) {
      seenIds.add(game.id);
      uniqueGames.push(game);
    }
  }

  return uniqueGames;
}

interface IGDBGame {
  id: number;
  name: string;
  summary?: string;
  storyline?: string;
  first_release_date?: number;
  rating?: number;
  category?: number;
  cover?: {
    id: number;
    url: string;
  };
  screenshots?: Array<{
    id: number;
    url: string;
  }>;
  genres?: Array<{
    id: number;
    name: string;
  }>;
  platforms?: Array<{
    id: number;
    name: string;
  }>;
  involved_companies?: Array<{
    company: {
      name: string;
    };
    developer?: boolean;
    publisher?: boolean;
  }>;
  alternative_names?: Array<{
    id: number;
    name: string;
  }>;
  collection?: {
    id: number;
    name: string;
  };
  franchise?: {
    id: number;
    name: string;
  };
  franchises?: Array<{
    id: number;
    name: string;
  }>;
  dlcs?: number[];
  expansions?: number[];
  similar_games?: number[];
}

interface IGDBSearchResponse {
  games: IGDBGame[];
  success: boolean;
  error?: string;
}

class IGDBService {
  private readonly endpoint = '/.netlify/functions/igdb-search';

  /**
   * Multi-strategy search with iconic game fallback
   * If primary search yields insufficient results, searches for flagship games
   */
  private async searchWithFlagshipFallback(query: string, limit: number): Promise<IGDBGame[]> {
    // Step 1: Primary search
    const primaryResults = await this.performBasicSearch(query, limit);
    
    // Step 2: Check if we need flagship fallback
    const franchise = detectFranchiseSearch(query);
    const needsFallback = primaryResults.length < Math.min(3, limit) && franchise;
    
    if (!needsFallback) {
      console.log(`🎯 Primary search sufficient: ${primaryResults.length} results`);
      return primaryResults;
    }
    
    console.log(`🚀 Applying flagship fallback for "${franchise}" - Primary results: ${primaryResults.length}`);
    
    // Step 3: Search for flagship games in the franchise
    const flagshipPatterns = generateFlagshipSearchPatterns(franchise);
    const flagshipSearches: Promise<IGDBGame[]>[] = [];
    
    // Search for each flagship pattern
    for (const pattern of flagshipPatterns.slice(0, 8)) { // Limit patterns to avoid too many requests
      flagshipSearches.push(
        this.performBasicSearch(pattern, 3)
          .catch(error => {
            console.log(`⚠️ Flagship search failed for "${pattern}":`, error);
            return [];
          })
      );
    }
    
    // Execute flagship searches in parallel
    const flagshipResults = await Promise.all(flagshipSearches);
    const flatFlagshipResults = flagshipResults.flat();
    
    // Combine and deduplicate results
    const existingIds = new Set(primaryResults.map(g => g.id));
    const uniqueFlagshipResults = flatFlagshipResults.filter(game => !existingIds.has(game.id));
    
    const combinedResults = [...primaryResults, ...uniqueFlagshipResults];
    
    console.log(`✅ Flagship fallback complete: ${primaryResults.length} primary + ${uniqueFlagshipResults.length} flagship = ${combinedResults.length} total`);
    
    return combinedResults.slice(0, limit);
  }
  
  /**
   * Perform basic IGDB search without fallback logic
   */
  private async performBasicSearch(query: string, limit: number): Promise<IGDBGame[]> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm: query.trim(),
          limit: limit
        })
      });

      if (!response.ok) {
        // Production-visible error logging
        console.error(`🔴 IGDB API Error ${response.status}: ${response.statusText}`);
        console.error(`🔴 Query that failed: "${query}"`);
        
        if (response.status === 500) {
          console.error('🔴 IGDB Server Error (500) - The IGDB API is temporarily unavailable');
          // Return empty array instead of throwing to allow graceful degradation
          return [];
        }
        
        throw new Error(`IGDB API error: ${response.status}`);
      }

      const data: IGDBSearchResponse = await response.json();
      
      if (!data.success) {
        console.error('🔴 IGDB API returned unsuccessful response:', data.error);
        throw new Error(data.error || 'IGDB API error');
      }

      return data.games || [];
    } catch (error: any) {
      // Production-visible error logging
      console.error('🔴 IGDB performBasicSearch error:', {
        query,
        error: error?.message || error,
        stack: error?.stack
      });
      
      // Re-throw to allow calling code to handle
      throw error;
    }
  }

  async searchGames(query: string, limit: number = 20): Promise<IGDBGame[]> {
    try {
      if (!query.trim()) {
        return [];
      }

      console.error('🔍 Enhanced multi-strategy search for:', query);

      // Get primary search results
      const rawGames = await this.performBasicSearch(query, limit);
      console.log('✅ Primary search results:', rawGames.length, 'games found');
      
      // Debug: Check if Breath of the Wild is in raw results
      if (query.toLowerCase().includes('zelda')) {
        const botwInRaw = rawGames.find(g => g.name?.toLowerCase().includes('breath of the wild') && !g.name?.toLowerCase().includes('bundle'));
        if (botwInRaw) {
          console.log('🎮 BotW found in raw results:', botwInRaw.name, 'ID:', botwInRaw.id, 'Category:', botwInRaw.category);
        } else {
          console.log('❌ BotW NOT found in raw IGDB results');
        }
      }
      
      // Apply content protection filter
      const transformedGames = rawGames.map(game => ({
        id: game.id,
        name: game.name,
        allNames: [game.name, ...(game.alternative_names?.map(alt => alt.name) || [])].filter(Boolean),
        developer: game.involved_companies?.[0]?.company?.name,
        publisher: game.involved_companies?.[0]?.company?.name,
        summary: game.summary,
        description: game.summary,
        category: game.category,
        genres: game.genres?.map(g => g.name) || [],
        franchise: game.franchise?.name,
        collection: game.collection?.name,
      }));
      
      // Debug: Log some raw games to see what we're getting from IGDB
      if (query.toLowerCase().includes('final fantasy')) {
        console.log('🔍 Final Fantasy search - Raw IGDB results:', rawGames.slice(0, 3));
        console.log('🔍 Final Fantasy search - Transformed games:', transformedGames.slice(0, 3));
      }
      
      if (query.toLowerCase().includes('mega man') || query.toLowerCase().includes('megaman')) {
        console.log('🔍 Mega Man search - Raw IGDB results:', rawGames.slice(0, 3));
        console.log('🔍 Mega Man search - Transformed games:', transformedGames.slice(0, 3));
      }
      
      const filteredGames = filterProtectedContent(transformedGames);
      
      // Log filter statistics for debugging
      const filterStats = getFilterStats(transformedGames);
      if (filterStats.filtered > 0) {
        console.log('🛡️ Content protection filter:', filterStats);
        
        // Extra debug for Final Fantasy
        if (query.toLowerCase().includes('final fantasy')) {
          console.log('🔍 Final Fantasy search - Filter stats:', filterStats);
          console.log('🔍 Final Fantasy search - Examples filtered:', filterStats.examples);
        }
        
        // Extra debug for Mega Man
        if (query.toLowerCase().includes('mega man') || query.toLowerCase().includes('megaman')) {
          console.log('🔍 Mega Man search - Filter stats:', filterStats);
          console.log('🔍 Mega Man search - Examples filtered:', filterStats.examples);
        }
      }
      
      // Convert back to IGDB format
      let filteredIGDBGames = filteredGames.map(game => rawGames.find(raw => raw.id === game.id)!);
      
      // Debug: Check BotW after content filter
      if (query.toLowerCase().includes('zelda')) {
        const botwAfterContent = filteredIGDBGames.find(g => g.name?.toLowerCase().includes('breath of the wild') && !g.name?.toLowerCase().includes('bundle'));
        if (botwAfterContent) {
          console.log('✅ BotW survived content filter');
        } else {
          console.log('❌ BotW removed by content filter');
        }
      }
      
      // Apply season filtering to remove seasonal content
      console.log(`🎮 Pre-season filter: ${filteredIGDBGames.length} games`);
      filteredIGDBGames = filterSeasonGames(filteredIGDBGames);
      console.log(`🎮 Post-season filter: ${filteredIGDBGames.length} games`);
      
      // Apply pack filtering to remove bundle/pack games
      console.log(`📦 Pre-pack filter: ${filteredIGDBGames.length} games`);
      filteredIGDBGames = filterPackGames(filteredIGDBGames);
      console.log(`📦 Post-pack filter: ${filteredIGDBGames.length} games`);
      
      // Apply e-reader filtering to remove micro-content
      console.log(`📱 Pre-e-reader filter: ${filteredIGDBGames.length} games`);
      filteredIGDBGames = filterEReaderContent(filteredIGDBGames);
      console.log(`📱 Post-e-reader filter: ${filteredIGDBGames.length} games`);
      
      // Apply strict relevance filtering to prevent unrelated games
      console.log(`🎯 Pre-relevance filter: ${filteredIGDBGames.length} games`);
      filteredIGDBGames = filterByRelevance(filteredIGDBGames, query);
      console.log(`🎯 Post-relevance filter: ${filteredIGDBGames.length} games`);
      
      // Debug: Check BotW after relevance filter
      if (query.toLowerCase().includes('zelda')) {
        const botwAfterRelevance = filteredIGDBGames.find(g => g.name?.toLowerCase().includes('breath of the wild') && !g.name?.toLowerCase().includes('bundle'));
        if (botwAfterRelevance) {
          console.log('✅ BotW survived relevance filter');
        } else {
          console.log('❌ BotW removed by relevance filter or not in results');
        }
      }
      
      // Check if we need flagship fallback after all filtering
      const franchise = detectFranchiseSearch(query);
      
      // Enhanced flagship fallback logic - check quality of results, not just quantity
      let needsFlagshipFallback = false;
      if (franchise) {
        // Always do flagship fallback for major franchise searches if results are low quality
        const hasMainGameResults = filteredIGDBGames.some(game => 
          game.category === 0 && // MainGame
          !game.name.toLowerCase().includes('olympic') && // Not Olympic games
          !game.name.toLowerCase().includes('party') // Not party games (unless specifically Mario Party search)
        );
        
        // Trigger fallback if we have < 3 main quality games for the franchise
        const qualityGameCount = filteredIGDBGames.filter(game => 
          game.category === 0 && 
          !game.name.toLowerCase().includes('olympic') &&
          (!game.name.toLowerCase().includes('party') || query.toLowerCase().includes('party'))
        ).length;
        
        needsFlagshipFallback = qualityGameCount < 3 || 
                               (filteredIGDBGames.length < Math.min(5, limit) && !hasMainGameResults);
        
        console.log(`🎯 Flagship analysis for "${franchise}":`, {
          totalResults: filteredIGDBGames.length,
          qualityGameCount,
          hasMainGameResults,
          needsFallback: needsFlagshipFallback
        });
      }
      
      if (needsFlagshipFallback) {
        console.log(`🚀 Triggering flagship fallback for "${franchise}" - Current results: ${filteredIGDBGames.length}`);
        
        // Search for flagship games
        const flagshipPatterns = generateFlagshipSearchPatterns(franchise);
        const flagshipSearches: Promise<IGDBGame[]>[] = [];
        
        // Reduced API calls: Search for top 3 flagship patterns only
        for (const pattern of flagshipPatterns.slice(0, 3)) {
          flagshipSearches.push(
            this.performBasicSearch(pattern, 5)
              .catch(error => {
                console.log(`⚠️ Flagship search failed for "${pattern}":`, error);
                return [];
              })
          );
        }
        
        const flagshipResults = await Promise.all(flagshipSearches);
        const allFlagshipResults = flagshipResults.flat();
        
        // Apply same filtering to flagship results
        const transformedFlagshipGames = allFlagshipResults.map(game => ({
          id: game.id,
          name: game.name,
          allNames: [game.name, ...(game.alternative_names?.map(alt => alt.name) || [])].filter(Boolean),
          developer: game.involved_companies?.[0]?.company?.name,
          publisher: game.involved_companies?.[0]?.company?.name,
          summary: game.summary,
          description: game.summary,
          category: game.category,
          genres: game.genres?.map(g => g.name) || [],
          franchise: game.franchise?.name,
          collection: game.collection?.name,
        }));
        const filteredFlagshipGames = filterProtectedContent(transformedFlagshipGames);
        let finalFlagshipGames = filteredFlagshipGames.map(game => allFlagshipResults.find(raw => raw.id === game.id)!);
        
        // Apply same additional filtering
        finalFlagshipGames = filterSeasonGames(finalFlagshipGames);
        finalFlagshipGames = filterPackGames(finalFlagshipGames);
        finalFlagshipGames = filterEReaderContent(finalFlagshipGames);
        finalFlagshipGames = filterByRelevance(finalFlagshipGames, query);
        
        // Combine with existing results, flagship first
        const existingIds = new Set(filteredIGDBGames.map(g => g.id));
        const uniqueFlagshipGames = finalFlagshipGames.filter(game => !existingIds.has(game.id));
        
        console.log(`🎯 Flagship fallback found ${uniqueFlagshipGames.length} additional games`);
        filteredIGDBGames = [...uniqueFlagshipGames, ...filteredIGDBGames];
      }
      
      // Apply fuzzy ranking before prioritization for better title matching
      if (filteredIGDBGames.length > 1) {
        console.log(`🔧 Applying fuzzy ranking to improve title matching...`);
        filteredIGDBGames = rankByFuzzyMatch(filteredIGDBGames, query);
      }
      
      // Apply iconic boost before prioritization
      console.log(`🎯 Applying iconic game boost...`);
      filteredIGDBGames = applyIconicBoost(filteredIGDBGames, query);
      
      // Apply quality-based original version prioritization
      console.log(`🎯 Pre-quality sorting: ${filteredIGDBGames.length} games`);
      filteredIGDBGames = prioritizeOriginalVersions(filteredIGDBGames);
      filteredIGDBGames = sortByGameQuality(filteredIGDBGames, query);
      console.log(`🎯 Post-quality sorting: ${filteredIGDBGames.length} games`);
      
      // Apply game type scoring for franchise relevance
      console.log(`🎮 Applying game type scoring for franchise relevance...`);
      const { applyGameTypeBoost, applyOlympicPartyPenalty } = await import('../utils/gameTypeScoring');
      filteredIGDBGames = applyGameTypeBoost(filteredIGDBGames, query);
      filteredIGDBGames = applyOlympicPartyPenalty(filteredIGDBGames, query);
      
      // Apply platform priority and age scoring
      console.log(`🎮 Applying platform priority and age scoring...`);
      const { applyAdvancedPlatformBoosts } = await import('../utils/platformPriority');
      filteredIGDBGames = applyAdvancedPlatformBoosts(filteredIGDBGames, query);
      
      // Apply quality metrics (rating, popularity, significance)
      console.log(`⭐ Applying quality metrics scoring...`);
      const { applyQualityMetrics } = await import('../utils/qualityMetrics');
      filteredIGDBGames = applyQualityMetrics(filteredIGDBGames, query);
      
      // Apply intelligent prioritization system (6-tier: Flagship → Famous → Sequels → Main → DLC → Community)
      if (filteredIGDBGames.length > 1) {
        console.log(`🏆 Applying 6-tier prioritization system...`);
        
        // Convert IGDBGame to format expected by prioritization system
        const gamesForPrioritization = filteredIGDBGames.map(game => ({
          ...game,
          genres: game.genres?.map(g => g.name) || [],
          developer: game.involved_companies?.find(c => c.company)?.company?.name,
          publisher: game.involved_companies?.find(c => c.company)?.company?.name,
          igdb_rating: game.rating
        }));
        
        const sortedGames = sortGamesByPriority(gamesForPrioritization as any);
        filteredIGDBGames = sortedGames.map(sortedGame => {
          // Find the original IGDBGame and preserve its structure
          const originalGame = filteredIGDBGames.find(og => og.id === sortedGame.id);
          return originalGame ? { ...originalGame, ...(sortedGame as any) } : sortedGame;
        }) as any;
        
        // Log priority analysis for first few games
        filteredIGDBGames.slice(0, 5).forEach((game, index) => {
          const gameForPriority = {
            ...game,
            genres: game.genres?.map(g => g.name) || [],
            developer: game.involved_companies?.find(c => c.company)?.company?.name,
            publisher: game.involved_companies?.find(c => c.company)?.company?.name,
            igdb_rating: game.rating
          };
          const priority = calculateGamePriority(gameForPriority as any);
          const fuzzyScore = (game as any)._fuzzyScore;
          const iconicBoost = (game as any)._iconicBoost;
          const isFlagship = (game as any)._isFlagship;
          
          let details = `Priority: ${priority.score}`;
          if (fuzzyScore) details += `, Fuzzy: ${fuzzyScore.toFixed(2)}`;
          if (iconicBoost) details += `, Iconic: +${Math.round(iconicBoost)}`;
          if (isFlagship) details += ` 🏆`;
          
          console.log(`${index + 1}. "${game.name}" - ${details} - ${priority.reasons[0] || 'Standard'}`);
        });
      }
      
      // Fetch related games (sequels, DLCs, expansions) if we have space in our results
      if (filteredIGDBGames.length < limit && filteredIGDBGames.length > 0) {
        try {
          const relatedGames = await this.fetchRelatedGames(filteredIGDBGames, limit - filteredIGDBGames.length);
          // Apply same filtering to related games
          const filteredRelatedGames = filterByRelevance(relatedGames, query);
          filteredIGDBGames = [...filteredIGDBGames, ...filteredRelatedGames];
        } catch (error) {
          console.log('⚠️ Failed to fetch related games:', error);
          // Continue with original results if related games fetch fails
        }
      }
      
      console.log(`✅ Final results: ${filteredIGDBGames.length} games after all filtering and prioritization`);
      return filteredIGDBGames;

    } catch (error: any) {
      // Production-visible error logging
      console.error('🔴 IGDB searchGames failed:', {
        query,
        error: error?.message || error,
        status: error?.status
      });
      
      // If it's a 500 error, return empty array to allow graceful fallback
      if (error?.message?.includes('500') || error?.status === 500) {
        console.error('🔴 IGDB Server Error - Returning empty results for graceful degradation');
        return [];
      }
      
      // For other errors, still throw to maintain existing behavior
      throw error;
    }
  }

  /**
   * Enhanced search with sequel and series detection for top search bar
   */
  async searchWithSequels(query: string, limit: number = 8): Promise<IGDBGame[]> {
    try {
      if (!query.trim()) {
        return [];
      }

      console.log('🎯 Enhanced search with sequels for:', query);

      // First, get primary search results
      const primaryResults = await this.searchGames(query, Math.ceil(limit / 2));
      
      if (primaryResults.length === 0) {
        return [];
      }

      // Find sequels and related games
      const sequelResults = await findSequelsAndSeries(query, primaryResults);
      
      // Combine results: primary first, then sequels
      const combinedResults = [...primaryResults, ...sequelResults];
      
      // Deduplicate by game ID to prevent duplicates (e.g., same game found through multiple patterns)
      const uniqueResults = deduplicateGames(combinedResults);
      console.log(`🔧 Deduplication: ${combinedResults.length} → ${uniqueResults.length} games (removed ${combinedResults.length - uniqueResults.length} duplicates)`);
      
      // Apply fuzzy ranking to improve title matching for combined results
      console.log(`🔧 Applying fuzzy ranking to combined results...`);
      const fuzzyRankedResults = rankByFuzzyMatch(uniqueResults, query);
      
      // Apply game type scoring for franchise relevance in enhanced search
      console.log(`🎮 Applying game type scoring for franchise relevance...`);
      const { applyGameTypeBoost, applyOlympicPartyPenalty } = await import('../utils/gameTypeScoring');
      let typeScoreResults = applyGameTypeBoost(fuzzyRankedResults, query);
      typeScoreResults = applyOlympicPartyPenalty(typeScoreResults, query);
      
      // Apply platform priority and age scoring in enhanced search
      console.log(`🎮 Applying platform priority and age scoring...`);
      const { applyAdvancedPlatformBoosts } = await import('../utils/platformPriority');
      typeScoreResults = applyAdvancedPlatformBoosts(typeScoreResults, query);
      
      // Apply quality metrics (rating, popularity, significance) in enhanced search
      console.log(`⭐ Applying quality metrics scoring...`);
      const { applyQualityMetrics } = await import('../utils/qualityMetrics');
      typeScoreResults = applyQualityMetrics(typeScoreResults, query);
      
      // Apply final prioritization and limit
      const gamesForFinalPrioritization = typeScoreResults.map(game => ({
        ...game,
        genres: game.genres?.map(g => g.name) || [],
        developer: game.involved_companies?.find(c => c.company)?.company?.name,
        publisher: game.involved_companies?.find(c => c.company)?.company?.name,
        igdb_rating: game.rating
      }));
      
      const prioritizedGames = sortGamesByPriority(gamesForFinalPrioritization as any);
      const finalResults = prioritizedGames.slice(0, limit).map(prioritizedGame => {
        // Find the original IGDBGame and preserve its structure
        const originalGame = typeScoreResults.find(og => og.id === prioritizedGame.id);
        return originalGame || prioritizedGame;
      }) as IGDBGame[];
      
      console.log(`🎮 Enhanced search complete: ${finalResults.length} results (${primaryResults.length} primary + ${sequelResults.length} sequels)`);
      
      return finalResults;

    } catch (error) {
      console.error('Enhanced search failed, falling back to basic search:', error);
      // Fallback to basic search if enhanced search fails
      return this.searchGames(query, limit);
    }
  }

  async getGameById(gameId: number): Promise<IGDBGame | null> {
    try {
      console.log('🎮 Fetching IGDB game by ID:', gameId);

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'getById',
          gameId: gameId
        })
      });

      if (!response.ok) {
        console.error('IGDB API response not ok:', response.status, response.statusText);
        throw new Error(`IGDB API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        console.error('IGDB API returned error:', data.error);
        throw new Error(data.error || 'IGDB API error');
      }

      console.log('✅ IGDB game fetched:', data.games?.[0]?.name || 'Unknown');
      return data.games?.[0] || null;

    } catch (error) {
      console.error('IGDB game fetch failed:', error);
      throw error;
    }
  }

  // Fetch related games (sequels, DLCs, expansions, similar games)
  private async fetchRelatedGames(games: IGDBGame[], maxResults: number): Promise<IGDBGame[]> {
    try {
      // Collect all related game IDs
      const relatedIds = new Set<number>();
      
      games.forEach(game => {
        // Add DLC IDs
        game.dlcs?.forEach(id => relatedIds.add(id));
        
        // Add expansion IDs
        game.expansions?.forEach(id => relatedIds.add(id));
        
        // Add similar game IDs (limit to avoid too many results)
        game.similar_games?.slice(0, 3).forEach(id => relatedIds.add(id));
      });

      // Remove IDs of games we already have
      const existingIds = new Set(games.map(g => g.id));
      const idsToFetch = Array.from(relatedIds).filter(id => !existingIds.has(id));
      
      if (idsToFetch.length === 0) {
        return [];
      }
      
      console.log('🔗 Fetching related games:', idsToFetch.length, 'games');
      
      // Limit the number of IDs to fetch to avoid huge queries
      const limitedIds = idsToFetch.slice(0, Math.min(maxResults, 10));
      
      // Build a bulk request to get related games
      const bulkRequestBody = `fields name, summary, first_release_date, rating, category, cover.url, genres.name, platforms.name, involved_companies.company.name, alternative_names.name, collection.name, franchise.name, franchises.name, dlcs, expansions, similar_games; where id = (${limitedIds.join(',')});`;
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isBulkRequest: true,
          endpoint: 'games',
          requestBody: bulkRequestBody
        })
      });

      if (!response.ok) {
        throw new Error(`Related games fetch error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Related games fetch error');
      }

      const relatedGames = data.games || [];
      console.log('✅ Fetched related games:', relatedGames.length);
      
      // Apply content protection filter to related games
      const transformedRelated = relatedGames.map((game: IGDBGame) => ({
        id: game.id,
        name: game.name,
        allNames: [game.name, ...(game.alternative_names?.map(alt => alt.name) || [])].filter(Boolean),
        developer: game.involved_companies?.[0]?.company?.name,
        publisher: game.involved_companies?.[0]?.company?.name,
        summary: game.summary,
        description: game.summary,
        category: game.category,
        genres: game.genres?.map(g => g.name) || [],
        franchise: game.franchise?.name,
        collection: game.collection?.name,
      }));
      const filteredRelated = filterProtectedContent(transformedRelated);
      
      // Convert back to IGDB format
      let filteredIGDBRelated = filteredRelated
        .map(game => relatedGames.find((raw: IGDBGame) => raw.id === game.id)!);
      
      // Apply season filtering to related games
      filteredIGDBRelated = filterSeasonGames(filteredIGDBRelated);
      
      // Apply pack filtering to related games
      filteredIGDBRelated = filterPackGames(filteredIGDBRelated);
      
      // Apply e-reader filtering to related games
      filteredIGDBRelated = filterEReaderContent(filteredIGDBRelated);
      
      // Limit results
      filteredIGDBRelated = filteredIGDBRelated.slice(0, maxResults);
      
      return filteredIGDBRelated;

    } catch (error) {
      console.error('Failed to fetch related games:', error);
      return [];
    }
  }

  // Transform IGDB game for content filter (simplified format)
  private transformGameForFilter(igdbGame: IGDBGame): TransformedGame {
    // Include alternative names in the name for better filtering
    const allNames = [
      igdbGame.name,
      ...(igdbGame.alternative_names?.map(alt => alt.name) || [])
    ].filter(Boolean);
    
    return {
      id: igdbGame.id,
      name: igdbGame.name,
      allNames: allNames,
      developer: igdbGame.involved_companies?.[0]?.company?.name,
      publisher: igdbGame.involved_companies?.[0]?.company?.name,
      summary: igdbGame.summary,
      description: igdbGame.summary,
      category: igdbGame.category,
      genres: igdbGame.genres?.map(g => g.name) || [],
      franchise: igdbGame.franchise?.name,
      collection: igdbGame.collection?.name,
    };
  }

  // Transform IGDB game to our app's format
  transformGame(igdbGame: IGDBGame): TransformedGame {
    return {
      // DO NOT set 'id' to igdbGame.id - that's the database ID, not IGDB ID!
      // The 'id' field should only be set when the game exists in our database
      id: 0, // Set to 0 or undefined since this game might not be in our database yet
      igdb_id: igdbGame.id, // This is the actual IGDB ID
      name: igdbGame.name,
      summary: igdbGame.summary,
      description: igdbGame.storyline || igdbGame.summary, // Use storyline if available, otherwise summary
      first_release_date: igdbGame.first_release_date ? new Date(igdbGame.first_release_date * 1000) : undefined,
      release_date: igdbGame.first_release_date ? new Date(igdbGame.first_release_date * 1000).toISOString() : undefined,
      rating: igdbGame.rating,
      igdb_rating: igdbGame.rating,
      category: igdbGame.category,
      cover: igdbGame.cover,
      cover_url: igdbGame.cover?.url ? this.transformImageUrl(igdbGame.cover.url) : undefined,
      screenshots: igdbGame.screenshots?.map(s => this.transformImageUrl(s.url)) || [], // Add screenshots
      genres: igdbGame.genres?.map(g => g.name) || [],
      genre: igdbGame.genres?.[0]?.name,
      platforms: igdbGame.platforms?.map(p => p.name) || [],
      developer: igdbGame.involved_companies?.find(c => c.developer)?.company?.name, // Find developer specifically
      publisher: igdbGame.involved_companies?.find(c => c.publisher)?.company?.name, // Find publisher specifically
      // New fields for enhanced search
      alternative_names: igdbGame.alternative_names?.map(alt => alt.name) || [],
      collection: igdbGame.collection?.name,
      franchise: igdbGame.franchise?.name,
      franchises: igdbGame.franchises?.map(f => f.name) || [],
      dlcs: igdbGame.dlcs || [],
      expansions: igdbGame.expansions || [],
      similar_games: igdbGame.similar_games || [],
    };
  }

  // Transform IGDB image URL to higher quality
  private transformImageUrl(url: string): string {
    if (!url) return '';
    
    // IGDB URLs come as //images.igdb.com/igdb/image/upload/t_thumb/imageid.jpg
    // We want to change t_thumb to a higher quality size
    return url.replace('t_thumb', 't_cover_big').replace('//', 'https://');
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing IGDB API connection...');
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm: 'test',
          limit: 1
        })
      });

      const data = await response.json();
      console.log('🔗 IGDB API test response:', data);
      
      return response.ok && data.success;
    } catch (error) {
      console.error('❌ IGDB API test failed:', error);
      return false;
    }
  }
}

export const igdbService = new IGDBService();
export type { IGDBGame };