// Enhanced Game Prioritization System with Flagship Support
// Ensures high-quality, official, and iconic games appear first in search results

import { 
  CopyrightLevel, 
  getCompanyCopyrightLevel,
  isAuthorizedPublisher,
  findFranchiseOwner,
  COMPANY_OWNERSHIP
} from './copyrightPolicies';

import { 
  calculateIconicScore, 
  isIconicGame,
  type IconicGameScore 
} from './iconicGameDetection';

interface Game {
  id: number;
  name: string;
  developer?: string;
  publisher?: string;
  category?: number;
  genres?: string[];
  summary?: string;
  description?: string;
  rating?: number;
  igdb_rating?: number;
  first_release_date?: number;
  total_rating?: number;
  total_rating_count?: number;
  rating_count?: number;
  follows?: number;
  hypes?: number;
  user_rating_count?: number;
  avg_user_rating?: number;
}

export enum GamePriority {
  FLAGSHIP_TIER = 1500, // Flagship/iconic games that defined gaming (NEW Tier 0)
  FAMOUS_TIER = 1200,   // Famous/iconic games that shaped gaming (Tier 1)
  SEQUEL_TIER = 1000,   // Sequels to famous games or acclaimed series (Tier 2)
  MAIN_TIER = 800,      // Main official games from major publishers (Tier 3)
  DLC_TIER = 400,       // Official DLC/expansions (Tier 4)
  COMMUNITY_TIER = 200, // Community content from mod-friendly companies (Tier 5)
  LOW_TIER = 100        // Everything else (Tier 6)
}

interface PriorityResult {
  priority: GamePriority;
  score: number;
  reasons: string[];
  boosts: string[];
  penalties: string[];
}

/**
 * Famous Games Database - Games that shaped the industry and are culturally significant
 * These get FAMOUS_TIER priority regardless of other factors
 */
const FAMOUS_GAMES_DATABASE = new Set([
  // Nintendo Classics
  'super mario bros', 'super mario bros.', 'super mario 64', 'super mario world', 'super mario odyssey',
  'the legend of zelda', 'zelda', 'the legend of zelda: ocarina of time', 'ocarina of time',
  'the legend of zelda: breath of the wild', 'breath of the wild', 'the legend of zelda: tears of the kingdom',
  'super metroid', 'metroid prime', 'metroid', 'super smash bros. melee', 'super smash bros',
  'mario kart 64', 'mario kart 8', 'mario kart 8 deluxe', 'donkey kong country', 'kirby\'s adventure',
  
  // Sony Exclusives
  'the last of us', 'god of war', 'god of war (2018)', 'uncharted 4', 'uncharted 2', 'shadow of the colossus',
  'bloodborne', 'horizon zero dawn', 'spider-man', 'ghost of tsushima', 'persona 5',
  
  // Microsoft Exclusives  
  'halo', 'halo: combat evolved', 'halo 3', 'gears of war', 'forza horizon', 'fable',
  
  // Multi-platform Legends
  'grand theft auto: vice city', 'gta vice city', 'grand theft auto: san andreas', 'gta san andreas',
  'grand theft auto v', 'gta v', 'red dead redemption', 'red dead redemption 2',
  'the elder scrolls v: skyrim', 'skyrim', 'the elder scrolls iii: morrowind', 'morrowind',
  'fallout', 'fallout: new vegas', 'fallout 3', 'fallout 4',
  'the witcher 3', 'the witcher 3: wild hunt', 'cyberpunk 2077',
  'dark souls', 'demon\'s souls', 'elden ring', 'sekiro',
  'call of duty: modern warfare', 'call of duty 4', 'call of duty: modern warfare 2',
  'overwatch', 'team fortress 2', 'counter-strike', 'counter-strike: global offensive',
  'half-life', 'half-life 2', 'portal', 'portal 2', 'left 4 dead 2',
  'doom', 'doom (2016)', 'doom eternal', 'wolfenstein 3d', 'quake',
  'minecraft', 'terraria', 'stardew valley', 'among us', 'fall guys',
  'world of warcraft', 'diablo ii', 'diablo 2', 'starcraft', 'warcraft iii',
  'street fighter ii', 'street fighter 2', 'tekken 3', 'mortal kombat',
  'final fantasy vii', 'final fantasy 7', 'final fantasy vi', 'final fantasy 6',
  'final fantasy x', 'final fantasy 10', 'chrono trigger', 'secret of mana',
  'resident evil', 'resident evil 4', 'silent hill 2', 'metal gear solid',
  'bioshock', 'bioshock infinite', 'system shock 2', 'deus ex',
  'civilization', 'age of empires ii', 'starcraft ii', 'xcom',
  'mass effect', 'mass effect 2', 'dragon age: origins', 'knights of the old republic'
]);

/**
 * Famous Game Series Database - Series where sequels/entries get SEQUEL_TIER priority
 */
const FAMOUS_SERIES_DATABASE = new Set([
  'mario', 'zelda', 'metroid', 'pokemon', 'kirby', 'donkey kong', 'smash bros',
  'final fantasy', 'dragon quest', 'chrono', 'kingdom hearts', 'nier',
  'elder scrolls', 'fallout', 'witcher', 'cyberpunk', 'dark souls', 'souls',
  'grand theft auto', 'gta', 'red dead', 'max payne', 'bully',
  'call of duty', 'battlefield', 'halo', 'gears of war', 'forza',
  'god of war', 'last of us', 'uncharted', 'horizon', 'spider-man',
  'resident evil', 'silent hill', 'metal gear', 'castlevania',
  'street fighter', 'tekken', 'mortal kombat', 'king of fighters',
  'bioshock', 'system shock', 'deus ex', 'dishonored',
  'assassin\'s creed', 'far cry', 'tom clancy', 'splinter cell',
  'civilization', 'age of empires', 'total war', 'starcraft', 'warcraft',
  'mass effect', 'dragon age', 'knights of the old republic', 'kotor',
  'doom', 'quake', 'wolfenstein', 'half-life', 'portal',
  'overwatch', 'team fortress', 'counter-strike', 'left 4 dead',
  'diablo', 'world of warcraft', 'starcraft', 'heroes of the storm',
  'persona', 'shin megami tensei', 'fire emblem', 'advance wars'
]);

/**
 * Check if a game is in the famous games database
 */
function isFamousGame(gameName: string): boolean {
  const normalized = gameName.toLowerCase().trim();
  
  // Check exact matches first
  if (FAMOUS_GAMES_DATABASE.has(normalized)) {
    return true;
  }
  
  // Check partial matches for games with subtitles
  for (const famousGame of FAMOUS_GAMES_DATABASE) {
    if (normalized.includes(famousGame) || famousGame.includes(normalized)) {
      // Avoid false positives - ensure it's actually the same game
      const similarity = calculateStringSimilarity(normalized, famousGame);
      if (similarity > 0.7) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if a game belongs to a famous series (gets SEQUEL_TIER)
 */
function isFamousSeriesGame(gameName: string): boolean {
  const normalized = gameName.toLowerCase().trim();
  
  return Array.from(FAMOUS_SERIES_DATABASE).some(series => 
    normalized.includes(series) || series.includes(normalized)
  );
}

/**
 * Calculate string similarity for fuzzy matching
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate comprehensive priority score for a game
 */
export function calculateGamePriority(game: Game): PriorityResult {
  const reasons: string[] = [];
  const boosts: string[] = [];
  const penalties: string[] = [];
  let basePriority = GamePriority.MAIN_TIER;
  let score = basePriority;

  const searchText = [game.name, game.developer, game.publisher, game.summary, game.description]
    .filter(Boolean).join(' ').toLowerCase();

  // === 6-TIER ENHANCED GAME SYSTEM ===

  // Tier 0: FLAGSHIP - Flagship/iconic games that defined gaming (NEW!)
  const iconicScore = calculateIconicScore({
    id: game.id,
    name: game.name,
    rating: game.rating || game.igdb_rating,
    user_rating_count: game.user_rating_count,
    follows: game.follows,
    hypes: game.hypes,
    first_release_date: game.first_release_date,
    category: game.category,
    genres: game.genres,
    franchise: findFranchiseOwner(game, searchText)
  });

  if (iconicScore.isFlagship || iconicScore.score >= 100) {
    basePriority = GamePriority.FLAGSHIP_TIER;
    reasons.push(`FLAGSHIP TIER: ${iconicScore.flagshipData?.reason || 'Iconic game that defined gaming'}`);
    boosts.push(`Flagship/iconic game (+${Math.round(iconicScore.score)})`);
    score = GamePriority.FLAGSHIP_TIER + Math.round(iconicScore.score);
  }
  
  // Tier 1: FAMOUS - Iconic games that shaped gaming  
  else if (isFamousGame(game.name)) {
    basePriority = GamePriority.FAMOUS_TIER;
    reasons.push(`FAMOUS TIER: Iconic game that shaped gaming history`);
    boosts.push('Famous game (+300)');
    score = GamePriority.FAMOUS_TIER + 300;
  }
  
  // Tier 2: SEQUEL - Sequels to famous series or acclaimed franchises
  else if (isFamousSeriesGame(game.name)) {
    basePriority = GamePriority.SEQUEL_TIER;
    reasons.push(`SEQUEL TIER: Entry in famous/acclaimed game series`);
    boosts.push('Famous series game (+200)');
    score = GamePriority.SEQUEL_TIER + 200;
  }
  
  // Tier 3: MAIN - Official games from major publishers/IP owners
  else {
    const franchiseOwner = findFranchiseOwner(game, searchText);
    if (franchiseOwner) {
      const isAuthorized = isAuthorizedPublisher(
        game.developer || '', 
        game.publisher || '', 
        franchiseOwner
      );
      
      if (isAuthorized) {
        const ownershipData = COMPANY_OWNERSHIP[franchiseOwner.toLowerCase()];
        const isDeveloperFirstParty = ownershipData?.firstParty?.some(company => 
          (game.developer || '').toLowerCase().includes(company.toLowerCase())
        );
        const isPublisherFirstParty = ownershipData?.firstParty?.some(company => 
          (game.publisher || '').toLowerCase().includes(company.toLowerCase())
        );

        if (isDeveloperFirstParty || isPublisherFirstParty) {
          basePriority = GamePriority.MAIN_TIER;
          reasons.push(`MAIN TIER: Official ${franchiseOwner} game by first-party developer`);
          boosts.push('First-party developer (+100)');
          score += 100;
        } else {
          basePriority = GamePriority.MAIN_TIER;
          reasons.push(`MAIN TIER: Official ${franchiseOwner} game by authorized developer`);
          boosts.push('Authorized developer (+75)');
          score += 75;
        }
      }
    }

    // Check for major company without franchise detection
    if (basePriority === GamePriority.MAIN_TIER && !franchiseOwner) {
      const developerLevel = getCompanyCopyrightLevel(game.developer || '');
      const publisherLevel = getCompanyCopyrightLevel(game.publisher || '');
      
      if (developerLevel === CopyrightLevel.AGGRESSIVE || publisherLevel === CopyrightLevel.AGGRESSIVE) {
        basePriority = GamePriority.MAIN_TIER;
        reasons.push('MAIN TIER: Major publisher/developer');
        boosts.push('Major company (+50)');
        score += 50;
      }
    }
  }

  // === CATEGORY-BASED ADJUSTMENTS ===

  switch (game.category) {
    case 0: // Main game
      boosts.push('Main game (+50)');
      score += 50;
      break;
    case 1: // DLC
    case 2: // Expansion
      if (basePriority >= GamePriority.MAIN_TIER) {
        basePriority = GamePriority.DLC_TIER;
        reasons.push('DLC TIER: Official expansion content');
      }
      break;
    case 5: // Mod
      const modCompanyLevel = getCompanyCopyrightLevel(game.developer || '');
      if (modCompanyLevel === CopyrightLevel.MOD_FRIENDLY) {
        basePriority = GamePriority.COMMUNITY_TIER;
        reasons.push('COMMUNITY TIER: Mod from mod-friendly publisher');
        boosts.push('Mod-friendly company (+25)');
        score += 25;
      } else {
        basePriority = GamePriority.LOW_TIER;
        reasons.push('LOW TIER: Mod content');
        penalties.push('Mod from non-friendly company (-100)');
        score -= 100;
      }
      break;
    case 8: // Remake
    case 9: // Remaster
      boosts.push('Remake/Remaster (+30)');
      score += 30;
      break;
    case 11: // Port
      penalties.push('Port (-20)');
      score -= 20;
      break;
  }

  // === QUALITY INDICATORS ===

  // IGDB Rating boost
  if (game.igdb_rating || game.rating) {
    const rating = game.igdb_rating || game.rating || 0;
    if (rating >= 90) {
      boosts.push('Exceptional rating 90+ (+50)');
      score += 50;
    } else if (rating >= 80) {
      boosts.push('Great rating 80+ (+30)');
      score += 30;
    } else if (rating >= 70) {
      boosts.push('Good rating 70+ (+15)');
      score += 15;
    } else if (rating < 50) {
      penalties.push('Poor rating <50 (-25)');
      score -= 25;
    }
  }

  // Engagement metrics boost (using IGDB rating count as popularity proxy)
  const engagementScore = (game.total_rating_count || game.rating_count || 0) + (game.follows || 0) + (game.hypes || 0);
  if (engagementScore > 0) {
    if (engagementScore >= 1000) {
      boosts.push('Very high engagement 1000+ (+40)');
      score += 40;
    } else if (engagementScore >= 500) {
      boosts.push('High engagement 500+ (+30)');
      score += 30;
    } else if (engagementScore >= 100) {
      boosts.push('Good engagement 100+ (+20)');
      score += 20;
    } else if (engagementScore >= 50) {
      boosts.push('Moderate engagement 50+ (+10)');
      score += 10;
    }
  }

  // User rating count (engagement indicator)
  if (game.user_rating_count) {
    if (game.user_rating_count >= 1000) {
      boosts.push('High user engagement 1000+ ratings (+30)');
      score += 30;
    } else if (game.user_rating_count >= 100) {
      boosts.push('Good user engagement 100+ ratings (+15)');
      score += 15;
    } else if (game.user_rating_count >= 10) {
      boosts.push('Some user engagement 10+ ratings (+5)');
      score += 5;
    }
  }

  // Platform priority - Nintendo Switch gets priority for Nintendo games
  const gameText = [game.name, game.developer, game.publisher].filter(Boolean).join(' ').toLowerCase();
  const isNintendoGame = gameText.includes('nintendo') || 
    gameText.includes('mario') || gameText.includes('zelda') || 
    gameText.includes('pokemon') || gameText.includes('metroid') ||
    gameText.includes('kirby') || gameText.includes('splatoon');
  
  if (game.platforms) {
    const platformNames = Array.isArray(game.platforms) 
      ? game.platforms.map(p => typeof p === 'string' ? p : p.name).filter(Boolean)
      : [];
    
    const hasSwitch = platformNames.some(p => p.toLowerCase().includes('nintendo switch') || p.toLowerCase().includes('switch'));
    const hasPS5 = platformNames.some(p => p.toLowerCase().includes('playstation 5') || p.toLowerCase().includes('ps5'));
    const hasXbox = platformNames.some(p => p.toLowerCase().includes('xbox'));
    
    if (isNintendoGame && hasSwitch) {
      boosts.push('Nintendo game on Switch (+100)');
      score += 100;
    } else if (hasSwitch && !isNintendoGame) {
      boosts.push('Switch exclusive (+30)');
      score += 30;
    } else if (hasPS5) {
      boosts.push('PS5 version (+20)');
      score += 20;
    } else if (hasXbox) {
      boosts.push('Xbox current-gen (+15)');
      score += 15;
    }
  }

  // Release date recency (newer games get slight boost)
  if (game.first_release_date) {
    const releaseDate = new Date(game.first_release_date * 1000);
    const now = new Date();
    const yearsDiff = (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    if (yearsDiff <= 1) {
      boosts.push('Recent release (within 1 year) (+20)');
      score += 20;
    } else if (yearsDiff <= 3) {
      boosts.push('Recent release (within 3 years) (+10)');
      score += 10;
    } else if (yearsDiff >= 20) {
      penalties.push('Very old release (20+ years) (-10)');
      score -= 10;
    }
  }

  // === GAME TYPE BOOSTS ===

  // Apply genre-based boosts for franchise searches (from gameTypeScoring.ts)
  if ((game as any)._gameTypeBoost) {
    const gameTypeBoost = (game as any)._gameTypeBoost;
    const gameTypeReason = (game as any)._gameTypeReason;
    
    if (gameTypeBoost > 0) {
      boosts.push(`Genre relevance (+${gameTypeBoost}): ${gameTypeReason}`);
      score += gameTypeBoost;
    } else if (gameTypeBoost < 0) {
      penalties.push(`Genre mismatch (${gameTypeBoost}): ${gameTypeReason}`);
      score += gameTypeBoost; // gameTypeBoost is negative
    }
  }

  // Apply Olympic/Party penalties for core franchise searches
  if ((game as any)._olympicPartyPenalty) {
    const penalty = (game as any)._olympicPartyPenalty;
    penalties.push(`Olympic/Party content (${penalty})`);
    score += penalty; // penalty is negative
  }

  // === PLATFORM & QUALITY BOOSTS ===

  // Apply platform priority boosts (from platformPriority.ts)
  if ((game as any)._platformBoost) {
    const platformBoost = (game as any)._platformBoost;
    const platformReason = (game as any)._platformReason;
    boosts.push(`Platform priority (+${platformBoost}): ${platformReason}`);
    score += platformBoost;
  }

  // Apply age-based significance boosts
  if ((game as any)._ageBoost) {
    const ageBoost = (game as any)._ageBoost;
    const ageReason = (game as any)._ageReason;
    boosts.push(`Age significance (+${ageBoost}): ${ageReason}`);
    score += ageBoost;
  }

  // Apply rating quality boosts (from qualityMetrics.ts)
  if ((game as any)._ratingBoost) {
    const ratingBoost = (game as any)._ratingBoost;
    const ratingReason = (game as any)._ratingReason;
    boosts.push(`Rating quality (+${ratingBoost}): ${ratingReason}`);
    score += ratingBoost;
  }

  // Apply popularity boosts
  if ((game as any)._popularityBoost) {
    const popularityBoost = (game as any)._popularityBoost;
    const popularityReason = (game as any)._popularityReason;
    boosts.push(`Popularity (+${popularityBoost}): ${popularityReason}`);
    score += popularityBoost;
  }

  // Apply franchise significance boosts
  if ((game as any)._significanceBoost) {
    const significanceBoost = (game as any)._significanceBoost;
    const significanceReason = (game as any)._significanceReason;
    boosts.push(`Franchise significance (+${significanceBoost}): ${significanceReason}`);
    score += significanceBoost;
  }

  // === FINAL ADJUSTMENTS ===

  // Ensure minimum scores
  score = Math.max(score, GamePriority.LOW_TIER);

  // Update base priority based on final score
  if (score >= GamePriority.FAMOUS_TIER) {
    basePriority = GamePriority.FAMOUS_TIER;
  } else if (score >= GamePriority.SEQUEL_TIER) {
    basePriority = GamePriority.SEQUEL_TIER;
  } else if (score >= GamePriority.MAIN_TIER) {
    basePriority = GamePriority.MAIN_TIER;
  } else if (score >= GamePriority.DLC_TIER) {
    basePriority = GamePriority.DLC_TIER;
  } else if (score >= GamePriority.COMMUNITY_TIER) {
    basePriority = GamePriority.COMMUNITY_TIER;
  } else {
    basePriority = GamePriority.LOW_TIER;
  }

  return {
    priority: basePriority,
    score: Math.round(score),
    reasons,
    boosts,
    penalties
  };
}

/**
 * Sort games by priority score (highest first)
 */
export function sortGamesByPriority(games: Game[]): Game[] {
  return [...games].sort((a, b) => {
    const aPriority = calculateGamePriority(a);
    const bPriority = calculateGamePriority(b);
    
    // Primary sort: by priority score (descending)
    if (aPriority.score !== bPriority.score) {
      return bPriority.score - aPriority.score;
    }
    
    // Secondary sort: by rating (descending)
    const aRating = a.igdb_rating || a.rating || 0;
    const bRating = b.igdb_rating || b.rating || 0;
    if (aRating !== bRating) {
      return bRating - aRating;
    }
    
    // Tertiary sort: by engagement metrics (descending)
    const aEngagement = (a.total_rating_count || a.rating_count || 0) + (a.follows || 0) + (a.hypes || 0);
    const bEngagement = (b.total_rating_count || b.rating_count || 0) + (b.follows || 0) + (b.hypes || 0);
    if (aEngagement !== bEngagement) {
      return bEngagement - aEngagement;
    }
    
    // Final sort: alphabetical
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get priority statistics for a list of games
 */
export function getPriorityStats(games: Game[]): {
  totalGames: number;
  famousTier: number;
  sequelTier: number;
  mainTier: number;
  dlcTier: number;
  communityTier: number;
  lowTier: number;
  averageScore: number;
  topGames: Array<{ name: string; score: number; priority: GamePriority }>;
} {
  const priorities = games.map(game => ({
    name: game.name,
    ...calculateGamePriority(game)
  }));

  const stats = {
    totalGames: games.length,
    famousTier: priorities.filter(p => p.priority === GamePriority.FAMOUS_TIER).length,
    sequelTier: priorities.filter(p => p.priority === GamePriority.SEQUEL_TIER).length,
    mainTier: priorities.filter(p => p.priority === GamePriority.MAIN_TIER).length,
    dlcTier: priorities.filter(p => p.priority === GamePriority.DLC_TIER).length,
    communityTier: priorities.filter(p => p.priority === GamePriority.COMMUNITY_TIER).length,
    lowTier: priorities.filter(p => p.priority === GamePriority.LOW_TIER).length,
    averageScore: priorities.reduce((sum, p) => sum + p.score, 0) / priorities.length,
    topGames: priorities
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(p => ({ name: p.name, score: p.score, priority: p.priority }))
  };

  return stats;
}

/**
 * Debug function to analyze a specific game's priority
 */
export function debugGamePriority(game: Game): void {
  console.log(`🎯 GAME PRIORITY ANALYSIS: "${game.name}"`);
  
  const result = calculateGamePriority(game);
  
  console.log(`   Final Priority: ${GamePriority[result.priority]} (${result.priority})`);
  console.log(`   Final Score: ${result.score}`);
  console.log(`   Developer: ${game.developer || 'N/A'}`);
  console.log(`   Publisher: ${game.publisher || 'N/A'}`);
  console.log(`   Category: ${game.category || 'N/A'}`);
  console.log(`   Rating: ${game.igdb_rating || game.rating || 'N/A'}`);
  console.log(`   Popularity: ${game.popularity || 'N/A'}`);
  
  if (result.reasons.length > 0) {
    console.log(`   Reasons: ${result.reasons.join(', ')}`);
  }
  
  if (result.boosts.length > 0) {
    console.log(`   ✅ Boosts: ${result.boosts.join(', ')}`);
  }
  
  if (result.penalties.length > 0) {
    console.log(`   ❌ Penalties: ${result.penalties.join(', ')}`);
  }
  
  console.log('---');
}

/**
 * Test the prioritization system with sample games
 */
export function testPrioritizationSystem(): void {
  console.log('🧪 Testing Intelligent Game Prioritization System...\n');
  
  const testGames: Game[] = [
    // Famous Tier - Iconic games
    {
      id: 1,
      name: "Super Mario Odyssey",
      developer: "Nintendo EPD",
      publisher: "Nintendo",
      category: 0,
      igdb_rating: 97,
      popularity: 200,
      user_rating_count: 5000
    },
    {
      id: 2,
      name: "The Legend of Zelda: Breath of the Wild",
      developer: "Nintendo EPD",
      publisher: "Nintendo",
      category: 0,
      igdb_rating: 96,
      popularity: 250,
      user_rating_count: 8000
    },
    
    // Sequel Tier - Famous series entries
    {
      id: 3,
      name: "Metroid Prime Remastered",
      developer: "Retro Studios",
      publisher: "Nintendo",
      category: 0,
      igdb_rating: 94,
      popularity: 150,
      first_release_date: Date.now() / 1000 - (365 * 24 * 60 * 60) // 1 year ago
    },
    
    // Low Tier - Fan mods
    {
      id: 4,
      name: "Metroid mod: Samus Goes to the Fridge to Get a Glass of Milk",
      developer: "Fan Developer",
      publisher: "Homebrew",
      category: 5,
      summary: "A humorous mod for Metroid"
    },
    
    // Community Tier - Bethesda mod (mod-friendly)
    {
      id: 5,
      name: "Skyrim: Enhanced Edition",
      developer: "Community Modder",
      publisher: "Bethesda Game Studios",
      category: 5,
      igdb_rating: 85,
      user_rating_count: 2000
    },
    
    // Main Tier - Regular game from major publisher
    {
      id: 6,
      name: "Random Indie Game",
      developer: "Indie Studio",
      publisher: "Independent",
      category: 0,
      igdb_rating: 72,
      popularity: 25
    }
  ];
  
  console.log('Original order:');
  testGames.forEach((game, index) => {
    console.log(`${index + 1}. ${game.name}`);
  });
  
  console.log('\nPriority analysis:');
  testGames.forEach(game => debugGamePriority(game));
  
  const sortedGames = sortGamesByPriority(testGames);
  
  console.log('Sorted by priority:');
  sortedGames.forEach((game, index) => {
    const priority = calculateGamePriority(game);
    console.log(`${index + 1}. ${game.name} (Score: ${priority.score}, Tier: ${GamePriority[priority.priority]})`);
  });
  
  const stats = getPriorityStats(testGames);
  console.log('\n📊 Priority Statistics:');
  console.log(`   Total Games: ${stats.totalGames}`);
  console.log(`   Famous Tier: ${stats.famousTier}`);
  console.log(`   Sequel Tier: ${stats.sequelTier}`);
  console.log(`   Main Tier: ${stats.mainTier}`);
  console.log(`   DLC Tier: ${stats.dlcTier}`);
  console.log(`   Community Tier: ${stats.communityTier}`);
  console.log(`   Low Tier: ${stats.lowTier}`);
  console.log(`   Average Score: ${stats.averageScore.toFixed(1)}`);
  
  console.log('\n✅ Prioritization system test completed!');
}