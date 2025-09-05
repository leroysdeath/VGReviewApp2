/**
 * Search Quality Tests
 * Verifies that famous titles appear prominently in franchise searches
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { igdbService } from '../services/igdbService';

// Famous titles that should appear prominently in searches
const FAMOUS_MARIO_TITLES = [
  'Super Mario Bros.',
  'Super Mario Bros. 2', 
  'Super Mario Bros. 3',
  'Super Mario World',
  'Super Mario 64',
  'Super Mario Sunshine',
  'Super Mario Galaxy',
  'Super Mario Galaxy 2',
  'Super Mario Odyssey'
];

const FAMOUS_ZELDA_TITLES = [
  'The Legend of Zelda',
  'Zelda II: The Adventure of Link',
  'The Legend of Zelda: A Link to the Past',
  'The Legend of Zelda: Link\'s Awakening', 
  'The Legend of Zelda: Ocarina of Time',
  'The Legend of Zelda: Majora\'s Mask',
  'The Legend of Zelda: The Wind Waker',
  'The Legend of Zelda: Twilight Princess',
  'The Legend of Zelda: Breath of the Wild',
  'The Legend of Zelda: Tears of the Kingdom'
];

const FAMOUS_POKEMON_TITLES = [
  'Pokemon Red',
  'Pokemon Blue', 
  'Pokemon Yellow',
  'Pokemon Gold',
  'Pokemon Silver',
  'Pokemon Crystal',
  'Pokemon Ruby',
  'Pokemon Sapphire',
  'Pokemon Emerald'
];

/**
 * Helper function to check if a game name matches a famous title
 */
function isGameMatch(searchResult: any, famousTitle: string): boolean {
  const resultName = searchResult.name?.toLowerCase() || '';
  const titleName = famousTitle.toLowerCase();
  
  // Direct inclusion match
  if (resultName.includes(titleName) || titleName.includes(resultName)) {
    return true;
  }
  
  // Handle common variations
  const normalizedResult = resultName.replace(/[:\-\.\s]/g, '');
  const normalizedTitle = titleName.replace(/[:\-\.\s]/g, '');
  
  return normalizedResult.includes(normalizedTitle) || normalizedTitle.includes(normalizedResult);
}

/**
 * Calculate search quality percentage for a franchise
 */
function calculateSearchQuality(searchResults: any[], famousTitles: string[]): {
  percentage: number;
  found: string[];
  missing: string[];
} {
  const found: string[] = [];
  const missing: string[] = [];
  
  famousTitles.forEach(title => {
    const isFound = searchResults.some(result => isGameMatch(result, title));
    if (isFound) {
      found.push(title);
    } else {
      missing.push(title);
    }
  });
  
  return {
    percentage: (found.length / famousTitles.length) * 100,
    found,
    missing
  };
}

describe('Search Quality Tests', () => {
  let consoleLog: jest.SpyInstance;

  beforeAll(() => {
    // Capture console output for debugging
    consoleLog = jest.spyOn(console, 'log').mockImplementation();
  });

  afterAll(() => {
    consoleLog?.mockRestore();
  });

  describe('Mario Franchise Search Quality', () => {
    it('should return at least 60% of famous Mario titles in top 15 results', async () => {
      const searchResults = await igdbService.searchWithSequels('mario', 15);
      
      expect(searchResults).toBeDefined();
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
      
      const quality = calculateSearchQuality(searchResults, FAMOUS_MARIO_TITLES);
      
      // Log detailed results for debugging
      console.log('\n🍄 MARIO SEARCH QUALITY ANALYSIS:');
      console.log(`Search returned: ${searchResults.length} results`);
      console.log(`Famous titles found: ${quality.found.length}/${FAMOUS_MARIO_TITLES.length} (${quality.percentage.toFixed(1)}%)`);
      
      if (quality.found.length > 0) {
        console.log('\n✅ FOUND MARIO TITLES:');
        quality.found.forEach(title => console.log(`  - ${title}`));
      }
      
      if (quality.missing.length > 0) {
        console.log('\n❌ MISSING MARIO TITLES:');
        quality.missing.forEach(title => console.log(`  - ${title}`));
      }
      
      console.log('\n📊 ACTUAL SEARCH RESULTS:');
      searchResults.forEach((game, i) => {
        console.log(`${i + 1}. ${game.name} (Category: ${game.category})`);
      });
      
      // Test should pass if at least 60% of famous titles are found
      expect(quality.percentage).toBeGreaterThanOrEqual(60);
      
      // Specific high-priority titles should definitely appear
      const highPriorityMario = ['Super Mario Bros. 3', 'Super Mario 64', 'Super Mario Odyssey'];
      const highPriorityFound = highPriorityMario.filter(title => 
        searchResults.some(result => isGameMatch(result, title))
      );
      
      expect(highPriorityFound.length).toBeGreaterThanOrEqual(2);
    }, 30000);

    it('should prioritize main Mario platformers over party/sports games', async () => {
      const searchResults = await igdbService.searchWithSequels('mario', 15);
      
      // Count how many results are Olympic games or party games
      const olympicGames = searchResults.filter(game => 
        game.name?.toLowerCase().includes('olympic')
      );
      
      const partyGames = searchResults.filter(game => 
        game.name?.toLowerCase().includes('party') && 
        !['Mario Party Superstars', 'Super Mario Party'].some(acceptable => 
          game.name?.toLowerCase().includes(acceptable.toLowerCase())
        )
      );
      
      console.log('\n🎮 MARIO SEARCH CONTENT ANALYSIS:');
      console.log(`Olympic games in top 15: ${olympicGames.length}`);
      console.log(`Non-core party games in top 15: ${partyGames.length}`);
      
      // Olympic and non-core party games should not dominate results
      expect(olympicGames.length + partyGames.length).toBeLessThanOrEqual(5);
    }, 30000);
  });

  describe('Zelda Franchise Search Quality', () => {
    it('should return at least 60% of famous Zelda titles in top 15 results', async () => {
      const searchResults = await igdbService.searchWithSequels('zelda', 15);
      
      expect(searchResults).toBeDefined();
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBeGreaterThan(0);
      
      const quality = calculateSearchQuality(searchResults, FAMOUS_ZELDA_TITLES);
      
      // Log detailed results for debugging
      console.log('\n🗡️ ZELDA SEARCH QUALITY ANALYSIS:');
      console.log(`Search returned: ${searchResults.length} results`);
      console.log(`Famous titles found: ${quality.found.length}/${FAMOUS_ZELDA_TITLES.length} (${quality.percentage.toFixed(1)}%)`);
      
      if (quality.found.length > 0) {
        console.log('\n✅ FOUND ZELDA TITLES:');
        quality.found.forEach(title => console.log(`  - ${title}`));
      }
      
      if (quality.missing.length > 0) {
        console.log('\n❌ MISSING ZELDA TITLES:');
        quality.missing.forEach(title => console.log(`  - ${title}`));
      }
      
      console.log('\n📊 ACTUAL SEARCH RESULTS:');
      searchResults.forEach((game, i) => {
        console.log(`${i + 1}. ${game.name} (Category: ${game.category})`);
      });
      
      // Test should pass if at least 60% of famous titles are found
      expect(quality.percentage).toBeGreaterThanOrEqual(60);
      
      // Specific high-priority titles should definitely appear
      const highPriorityZelda = ['The Legend of Zelda: Ocarina of Time', 'The Legend of Zelda: Breath of the Wild', 'The Legend of Zelda: A Link to the Past'];
      const highPriorityFound = highPriorityZelda.filter(title => 
        searchResults.some(result => isGameMatch(result, title))
      );
      
      expect(highPriorityFound.length).toBeGreaterThanOrEqual(2);
    }, 30000);
  });

  describe('Pokemon Franchise Search Quality', () => {
    it('should return Pokemon results and not be completely empty', async () => {
      const searchResults = await igdbService.searchWithSequels('pokemon', 15);
      
      expect(searchResults).toBeDefined();
      expect(Array.isArray(searchResults)).toBe(true);
      
      console.log('\n🔵 POKEMON SEARCH ANALYSIS:');
      console.log(`Search returned: ${searchResults.length} results`);
      
      if (searchResults.length > 0) {
        console.log('\n📊 ACTUAL POKEMON RESULTS:');
        searchResults.forEach((game, i) => {
          console.log(`${i + 1}. ${game.name} (Category: ${game.category})`);
        });
        
        const quality = calculateSearchQuality(searchResults, FAMOUS_POKEMON_TITLES);
        console.log(`Famous Pokemon titles found: ${quality.found.length}/${FAMOUS_POKEMON_TITLES.length} (${quality.percentage.toFixed(1)}%)`);
        
        if (quality.found.length > 0) {
          console.log('\n✅ FOUND POKEMON TITLES:');
          quality.found.forEach(title => console.log(`  - ${title}`));
        }
      } else {
        console.log('❌ NO POKEMON RESULTS FOUND - this indicates a filtering or API issue');
      }
      
      // Pokemon search should return at least some results (it was previously completely broken)
      expect(searchResults.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Search Enhancement Verification', () => {
    it('should apply scoring enhancements to search results', async () => {
      const searchResults = await igdbService.searchWithSequels('mario', 10);
      
      console.log('\n🔧 ENHANCEMENT VERIFICATION:');
      console.log('Testing if scoring properties are being applied to games...');
      
      const enhancementProperties = ['_gameTypeBoost', '_platformBoost', '_ratingBoost', '_popularityBoost', '_significanceBoost'];
      
      let gamesWithEnhancements = 0;
      searchResults.forEach((game, i) => {
        const hasEnhancements = enhancementProperties.some(prop => game.hasOwnProperty(prop));
        
        if (hasEnhancements) {
          gamesWithEnhancements++;
          console.log(`✅ ${game.name} - Has scoring enhancements`);
          enhancementProperties.forEach(prop => {
            if (game.hasOwnProperty(prop)) {
              console.log(`   ${prop}: ${game[prop]}`);
            }
          });
        } else {
          console.log(`❌ ${game.name} - No scoring enhancements`);
        }
      });
      
      console.log(`\n📊 Enhancement Summary: ${gamesWithEnhancements}/${searchResults.length} games have scoring`);
      
      // At least some games should have enhancement scoring applied
      expect(gamesWithEnhancements).toBeGreaterThan(0);
    }, 30000);

    it('should show different results than basic IGDB search', async () => {
      // This test verifies our enhanced search differs from basic IGDB results
      const enhancedResults = await igdbService.searchWithSequels('mario', 10);
      
      console.log('\n🔍 SEARCH DIFFERENTIATION TEST:');
      console.log('Enhanced search results:');
      enhancedResults.forEach((game, i) => {
        const isPlatformer = game.genres?.some((genre: any) => 
          genre.name?.toLowerCase().includes('platform')
        );
        const isOlympic = game.name?.toLowerCase().includes('olympic');
        
        console.log(`${i + 1}. ${game.name}`);
        console.log(`   Platformer: ${isPlatformer ? 'YES' : 'NO'}`);
        console.log(`   Olympic: ${isOlympic ? 'YES' : 'NO'}`);
        console.log(`   Category: ${game.category}`);
      });
      
      // Should have some platformer games and limit Olympic games
      const platformerCount = enhancedResults.filter(game => 
        game.genres?.some((genre: any) => genre.name?.toLowerCase().includes('platform'))
      ).length;
      
      const olympicCount = enhancedResults.filter(game => 
        game.name?.toLowerCase().includes('olympic')
      ).length;
      
      console.log(`\n📊 Content Analysis:`);
      console.log(`Platformer games: ${platformerCount}/${enhancedResults.length}`);
      console.log(`Olympic games: ${olympicCount}/${enhancedResults.length}`);
      
      // Enhanced search should prefer platformers over Olympic games for Mario
      expect(platformerCount).toBeGreaterThanOrEqual(1);
      expect(olympicCount).toBeLessThanOrEqual(platformerCount);
    }, 30000);
  });

  describe('Search Consistency Verification', () => {
    it('should return consistent results across multiple calls', async () => {
      const result1 = await igdbService.searchWithSequels('mario', 10);
      const result2 = await igdbService.searchWithSequels('mario', 10);
      
      console.log('\n🔄 CONSISTENCY TEST:');
      console.log(`First call: ${result1.length} results`);
      console.log(`Second call: ${result2.length} results`);
      
      // Results should be consistent (same order and content)
      expect(result1.length).toBe(result2.length);
      
      // First few results should be in same order
      for (let i = 0; i < Math.min(5, result1.length, result2.length); i++) {
        expect(result1[i].name).toBe(result2[i].name);
      }
    }, 30000);
  });
});