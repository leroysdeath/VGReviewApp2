import { supabase } from './supabase'
import { sortGamesByPriority, calculateGamePriority } from '../utils/gamePrioritization'
import { 
  generateSisterGameQueries, 
  applySisterGameBoost, 
  detectGameSeries 
} from '../utils/sisterGameDetection'

export interface SearchFilters {
  query?: string
  releaseDateStart?: Date
  releaseDateEnd?: Date
  platformIds?: number[]
  minRating?: number
  maxRating?: number
  minRatingCount?: number
  genres?: string[]
  orderBy?: 'relevance' | 'rating' | 'release_date' | 'name' | 'rating_count'
  orderDirection?: 'asc' | 'desc'
}

/**
 * Franchise-aware search query expansion
 * Expands simple queries like "mario" into comprehensive search terms
 */
function expandFranchiseQuery(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  const expansions = [normalizedQuery]; // Always include original query
  
  // Franchise expansions for better coverage
  const franchiseExpansions: Record<string, string[]> = {
    // Mario franchise
    'mario': ['mario', 'super mario', 'mario bros', 'mario kart', 'paper mario', 'mario party'],
    'super mario': ['super mario', 'mario'],
    
    // Pokemon franchise  
    'pokemon': ['pokemon', 'pokémon', 'pocket monster', 'pkmn'],
    'pokémon': ['pokemon', 'pokémon', 'pocket monster', 'pkmn'],
    
    // Zelda franchise
    'zelda': ['zelda', 'legend of zelda', 'link'],
    'link': ['link', 'zelda', 'legend of zelda'],
    
    // Metroid franchise
    'metroid': ['metroid', 'samus'],
    'samus': ['samus', 'metroid'],
    
    // Final Fantasy franchise
    'final fantasy': ['final fantasy', 'ff'],
    'ff': ['ff', 'final fantasy'],
    
    // Grand Theft Auto
    'gta': ['gta', 'grand theft auto'],
    'grand theft auto': ['grand theft auto', 'gta'],
    
    // Call of Duty
    'cod': ['cod', 'call of duty'],
    'call of duty': ['call of duty', 'cod'],
    
    // Elder Scrolls
    'elder scrolls': ['elder scrolls', 'tes'],
    'skyrim': ['skyrim', 'elder scrolls'],
    'morrowind': ['morrowind', 'elder scrolls'],
    'oblivion': ['oblivion', 'elder scrolls'],
    
    // Street Fighter
    'street fighter': ['street fighter', 'sf'],
    'sf': ['sf', 'street fighter'],
    
    // Tekken
    'tekken': ['tekken', 'iron fist tournament'],
    
    // Dragon Quest
    'dragon quest': ['dragon quest', 'dq', 'dragon warrior'],
    'dq': ['dq', 'dragon quest']
  };
  
  // Add franchise-specific expansions
  if (franchiseExpansions[normalizedQuery]) {
    expansions.push(...franchiseExpansions[normalizedQuery]);
  }
  
  // Add sub-string expansions for compound searches
  const words = normalizedQuery.split(/\s+/);
  if (words.length > 1) {
    words.forEach(word => {
      if (word.length > 2 && franchiseExpansions[word]) {
        expansions.push(...franchiseExpansions[word]);
      }
    });
  }
  
  // Remove duplicates and return
  return [...new Set(expansions)];
}

/**
 * Enhanced mod detection to prevent mod content from appearing in enhanced searches
 * This works alongside the existing content protection filter
 */
function hasEnhancedModIndicators(game: any): boolean {
  const searchText = [game.name, game.developer, game.publisher, game.summary, game.description]
    .filter(Boolean).join(' ').toLowerCase();
  
  const modIndicators = [
    'mod', 'hack', 'rom hack', 'romhack', 'homebrew', 'fan game', 'fangame',
    'unofficial', 'community', 'enhanced edition', 'remastered by', 'modded',
    'total conversion', 'overhaul', 'unofficial patch', 'fan translation'
  ];
  
  return modIndicators.some(indicator => searchText.includes(indicator));
}

export interface PaginationOptions {
  limit?: number
  offset?: number
}

export interface GameSearchResult {
  id: number
  igdb_id?: number
  name: string
  description?: string
  summary?: string
  release_date?: string
  cover_url?: string
  cover_url?: string
  developer?: string
  publisher?: string
  genre?: string
  genres?: string[]
  platforms?: string[]
  igdb_rating?: number
  metacritic_score?: number
  avg_user_rating?: number
  user_rating_count?: number
  screenshots?: string[]
  total_rating?: number
  total_rating_count?: number
  rating_count?: number
  follows?: number
  hypes?: number
}

export interface SearchResponse {
  games: GameSearchResult[]
  totalCount: number
  hasMore: boolean
}

/**
 * Enhanced relevance calculation with franchise awareness
 * Improves coverage for franchise games while preventing unrelated matches
 */
function calculateSearchRelevance(game: any, searchQuery: string): number {
  if (!searchQuery || !searchQuery.trim()) return 1;

  const query = searchQuery.toLowerCase().trim();
  const gameName = (game.name || '').toLowerCase();
  const developer = (game.developer || '').toLowerCase();
  const publisher = (game.publisher || '').toLowerCase();
  const summary = (game.summary || '').toLowerCase();
  const genres = Array.isArray(game.genres) ? game.genres.join(' ').toLowerCase() : (game.genre || '').toLowerCase();

  let relevanceScore = 0;
  let maxPossibleScore = 0;

  // Exact name match (highest relevance)
  maxPossibleScore += 100;
  if (gameName === query) {
    relevanceScore += 100;
  } else if (gameName.includes(query) || query.includes(gameName)) {
    const matchRatio = Math.min(query.length, gameName.length) / Math.max(query.length, gameName.length);
    relevanceScore += 100 * matchRatio;
  }

  // Enhanced word matching for franchise games
  maxPossibleScore += 80;
  const queryWords = query.split(/\s+/);
  const nameWords = gameName.split(/\s+/);
  let nameWordMatches = 0;
  
  queryWords.forEach(queryWord => {
    // Exact word match
    const exactMatch = nameWords.some(nameWord => nameWord === queryWord);
    if (exactMatch) {
      nameWordMatches++;
      return;
    }
    
    // Partial word match (for cases like "mario" matching "mario:")
    const partialMatch = nameWords.some(nameWord => 
      nameWord.includes(queryWord) || queryWord.includes(nameWord)
    );
    if (partialMatch) {
      nameWordMatches += 0.8; // Slightly lower score for partial matches
      return;
    }
    
    // Franchise-specific fuzzy matching
    const franchiseMatch = checkFranchiseMatch(queryWord, nameWords);
    if (franchiseMatch) {
      nameWordMatches += 0.6;
    }
  });
  
  if (queryWords.length > 0) {
    relevanceScore += 80 * Math.min(nameWordMatches / queryWords.length, 1);
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

  // Franchise bonus scoring
  const franchiseBonus = calculateFranchiseBonus(game, query);
  relevanceScore += franchiseBonus;
  maxPossibleScore += 20; // Account for potential franchise bonus

  // Calculate final relevance as percentage
  const finalRelevance = maxPossibleScore > 0 ? (relevanceScore / maxPossibleScore) : 0;
  
  // Reduce threshold for franchise games to improve coverage
  const RELEVANCE_THRESHOLD = 0.12; // Reduced from 0.15
  return finalRelevance >= RELEVANCE_THRESHOLD ? finalRelevance : 0;
}

/**
 * Check for franchise-specific word matches
 */
function checkFranchiseMatch(queryWord: string, nameWords: string[]): boolean {
  const franchiseMatches: Record<string, string[]> = {
    'mario': ['super', 'mario', 'bros', 'kart', 'party', 'paper'],
    'zelda': ['legend', 'zelda', 'link', 'hyrule'],
    'pokemon': ['pokemon', 'pokémon', 'pocket', 'monster'],
    'metroid': ['metroid', 'samus'],
    'final': ['final', 'fantasy', 'ff'],
    'fantasy': ['final', 'fantasy', 'ff']
  };
  
  const relatedWords = franchiseMatches[queryWord];
  if (relatedWords) {
    return nameWords.some(nameWord => relatedWords.includes(nameWord));
  }
  
  return false;
}

/**
 * Calculate franchise bonus for well-known franchises
 */
function calculateFranchiseBonus(game: any, query: string): number {
  const gameName = (game.name || '').toLowerCase();
  const developer = (game.developer || '').toLowerCase();
  const publisher = (game.publisher || '').toLowerCase();
  
  // Official franchise publishers get bonus
  const officialPublishers = ['nintendo', 'sony', 'microsoft', 'square enix', 'capcom', 'konami', 'bandai namco'];
  const hasOfficialPublisher = officialPublishers.some(pub => 
    developer.includes(pub) || publisher.includes(pub)
  );
  
  if (hasOfficialPublisher) {
    // Check if this is likely a main franchise entry
    const isMainEntry = !gameName.includes('dlc') && 
                       !gameName.includes('expansion') && 
                       game.category === 0; // Main game category
    
    if (isMainEntry) {
      return 20; // Bonus for official main franchise entries
    } else {
      return 10; // Smaller bonus for official franchise content
    }
  }
  
  return 0;
}

/**
 * Calculate title similarity score for exact/near matches
 */
function calculateTitleSimilarity(gameName: string, searchQuery: string): number {
  if (!gameName || !searchQuery) return 0;
  
  const gameTitle = gameName.toLowerCase().trim();
  const query = searchQuery.toLowerCase().trim();
  
  // Exact match (highest score)
  if (gameTitle === query) {
    return 1000;
  }
  
  // Exact match ignoring articles (the, a, an)
  const cleanGameTitle = gameTitle.replace(/^(the|a|an)\s+/i, '').trim();
  const cleanQuery = query.replace(/^(the|a|an)\s+/i, '').trim();
  if (cleanGameTitle === cleanQuery) {
    return 950;
  }
  
  // Check for content type indicators that suggest this is additional content
  const contentTypeIndicators = ['dlc', 'expansion', 'pack', 'edition', 'remaster', 'remake', 'enhanced', 'special', 'deluxe', 'definitive', 'goty', 'collection', 'bundle', 'mod', 'patch', 'update'];
  const hasContentTypeIndicator = contentTypeIndicators.some(indicator => gameTitle.includes(indicator));
  
  // Query is start of title, but apply penalty for additional content
  if (gameTitle.startsWith(query)) {
    let score = 900;
    // Reduce score if this appears to be additional content (DLC, expansion, etc.)
    if (hasContentTypeIndicator) {
      score = 750; // Still high, but lower than main games without indicators
    }
    return score;
  }
  
  // Title starts with query after articles
  if (cleanGameTitle.startsWith(cleanQuery)) {
    let score = 850;
    if (hasContentTypeIndicator) {
      score = 700;
    }
    return score;
  }
  
  // Query contains the full title (e.g., "super mario world" matches "Mario World")
  if (query.includes(gameTitle)) {
    return 800;
  }
  
  // Title contains the full query (e.g., "Mario Kart 64" matches "mario")
  if (gameTitle.includes(query)) {
    const ratio = query.length / gameTitle.length;
    return 700 * ratio; // Higher score for queries that are larger portion of title
  }
  
  // Word-by-word matching
  const queryWords = query.split(/\s+/).filter(w => w.length > 0);
  const titleWords = gameTitle.split(/\s+/).filter(w => w.length > 0);
  
  if (queryWords.length === 0 || titleWords.length === 0) return 0;
  
  // Count exact word matches
  let exactMatches = 0;
  let partialMatches = 0;
  
  queryWords.forEach(queryWord => {
    const exactMatch = titleWords.some(titleWord => titleWord === queryWord);
    if (exactMatch) {
      exactMatches++;
    } else {
      // Check for partial matches (e.g., "mario" in "supermario")
      const partialMatch = titleWords.some(titleWord => 
        titleWord.includes(queryWord) || queryWord.includes(titleWord)
      );
      if (partialMatch) {
        partialMatches++;
      }
    }
  });
  
  const totalMatches = exactMatches + (partialMatches * 0.5);
  const matchRatio = totalMatches / queryWords.length;
  
  // Score based on match percentage and word order
  if (matchRatio >= 0.8) {
    return 600 * matchRatio;
  } else if (matchRatio >= 0.5) {
    return 400 * matchRatio;
  } else if (matchRatio >= 0.3) {
    return 200 * matchRatio;
  }
  
  return 0;
}

/**
 * Filter out games with insufficient search relevance
 */
function filterByRelevance(games: any[], searchQuery?: string): any[] {
  if (!searchQuery || !searchQuery.trim()) {
    return games;
  }

  return games.filter(game => {
    const relevance = calculateSearchRelevance(game, searchQuery);
    if (relevance === 0) {
      console.log(`🚫 FILTERED: "${game.name}" - insufficient relevance for query "${searchQuery}"`);
      return false;
    }
    return true;
  });
}

/**
 * Intelligent multi-strategy search that tries different approaches
 * to maximize franchise game coverage including sister games and sequels
 */
async function executeIntelligentSearch(originalQuery: string): Promise<any[]> {
  console.log(`🧠 INTELLIGENT SEARCH: Starting multi-strategy search for "${originalQuery}"`);
  
  const allResults = new Map<number, any>(); // Use Map to avoid duplicates by ID
  let totalAttempts = 0;
  
  // Strategy 1: Original query (primary search)
  totalAttempts++;
  try {
    console.log(`📋 STRATEGY 1: Original query "${originalQuery}"`);
    const { data: originalResults, error: originalError } = await supabase
      .rpc('search_games_secure', {
        search_query: originalQuery.trim(),
        limit_count: 100
      });
      
    if (!originalError && originalResults) {
      originalResults.forEach((game: any) => {
        if (!allResults.has(game.id)) {
          allResults.set(game.id, { ...game, _searchStrategy: 'original', _searchRank: game.search_rank });
        }
      });
      console.log(`   ✅ Found ${originalResults.length} games with original query`);
    }
  } catch (error) {
    console.log(`   ❌ Original query failed:`, error);
  }
  
  // Strategy 2: Franchise expansions
  const expandedQueries = expandFranchiseQuery(originalQuery);
  for (const expandedQuery of expandedQueries) {
    if (expandedQuery === originalQuery.toLowerCase().trim()) continue; // Skip duplicate
    
    totalAttempts++;
    try {
      console.log(`📋 STRATEGY 2: Expanded query "${expandedQuery}"`);
      const { data: expandedResults, error: expandedError } = await supabase
        .rpc('search_games_secure', {
          search_query: expandedQuery,
          limit_count: 100
        });
        
      if (!expandedError && expandedResults) {
        expandedResults.forEach((game: any) => {
          if (!allResults.has(game.id)) {
            allResults.set(game.id, { ...game, _searchStrategy: `expanded:${expandedQuery}`, _searchRank: game.search_rank });
          }
        });
        console.log(`   ✅ Found ${expandedResults.length} additional games with "${expandedQuery}"`);
      }
    } catch (error) {
      console.log(`   ❌ Expanded query "${expandedQuery}" failed:`, error);
    }
  }
  
  // Strategy 3: Sister game and sequel expansion (Pokemon Red → Blue/Yellow, Final Fantasy 7 → other numbers)
  const sisterGameQueries = generateSisterGameQueries(originalQuery);
  if (sisterGameQueries.length > 0) {
    console.log(`📋 STRATEGY 3: Sister game expansion for "${originalQuery}" (${sisterGameQueries.length} queries)`);
    
    for (const sisterQuery of sisterGameQueries) {
      if (sisterQuery === originalQuery.toLowerCase().trim()) continue; // Skip duplicate
      if (totalAttempts >= 15) break; // Respect API limits
      
      totalAttempts++;
      try {
        const { data: sisterResults, error: sisterError } = await supabase
          .rpc('search_games_secure', {
            search_query: sisterQuery,
            limit_count: 50 // Lower limit for sister games to balance coverage vs performance
          });
          
        if (!sisterError && sisterResults) {
          sisterResults.forEach((game: any) => {
            if (!allResults.has(game.id)) {
              allResults.set(game.id, { ...game, _searchStrategy: `sister:${sisterQuery}`, _searchRank: game.search_rank });
            }
          });
          console.log(`   ✅ Found ${sisterResults.length} sister games with "${sisterQuery}"`);
        }
      } catch (error) {
        console.log(`   ❌ Sister game query "${sisterQuery}" failed:`, error);
      }
    }
  }
  
  // Strategy 4: Partial matching with ILIKE as fallback (for partial matches that full-text missed)
  // Only if we have very few results so far
  if (allResults.size < 10) {
    totalAttempts++;
    try {
      console.log(`📋 STRATEGY 4: Partial matching fallback for "${originalQuery}"`);
      const { data: partialResults, error: partialError } = await supabase
        .from('game')
        .select('id, name, summary, description, release_date, pic_url, genres, igdb_id, developer, publisher')
        .or(`name.ilike.%${originalQuery}%,summary.ilike.%${originalQuery}%,developer.ilike.%${originalQuery}%`)
        .limit(50);
        
      if (!partialError && partialResults) {
        partialResults.forEach((game: any) => {
          if (!allResults.has(game.id)) {
            allResults.set(game.id, { ...game, _searchStrategy: 'partial', _searchRank: 0.1 });
          }
        });
        console.log(`   ✅ Found ${partialResults.length} additional games with partial matching`);
      }
    } catch (error) {
      console.log(`   ❌ Partial matching failed:`, error);
    }
  }
  
  const finalResults = Array.from(allResults.values());
  console.log(`🎯 INTELLIGENT SEARCH COMPLETE: Found ${finalResults.length} unique games across ${totalAttempts} strategies`);
  
  // Log strategy breakdown
  const strategyBreakdown = finalResults.reduce((acc: any, game) => {
    const strategy = game._searchStrategy || 'unknown';
    acc[strategy] = (acc[strategy] || 0) + 1;
    return acc;
  }, {});
  console.log(`📊 SEARCH STRATEGY BREAKDOWN:`, strategyBreakdown);
  
  return finalResults;
}

class GameSearchService {
  async searchGames(
    filters: SearchFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<SearchResponse> {
    const { limit = 20, offset = 0 } = pagination
    const {
      query,
      releaseDateStart,
      releaseDateEnd,
      platformIds,
      minRating,
      maxRating,
      minRatingCount,
      genres,
      orderBy = 'relevance',
      orderDirection = 'desc'
    } = filters

    try {
      // Build the base query with rating aggregations
      let baseQuery = supabase
        .from('game')
        .select(`
          *,
          rating_count:rating(id).count(),
          avg_rating:rating(rating).avg()
        `, { count: 'exact' })

      // Apply search query filter using intelligent multi-strategy search
      if (query && query.trim()) {
        console.log(`🔍 SEARCH INITIATED: "${query.trim()}"`);
        
        // Use intelligent search that tries multiple strategies
        const searchResults = await executeIntelligentSearch(query.trim());
        
        if (searchResults && searchResults.length > 0) {
          const matchingIds = searchResults.map(r => r.id);
          baseQuery = baseQuery.in('id', matchingIds);
          console.log(`✅ SEARCH RESULTS: Found ${searchResults.length} games, querying database for full details`);
        } else {
          console.log(`❌ NO SEARCH RESULTS: No games found for query "${query.trim()}"`);
          return { games: [], totalCount: 0, hasMore: false };
        }
      }

      // Apply release date filters
      if (releaseDateStart) {
        baseQuery = baseQuery.gte('release_date', releaseDateStart.toISOString().split('T')[0])
      }
      if (releaseDateEnd) {
        baseQuery = baseQuery.lte('release_date', releaseDateEnd.toISOString().split('T')[0])
      }

      // Apply genre filters using secure function
      if (genres && genres.length > 0) {
        const genreMatchingIds = new Set<number>();
        
        for (const genre of genres) {
          const { data: genreResults, error: genreError } = await supabase
            .rpc('search_games_by_genre', {
              genre_name: genre,
              limit_count: 1000
            });
            
          if (genreError) {
            console.error('Genre search error:', genreError);
            continue; // Skip this genre but continue with others
          }
          
          if (genreResults) {
            genreResults.forEach(result => genreMatchingIds.add(result.id));
          }
        }
        
        if (genreMatchingIds.size > 0) {
          baseQuery = baseQuery.in('id', Array.from(genreMatchingIds));
        } else {
          // No genre matches found
          return { data: [], count: 0, error: null };
        }
      }

      // Execute the base query
      const { data: games, error, count } = await baseQuery
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error searching games:', error)
        return { games: [], totalCount: 0, hasMore: false }
      }

      // If we need to filter by platforms or ratings, we need additional queries
      let filteredGames = games || []

      // Filter by platforms if specified
      if (platformIds && platformIds.length > 0 && filteredGames.length > 0) {
        const gameIds = filteredGames.map(g => g.id)
        
        const { data: platformGames } = await supabase
          .from('platform_games')
          .select('game_id')
          .in('game_id', gameIds)
          .in('platform_id', platformIds)

        const gamesWithPlatform = new Set(platformGames?.map(pg => pg.game_id) || [])
        filteredGames = filteredGames.filter(game => gamesWithPlatform.has(game.id))
      }

      // Get rating stats for filtered games
      if (filteredGames.length > 0) {
        const gameIds = filteredGames.map(g => g.id)
        
        const { data: ratingsData } = await supabase
          .from('rating')
          .select('game_id, rating')
          .in('game_id', gameIds)

        // Calculate average ratings and counts
        const ratingStats = new Map<number, { sum: number, count: number }>()
        
        ratingsData?.forEach(rating => {
          if (!ratingStats.has(rating.game_id)) {
            ratingStats.set(rating.game_id, { sum: 0, count: 0 })
          }
          const stats = ratingStats.get(rating.game_id)!
          stats.sum += rating.rating
          stats.count += 1
        })

        // Add rating stats to games
        filteredGames = filteredGames.map(game => {
          const stats = ratingStats.get(game.id)
          return {
            ...game,
            avg_user_rating: stats ? stats.sum / stats.count : undefined,
            user_rating_count: stats?.count || 0
          }
        })

        // Apply rating filters
        if (minRating !== undefined) {
          filteredGames = filteredGames.filter(game => 
            game.avg_user_rating !== undefined && game.avg_user_rating >= minRating
          )
        }
        if (maxRating !== undefined) {
          filteredGames = filteredGames.filter(game => 
            game.avg_user_rating !== undefined && game.avg_user_rating <= maxRating
          )
        }
        if (minRatingCount !== undefined) {
          filteredGames = filteredGames.filter(game => 
            game.user_rating_count >= minRatingCount
          )
        }
      }

      // Apply strict relevance filtering to prevent unrelated games
      if (query && query.trim()) {
        filteredGames = filterByRelevance(filteredGames, query.trim());
      }

      // Apply sister game boosts for better series coverage (Pokemon Red → Blue/Yellow, etc.)
      if (query && query.trim()) {
        // Get the original game's genres for genre-based prioritization
        const potentialOriginalGame = filteredGames.find(game => {
          const titleScore = calculateTitleSimilarity(game.name, query.trim());
          return titleScore >= 900; // High similarity suggests this is the original searched game
        });
        
        const originalGameGenres = potentialOriginalGame?.genres;
        filteredGames = applySisterGameBoost(filteredGames, query.trim(), originalGameGenres);
      }

      // Sort the results using the intelligent priority system with title similarity
      if (orderBy === 'relevance') {
        // Use title-aware sorting that prioritizes exact matches at the top
        filteredGames = this.sortGamesByTitleSimilarityAndPriority(filteredGames, query?.trim());
      } else {
        // Use traditional sorting for other sort options
        filteredGames = this.sortGames(filteredGames, orderBy, orderDirection, query);
      }

      // Get platforms for the final games
      if (filteredGames.length > 0) {
        const gameIds = filteredGames.map(g => g.id)
        
        const { data: platformData } = await supabase
          .from('platform_games')
          .select(`
            game_id,
            platform:platform_id (
              name
            )
          `)
          .in('game_id', gameIds)

        // Group platforms by game
        const gamePlatforms = new Map<number, string[]>()
        platformData?.forEach(pg => {
          if (pg.platform) {
            if (!gamePlatforms.has(pg.game_id)) {
              gamePlatforms.set(pg.game_id, [])
            }
            gamePlatforms.get(pg.game_id)!.push(pg.platform.name)
          }
        })

        // Add platforms to games
        filteredGames = filteredGames.map(game => ({
          ...game,
          platforms: gamePlatforms.get(game.id) || []
        }))
      }

      // Map to final result format
      const searchResults: GameSearchResult[] = filteredGames.map(game => ({
        id: game.id,
        igdb_id: game.igdb_id,
        name: game.name,
        description: game.description,
        summary: game.summary,
        release_date: game.release_date,
        cover_url: game.cover_url,
        developer: game.developer || game.dev,
        publisher: game.publisher,
        genre: game.genre,
        genres: game.genres || (game.genre ? [game.genre] : []),
        platforms: game.platforms || [],
        igdb_rating: game.igdb_rating,
        metacritic_score: game.metacritic_score,
        avg_user_rating: game.avg_user_rating,
        user_rating_count: game.user_rating_count,
        screenshots: game.screenshots,
        total_rating: game.total_rating,
        total_rating_count: game.total_rating_count,
        rating_count: game.rating_count,
        follows: game.follows,
        hypes: game.hypes
      }))

      return {
        games: searchResults,
        totalCount: count || 0,
        hasMore: (offset + limit) < (count || 0)
      }
    } catch (error) {
      console.error('Error in searchGames:', error)
      return { games: [], totalCount: 0, hasMore: false }
    }
  }

  private sortGames(
    games: any[],
    orderBy: string,
    direction: 'asc' | 'desc',
    query?: string
  ): any[] {
    const sorted = [...games]
    
    switch (orderBy) {
      case 'relevance':
        // Sort by relevance if there's a search query
        if (query) {
          const lowerQuery = query.toLowerCase()
          sorted.sort((a, b) => {
            // Exact name match gets highest priority
            const aExact = a.name.toLowerCase() === lowerQuery ? 1000 : 0
            const bExact = b.name.toLowerCase() === lowerQuery ? 1000 : 0
            
            // Name contains query gets second priority  
            const aNameMatch = a.name.toLowerCase().includes(lowerQuery) ? 100 : 0
            const bNameMatch = b.name.toLowerCase().includes(lowerQuery) ? 100 : 0
            
            // Add bonus for having a summary (deprioritize games without summaries)
            const aHasSummary = (a.summary && a.summary.trim().length > 0) ? 50 : 0
            const bHasSummary = (b.summary && b.summary.trim().length > 0) ? 50 : 0
            
            // Then sort by rating count (popularity)
            const aScore = aExact + aNameMatch + aHasSummary + (a.user_rating_count || 0)
            const bScore = bExact + bNameMatch + bHasSummary + (b.user_rating_count || 0)
            
            return direction === 'desc' ? bScore - aScore : aScore - bScore
          })
        } else {
          // Without query, sort by popularity (rating count) and summary presence
          sorted.sort((a, b) => {
            // Add significant penalty for missing summary
            const aHasSummary = (a.summary && a.summary.trim().length > 0) ? 1000 : 0
            const bHasSummary = (b.summary && b.summary.trim().length > 0) ? 1000 : 0
            
            const aScore = aHasSummary + (a.user_rating_count || 0)
            const bScore = bHasSummary + (b.user_rating_count || 0)
            
            const diff = bScore - aScore
            return direction === 'desc' ? diff : -diff
          })
        }
        break
        
      case 'rating':
        sorted.sort((a, b) => {
          const aRating = a.avg_user_rating || 0
          const bRating = b.avg_user_rating || 0
          const diff = bRating - aRating
          return direction === 'desc' ? diff : -diff
        })
        break
        
      case 'rating_count':
        sorted.sort((a, b) => {
          const diff = (b.user_rating_count || 0) - (a.user_rating_count || 0)
          return direction === 'desc' ? diff : -diff
        })
        break
        
      case 'release_date':
        sorted.sort((a, b) => {
          const aDate = a.release_date ? new Date(a.release_date).getTime() : 0
          const bDate = b.release_date ? new Date(b.release_date).getTime() : 0
          const diff = bDate - aDate
          return direction === 'desc' ? diff : -diff
        })
        break
        
      case 'name':
        sorted.sort((a, b) => {
          const comp = a.name.localeCompare(b.name)
          return direction === 'desc' ? -comp : comp
        })
        break
    }
    
    return sorted
  }

  /**
   * Sort games by title similarity to search query first, then by priority/category
   * Ensures exact/similar matches appear at the top of search results
   */
  private sortGamesByTitleSimilarityAndPriority(games: any[], searchQuery?: string): any[] {
    if (!searchQuery || !searchQuery.trim()) {
      // No search query, use regular priority sorting
      return sortGamesByPriority(games);
    }

    console.log(`🎯 TITLE-AWARE SORTING: Sorting ${games.length} games for query "${searchQuery}"`);

    return [...games].sort((a, b) => {
      // Calculate title similarity scores
      const aTitleScore = calculateTitleSimilarity(a.name, searchQuery);
      const bTitleScore = calculateTitleSimilarity(b.name, searchQuery);

      // Calculate priority information
      const aPriority = calculateGamePriority(a);
      const bPriority = calculateGamePriority(b);

      // SMART SORTING LOGIC: When both games have high title similarity (>800), 
      // prioritize category to ensure main games come before DLC of the same franchise
      const highSimilarityThreshold = 800;
      if (aTitleScore > highSimilarityThreshold && bTitleScore > highSimilarityThreshold) {
        // Both have high similarity, prioritize by category first to maintain hierarchy
        if (aPriority.categoryPriority !== bPriority.categoryPriority) {
          console.log(`   📂 "${a.name}" vs "${b.name}" - High similarity, category priority wins`);
          return bPriority.categoryPriority - aPriority.categoryPriority;
        }
        // Same category, then by title similarity
        if (aTitleScore !== bTitleScore) {
          console.log(`   📊 "${a.name}" (${aTitleScore}) vs "${b.name}" (${bTitleScore}) - Same category, title similarity wins`);
          return bTitleScore - aTitleScore;
        }
      } else {
        // Normal case: title similarity first when scores are not both high
        if (aTitleScore !== bTitleScore) {
          console.log(`   📊 "${a.name}" (${aTitleScore}) vs "${b.name}" (${bTitleScore}) - Title similarity wins`);
          return bTitleScore - aTitleScore; // Higher similarity first
        }
        // Same title similarity, then category priority
        if (aPriority.categoryPriority !== bPriority.categoryPriority) {
          console.log(`   📂 "${a.name}" vs "${b.name}" - Same title similarity, category priority wins`);
          return bPriority.categoryPriority - aPriority.categoryPriority;
        }
      }

      // TERTIARY SORT: Game priority score (Famous > Sequel > Main > DLC > Community > Low)
      if (aPriority.score !== bPriority.score) {
        console.log(`   ⭐ "${a.name}" (${aPriority.score}) vs "${b.name}" (${bPriority.score}) - Priority score wins`);
        return bPriority.score - aPriority.score;
      }

      // QUATERNARY SORT: IGDB/Quality rating
      const aRating = a.igdb_rating || a.rating || 0;
      const bRating = b.igdb_rating || b.rating || 0;
      if (aRating !== bRating) {
        return bRating - aRating;
      }

      // QUINARY SORT: User engagement
      const aEngagement = (a.user_rating_count || 0) + (a.follows || 0) + (a.hypes || 0);
      const bEngagement = (b.user_rating_count || 0) + (b.follows || 0) + (b.hypes || 0);
      if (aEngagement !== bEngagement) {
        return bEngagement - aEngagement;
      }

      // FINAL SORT: Alphabetical by name
      return a.name.localeCompare(b.name);
    });
  }

  async getPopularGames(limit: number = 20): Promise<GameSearchResult[]> {
    const response = await this.searchGames(
      { 
        orderBy: 'rating_count',
        minRatingCount: 1
      },
      { limit }
    )
    return response.games
  }

  async getTopRatedGames(limit: number = 20, minRatingCount: number = 5): Promise<GameSearchResult[]> {
    const response = await this.searchGames(
      { 
        orderBy: 'rating',
        minRatingCount
      },
      { limit }
    )
    return response.games
  }

  async getRecentGames(limit: number = 20): Promise<GameSearchResult[]> {
    const response = await this.searchGames(
      { orderBy: 'release_date' },
      { limit }
    )
    return response.games
  }

  async getGamesByPlatform(platformId: number, limit: number = 20): Promise<GameSearchResult[]> {
    const response = await this.searchGames(
      { platformIds: [platformId] },
      { limit }
    )
    return response.games
  }

  async getGamesByGenre(genre: string, limit: number = 20): Promise<GameSearchResult[]> {
    const response = await this.searchGames(
      { genres: [genre] },
      { limit }
    )
    return response.games
  }
}

export const gameSearchService = new GameSearchService()