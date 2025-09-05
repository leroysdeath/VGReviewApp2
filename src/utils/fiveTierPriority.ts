/**
 * 5-Tier Game Priority System
 * 
 * Implements the user's requested priority structure:
 * 1. Most Popular/Acclaimed games (highest sales and ratings)
 * 2. Main games
 * 3. DLCs/Expansion Packs
 * 4. Mods (if company allows)
 * 5. Bundles/Oddities
 */

import { CopyrightLevel, getCompanyCopyrightLevel } from './copyrightPolicies';

export enum FiveTierPriority {
  ACCLAIMED_TIER = 1000,    // Tier 1: Most Popular/Acclaimed (Ocarina, Heroes of Might Magic 3)
  MAIN_GAME_TIER = 800,     // Tier 2: Main games 
  DLC_EXPANSION_TIER = 600, // Tier 3: DLCs/Expansion Packs
  MOD_TIER = 400,           // Tier 4: Mods (if company allows)
  BUNDLE_ODDITY_TIER = 200  // Tier 5: Bundles/Oddities
}

interface Game {
  id: number;
  name: string;
  developer?: string;
  publisher?: string;
  category?: number;
  genres?: string[];
  summary?: string;
  rating?: number;
  igdb_rating?: number;
  metacritic_score?: number;
  user_rating_count?: number;
  follows?: number;
  hypes?: number;
  popularity?: number;
  first_release_date?: number;
}

interface FiveTierResult {
  tier: FiveTierPriority;
  score: number;
  reasons: string[];
  tierName: string;
}

/**
 * Acclaimed Games Database - Based on research of highest sales/ratings
 * These games get Tier 1 priority regardless of other factors
 */
const ACCLAIMED_GAMES_DATABASE = new Set([
  // Zelda Acclaimed Games (from research)
  'the legend of zelda: ocarina of time', 'ocarina of time',
  'the legend of zelda: breath of the wild', 'breath of the wild',
  'the legend of zelda: tears of the kingdom', 'tears of the kingdom',
  'the legend of zelda: a link to the past', 'a link to the past',
  'the legend of zelda: majoras mask', 'majoras mask',
  
  // Mario Acclaimed Games (from research) 
  'super mario galaxy', 'mario galaxy',
  'super mario galaxy 2', 'mario galaxy 2',
  'super mario odyssey', 'mario odyssey',
  'super mario bros. 3', 'mario bros. 3', 'mario 3',
  'super mario 64', 'mario 64',
  'super mario world', 'mario world',
  
  // Sonic Acclaimed Games (from research)
  'sonic adventure 2', 'sonic adventure 2: battle',
  'sonic mania', 'sonic the hedgehog 2', 'sonic 2',
  'sonic cd', 'sonic mania plus',
  'sonic generations', 'sonic the hedgehog (1991)',
  
  // Mega Man Acclaimed Games (from research)
  'mega man x', 'megaman x',
  'mega man 2', 'megaman 2', 'mega man ii',
  'mega man 3', 'megaman 3', 'mega man iii',
  'mega man x4', 'megaman x4',
  'mega man 11', 'megaman 11',
  
  // Strategy Game Acclaimed (from research)
  'heroes of might and magic iii', 'heroes of might and magic 3',
  'civilization ii', 'civilization 2', 'age of empires ii',
  
  // Additional Well-Known Acclaimed Games
  'tetris', 'pac-man', 'space invaders', 'donkey kong',
  'street fighter ii', 'final fantasy vii', 'final fantasy vi',
  'chrono trigger', 'half-life 2', 'portal', 'portal 2',
  'minecraft', 'grand theft auto: vice city', 'gta: san andreas',
  'the elder scrolls v: skyrim', 'skyrim', 'dark souls',
  'resident evil 4', 'metal gear solid', 'bioshock'
]);

/**
 * Check if a game is acclaimed (Tier 1)
 */
function isAcclaimedGame(game: Game): boolean {
  const normalized = game.name.toLowerCase().trim();
  
  // Check exact matches first
  if (ACCLAIMED_GAMES_DATABASE.has(normalized)) {
    return true;
  }
  
  // Check for partial matches with high confidence, but avoid false positives
  for (const acclaimedGame of ACCLAIMED_GAMES_DATABASE) {
    // Only check if one completely contains the other (bidirectional)
    if (normalized.includes(acclaimedGame) || acclaimedGame.includes(normalized)) {
      // Additional checks to avoid false positives like "Mega Man X" matching "Mega Man X8"
      const similarity = calculateStringSimilarity(normalized, acclaimedGame);
      
      // Require very high similarity AND avoid number mismatches
      if (similarity > 0.9) {
        // Check for number conflicts (e.g., "mega man x" vs "mega man x8")
        const gameNumbers = normalized.match(/\d+/g) || [];
        const acclaimedNumbers = acclaimedGame.match(/\d+/g) || [];
        
        // If either has numbers, they must match exactly (or both have no numbers)
        if (gameNumbers.length > 0 || acclaimedNumbers.length > 0) {
          const numbersMatch = gameNumbers.join('') === acclaimedNumbers.join('');
          if (!numbersMatch) {
            continue; // Skip this match due to number mismatch
          }
        }
        
        return true;
      }
    }
  }
  
  // Selective threshold for unlisted games - focus on truly exceptional titles
  // Metacritic is more reliable and gets lower threshold
  const hasExceptionalMetacritic = game.metacritic_score && game.metacritic_score >= 95;
  
  // IGDB requires higher threshold + engagement since it's less standardized
  const hasExceptionalIGDB = game.igdb_rating && game.igdb_rating >= 95 && 
                             ((game.follows && game.follows > 150000) || 
                              (game.user_rating_count && game.user_rating_count > 50000));
  
  return hasExceptionalMetacritic || hasExceptionalIGDB;
}

/**
 * Check if a game is a main game (Tier 2)
 */
function isMainGame(game: Game): boolean {
  // Category 0 = Main Game in IGDB
  if (game.category === 0) {
    return true;
  }
  
  // Category 4 = Standalone Expansion (also considered main)
  if (game.category === 4) {
    return true;
  }
  
  return false;
}

/**
 * Check if a game is DLC/Expansion (Tier 3)
 */
function isDLCExpansion(game: Game): boolean {
  // Category 1 = DLC/Add-on, Category 2 = Expansion (require base game)
  // Category 4 = Standalone Expansion (don't require base game - should be main games)
  if (game.category === 1 || game.category === 2) {
    return true;
  }
  
  // Category 4 is standalone expansion - should NOT be treated as DLC
  if (game.category === 4) {
    return false;
  }
  
  // Name-based detection for unlabeled DLC (only for category 0 or undefined)
  if (game.category !== undefined && game.category !== 0) {
    return false;
  }
  
  const gameName = game.name.toLowerCase();
  const dlcKeywords = ['dlc', 'expansion', 'add-on', 'addon', 'downloadable content'];
  
  return dlcKeywords.some(keyword => gameName.includes(keyword));
}

/**
 * Check if a game is a mod (Tier 4) and if it's allowed
 */
function isAllowedMod(game: Game): boolean {
  // Category 5 = Mod
  if (game.category !== 5) {
    return false;
  }
  
  // Check if the publisher/developer allows mods
  const developerLevel = getCompanyCopyrightLevel(game.developer || '');
  const publisherLevel = getCompanyCopyrightLevel(game.publisher || '');
  
  // Only allow mods from MOD_FRIENDLY companies
  return developerLevel === CopyrightLevel.MOD_FRIENDLY || 
         publisherLevel === CopyrightLevel.MOD_FRIENDLY;
}

/**
 * Check if a game is bundle/oddity (Tier 5)
 */
function isBundleOddity(game: Game): boolean {
  // Category 3 = Bundle/Pack
  if (game.category === 3) {
    return true;
  }
  
  // If game has a specific category (1, 2, 4, 5), don't override with name-based detection
  if (game.category === 1 || game.category === 2 || game.category === 4 || game.category === 5) {
    return false;
  }
  
  // Name-based detection for bundles (only for category 0 or undefined)
  const gameName = game.name.toLowerCase();
  const bundleKeywords = [
    'bundle', 'collection', 'anthology', 'compilation', 'pack',
    'all-stars', 'complete edition', 'ultimate edition', 'definitive edition',
    'trilogy', 'legacy collection', 'anniversary', 'remastered collection'
  ];
  
  return bundleKeywords.some(keyword => gameName.includes(keyword));
}

/**
 * Calculate detailed score within tier based on game quality
 */
function calculateTierScore(game: Game, baseTier: FiveTierPriority): number {
  let score = baseTier;
  
  // Rating bonuses
  if (game.metacritic_score) {
    if (game.metacritic_score >= 95) score += 50;      // Universal acclaim
    else if (game.metacritic_score >= 90) score += 40; // Critical masterpiece
    else if (game.metacritic_score >= 85) score += 30; // Highly acclaimed
    else if (game.metacritic_score >= 80) score += 20; // Well received
  } else if (game.igdb_rating) {
    if (game.igdb_rating >= 90) score += 40;
    else if (game.igdb_rating >= 85) score += 30;
    else if (game.igdb_rating >= 80) score += 20;
  }
  
  // Popularity bonuses
  if (game.follows) {
    if (game.follows > 100000) score += 30;      // Massive following
    else if (game.follows > 50000) score += 25;  // Large following
    else if (game.follows > 20000) score += 20;  // Strong following
    else if (game.follows > 10000) score += 15;  // Good following
  }
  
  if (game.user_rating_count) {
    if (game.user_rating_count > 10000) score += 25;
    else if (game.user_rating_count > 5000) score += 20;
    else if (game.user_rating_count > 1000) score += 15;
    else if (game.user_rating_count > 500) score += 10;
  }
  
  // Recency bonus for newer games
  if (game.first_release_date) {
    const releaseDate = new Date(game.first_release_date * 1000);
    const now = new Date();
    const yearsDiff = (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    if (yearsDiff <= 2) score += 15; // Recent release
    else if (yearsDiff <= 5) score += 10; // Modern era
  }
  
  return Math.round(score);
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
 * Calculate Levenshtein distance
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
 * Calculate game priority using the 5-tier system
 */
export function calculateFiveTierPriority(game: Game): FiveTierResult {
  const reasons: string[] = [];
  let tier: FiveTierPriority;
  let tierName: string;
  
  // Category-based classification takes precedence over acclaim for bundles and DLC
  // Tier 5: Bundles/Oddities (Category 3 always goes here)
  if (isBundleOddity(game)) {
    tier = FiveTierPriority.BUNDLE_ODDITY_TIER;
    tierName = "BUNDLE/ODDITY";
    reasons.push("Bundle, collection, or oddity content");
  }
  // Tier 3: DLCs/Expansion Packs (Category 1/2 always goes here)
  else if (isDLCExpansion(game)) {
    tier = FiveTierPriority.DLC_EXPANSION_TIER;
    tierName = "DLC/EXPANSION";
    reasons.push("Official DLC or expansion content");
  }
  // Tier 4: Mods (Category 5 if company allows)
  else if (isAllowedMod(game)) {
    tier = FiveTierPriority.MOD_TIER;
    tierName = "MOD (ALLOWED)";
    reasons.push("Mod from company that allows community content");
  }
  // Tier 1: Most Popular/Acclaimed games (only for main games)
  else if (isAcclaimedGame(game)) {
    tier = FiveTierPriority.ACCLAIMED_TIER;
    tierName = "ACCLAIMED";
    reasons.push("Highly acclaimed game with exceptional ratings/sales");
  }
  // Tier 2: Main games
  else if (isMainGame(game)) {
    tier = FiveTierPriority.MAIN_GAME_TIER;
    tierName = "MAIN GAME";
    reasons.push("Main game entry in series/franchise");
  }
  // Default: Main game tier for unclassified content
  else {
    tier = FiveTierPriority.MAIN_GAME_TIER;
    tierName = "MAIN GAME";
    reasons.push("Default main game classification");
  }
  
  // Calculate detailed score within tier
  const score = calculateTierScore(game, tier);
  
  return {
    tier,
    score,
    reasons,
    tierName
  };
}

/**
 * Sort games using the 5-tier priority system
 */
export function sortGamesByFiveTier(games: Game[]): Game[] {
  return [...games].sort((a, b) => {
    const aPriority = calculateFiveTierPriority(a);
    const bPriority = calculateFiveTierPriority(b);
    
    // Primary sort: by tier score (higher is better)
    if (aPriority.score !== bPriority.score) {
      return bPriority.score - aPriority.score;
    }
    
    // Secondary sort: by rating if available
    const aRating = a.metacritic_score || a.igdb_rating || a.rating || 0;
    const bRating = b.metacritic_score || b.igdb_rating || b.rating || 0;
    if (aRating !== bRating) {
      return bRating - aRating;
    }
    
    // Tertiary sort: by popularity metrics
    const aPopularity = (a.follows || 0) + (a.user_rating_count || 0) + (a.popularity || 0);
    const bPopularity = (b.follows || 0) + (b.user_rating_count || 0) + (b.popularity || 0);
    if (aPopularity !== bPopularity) {
      return bPopularity - aPopularity;
    }
    
    // Final sort: alphabetical
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get priority statistics for analyzing search results
 */
export function getFiveTierStats(games: Game[]) {
  const priorities = games.map(game => calculateFiveTierPriority(game));
  
  return {
    totalGames: games.length,
    acclaimedTier: priorities.filter(p => p.tier === FiveTierPriority.ACCLAIMED_TIER).length,
    mainGameTier: priorities.filter(p => p.tier === FiveTierPriority.MAIN_GAME_TIER).length,
    dlcExpansionTier: priorities.filter(p => p.tier === FiveTierPriority.DLC_EXPANSION_TIER).length,
    modTier: priorities.filter(p => p.tier === FiveTierPriority.MOD_TIER).length,
    bundleOddityTier: priorities.filter(p => p.tier === FiveTierPriority.BUNDLE_ODDITY_TIER).length,
    averageScore: priorities.reduce((sum, p) => sum + p.score, 0) / priorities.length,
    topGames: priorities
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(p => ({ 
        name: games.find(g => calculateFiveTierPriority(g).score === p.score)?.name || 'Unknown',
        tier: p.tierName,
        score: p.score 
      }))
  };
}

/**
 * Debug function to analyze a specific game's 5-tier priority
 */
export function debugFiveTierPriority(game: Game): void {
  console.log(`🎯 5-TIER ANALYSIS: "${game.name}"`);
  
  const result = calculateFiveTierPriority(game);
  
  console.log(`   Tier: ${result.tierName} (${result.tier})`);
  console.log(`   Score: ${result.score}`);
  console.log(`   Category: ${game.category || 'N/A'}`);
  console.log(`   Developer: ${game.developer || 'N/A'}`);
  console.log(`   Publisher: ${game.publisher || 'N/A'}`);
  console.log(`   Metacritic: ${game.metacritic_score || 'N/A'}`);
  console.log(`   IGDB Rating: ${game.igdb_rating || 'N/A'}`);
  console.log(`   Popularity: ${game.popularity || 'N/A'}`);
  
  if (result.reasons.length > 0) {
    console.log(`   Reasons: ${result.reasons.join(', ')}`);
  }
  
  console.log('---');
}

/**
 * Test the 5-tier priority system with sample games
 */
export function testFiveTierSystem(): void {
  console.log('🧪 Testing 5-Tier Priority System...\n');
  
  const testGames: Game[] = [
    // Tier 1: Acclaimed
    {
      id: 1,
      name: "The Legend of Zelda: Ocarina of Time",
      developer: "Nintendo EAD",
      publisher: "Nintendo",
      category: 0,
      metacritic_score: 99,
      follows: 250000,
      user_rating_count: 75000
    },
    {
      id: 2,
      name: "Super Mario Galaxy",
      developer: "Nintendo EAD Tokyo",
      publisher: "Nintendo", 
      category: 0,
      metacritic_score: 97,
      follows: 180000,
      user_rating_count: 45000
    },
    
    // Tier 2: Main Game
    {
      id: 3,
      name: "Mario Kart 8 Deluxe",
      developer: "Nintendo EPD",
      publisher: "Nintendo",
      category: 0,
      igdb_rating: 92,
      follows: 120000
    },
    
    // Tier 3: DLC/Expansion
    {
      id: 4,
      name: "The Legend of Zelda: Breath of the Wild - The Champions' Ballad",
      developer: "Nintendo EPD", 
      publisher: "Nintendo",
      category: 1, // DLC
      igdb_rating: 88
    },
    
    // Tier 4: Allowed Mod
    {
      id: 5,
      name: "Skyrim: Beyond Skyrim - Bruma",
      developer: "Beyond Skyrim Team",
      publisher: "Bethesda Game Studios",
      category: 5, // Mod
      user_rating_count: 5000
    },
    
    // Tier 5: Bundle
    {
      id: 6,
      name: "Super Mario 3D All-Stars",
      developer: "Nintendo EPD",
      publisher: "Nintendo",
      category: 3, // Bundle
      igdb_rating: 83
    }
  ];
  
  console.log('🎮 Test Games (unsorted):');
  testGames.forEach((game, index) => {
    console.log(`${index + 1}. ${game.name}`);
  });
  
  console.log('\n🔍 Priority Analysis:');
  testGames.forEach(game => debugFiveTierPriority(game));
  
  const sortedGames = sortGamesByFiveTier(testGames);
  
  console.log('\n🏆 Sorted by 5-Tier Priority:');
  sortedGames.forEach((game, index) => {
    const priority = calculateFiveTierPriority(game);
    console.log(`${index + 1}. ${game.name} (${priority.tierName}: ${priority.score})`);
  });
  
  const stats = getFiveTierStats(testGames);
  console.log('\n📊 5-Tier Statistics:');
  console.log(`   Total Games: ${stats.totalGames}`);
  console.log(`   Acclaimed (Tier 1): ${stats.acclaimedTier}`);
  console.log(`   Main Games (Tier 2): ${stats.mainGameTier}`);
  console.log(`   DLC/Expansions (Tier 3): ${stats.dlcExpansionTier}`);
  console.log(`   Mods (Tier 4): ${stats.modTier}`);
  console.log(`   Bundles/Oddities (Tier 5): ${stats.bundleOddityTier}`);
  console.log(`   Average Score: ${stats.averageScore.toFixed(1)}`);
  
  console.log('\n✅ 5-Tier system test completed!');
}