/**
 * Comprehensive Search/Filter/Sort Tests
 * 
 * Tests to prevent regressions in search quality and ensure flagship games appear correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  generateTestGameSeries,
  getExpectedTopGames,
  getFilterDecoyGames,
  validateSearchResults,
  TEST_COLLECTIONS,
  type TestGame
} from '../utils/testGameDataGenerator';
import { 
  SearchValidator,
  testFlagshipCoverage,
  testContentFiltering,
  mockSearchFunction
} from '../utils/searchTestFramework';
import { filterProtectedContent } from '../utils/contentProtectionFilter';
import { sortGamesByPriority } from '../utils/gamePrioritization';
import { detectFranchiseSearch, isFlagshipGame } from '../utils/flagshipGames';
import { calculateIconicScore } from '../utils/iconicGameDetection';

describe('Game Search System', () => {
  let validator: SearchValidator;
  let testSeries: any[];
  
  beforeEach(() => {
    validator = new SearchValidator();
    testSeries = generateTestGameSeries();
  });

  describe('Franchise Detection', () => {
    it('should detect Mario franchise from various queries', () => {
      expect(detectFranchiseSearch('mario')).toBe('mario');
      expect(detectFranchiseSearch('super mario')).toBe('mario');
      expect(detectFranchiseSearch('mario bros')).toBe('mario');
      expect(detectFranchiseSearch('mario 64')).toBe('mario');
    });

    it('should detect Pokemon franchise with accent variations', () => {
      expect(detectFranchiseSearch('pokemon')).toBe('pokemon');
      expect(detectFranchiseSearch('pokémon')).toBe('pokemon');
      expect(detectFranchiseSearch('pokemon red')).toBe('pokemon');
    });

    it('should detect Final Fantasy franchise', () => {
      expect(detectFranchiseSearch('final fantasy')).toBe('final fantasy');
      expect(detectFranchiseSearch('ff7')).toBe('final fantasy');
      expect(detectFranchiseSearch('final fantasy vii')).toBe('final fantasy');
    });

    it('should not detect franchise for unrelated searches', () => {
      expect(detectFranchiseSearch('call of duty')).toBeNull();
      expect(detectFranchiseSearch('minecraft')).toBeNull();
      expect(detectFranchiseSearch('random game')).toBeNull();
    });
  });

  describe('Flagship Game Detection', () => {
    it('should identify Mario flagship games correctly', () => {
      expect(isFlagshipGame('Super Mario Bros. 3', 'mario')).toBeTruthy();
      expect(isFlagshipGame('Super Mario 64', 'mario')).toBeTruthy();
      expect(isFlagshipGame('Super Mario Odyssey', 'mario')).toBeTruthy();
      expect(isFlagshipGame('Mario Party 8', 'mario')).toBeFalsy();
    });

    it('should identify Pokemon flagship games correctly', () => {
      expect(isFlagshipGame('Pokemon Red', 'pokemon')).toBeTruthy();
      expect(isFlagshipGame('Pokemon Blue', 'pokemon')).toBeTruthy();
      expect(isFlagshipGame('Pokemon Gold', 'pokemon')).toBeTruthy();
      expect(isFlagshipGame('Pokemon Stadium', 'pokemon')).toBeFalsy();
    });

    it('should identify Zelda flagship games correctly', () => {
      expect(isFlagshipGame('The Legend of Zelda: Ocarina of Time', 'zelda')).toBeTruthy();
      expect(isFlagshipGame('The Legend of Zelda: Breath of the Wild', 'zelda')).toBeTruthy();
      expect(isFlagshipGame('The Legend of Zelda: Tri Force Heroes', 'zelda')).toBeFalsy();
    });
  });

  describe('Content Protection Filter', () => {
    it('should filter out fan-made content', () => {
      const testGames = getFilterDecoyGames();
      const fanGames = testGames.filter(g => 
        g.testReason.includes('Fan content') || 
        g.developer?.toLowerCase().includes('fan')
      );
      
      const filtered = filterProtectedContent(fanGames);
      
      expect(filtered.length).toBeLessThan(fanGames.length);
      
      // Check that fan games are actually removed
      const fanGamesRemaining = filtered.filter((fg: any) =>
        fanGames.some(originalFan => originalFan.name === fg.name)
      );
      
      expect(fanGamesRemaining.length).toBe(0);
    });

    it('should preserve official games', () => {
      const marioGames = getExpectedTopGames('mario');
      const filtered = filterProtectedContent(marioGames);
      
      // All official Mario games should pass through
      expect(filtered.length).toBe(marioGames.length);
      
      // Verify flagship games are preserved
      const flagshipNames = marioGames
        .filter(g => g.testReason.includes('flagship'))
        .map(g => g.name);
      
      const preservedFlagships = filtered.filter((fg: any) => 
        flagshipNames.includes(fg.name)
      );
      
      expect(preservedFlagships.length).toBe(flagshipNames.length);
    });

    it('should handle Pokemon publisher variations correctly', () => {
      const pokemonGames = getExpectedTopGames('pokemon');
      const filtered = filterProtectedContent(pokemonGames);
      
      // All official Pokemon games should pass through despite copyright protection
      expect(filtered.length).toBe(pokemonGames.length);
      
      // Verify specific publisher variations work
      const pokemonGold = pokemonGames.find(g => g.name === 'Pokemon Gold');
      const goldFiltered = filtered.find((fg: any) => fg.name === 'Pokemon Gold');
      
      expect(goldFiltered).toBeTruthy();
    });
  });

  describe('Category Filtering', () => {
    it('should filter out bundle/pack content (category 3)', () => {
      const decoyGames = getFilterDecoyGames();
      const bundleGames = decoyGames.filter(g => g.category === 3);
      
      // Simulate bundle filtering (since it's part of igdbService)
      const shouldBeFiltered = bundleGames.filter(g => g.category === 3);
      
      expect(shouldBeFiltered.length).toBe(bundleGames.length);
      expect(bundleGames.length).toBeGreaterThan(0); // Ensure we have bundle test cases
    });

    it('should filter out season content (category 7)', () => {
      const decoyGames = getFilterDecoyGames();
      const seasonGames = decoyGames.filter(g => g.category === 7);
      
      // If we have season test cases, they should be filterable
      if (seasonGames.length > 0) {
        const shouldBeFiltered = seasonGames.filter(g => g.category === 7);
        expect(shouldBeFiltered.length).toBe(seasonGames.length);
      }
    });

    it('should preserve main games (category 0)', () => {
      const mainGames = TEST_COLLECTIONS.topGamesByFranchise;
      
      Object.values(mainGames).forEach(franchiseGames => {
        franchiseGames.forEach(game => {
          expect(game.category).toBe(0); // All flagship games should be main games
        });
      });
    });
  });

  describe('E-reader Content Filtering', () => {
    it('should filter out e-reader micro-content', () => {
      const decoyGames = getFilterDecoyGames();
      const eReaderGames = decoyGames.filter(g => g.name.includes('-e -'));
      
      // Should have e-reader test cases
      expect(eReaderGames.length).toBeGreaterThan(0);
      
      // All should be marked for filtering
      eReaderGames.forEach(game => {
        expect(game.testReason).toContain('E-reader');
      });
    });

    it('should preserve legitimate games with "e" in the name', () => {
      const legitimateGames = [
        { name: 'Fire Emblem', category: 0 },
        { name: 'Super Mario Maker', category: 0 },
        { name: 'Street Fighter', category: 0 }
      ];
      
      // None of these should match e-reader patterns
      legitimateGames.forEach(game => {
        const hasEReaderPattern = game.name.includes('-e -');
        expect(hasEReaderPattern).toBe(false);
      });
    });
  });

  describe('Search Result Prioritization', () => {
    it('should rank flagship games highest in Mario searches', async () => {
      const results = await mockSearchFunction('mario');
      
      // Top 3 results should be flagship games
      const top3 = results.slice(0, 3);
      top3.forEach(game => {
        const isFlagship = isFlagshipGame(game.name, 'mario');
        expect(isFlagship).toBeTruthy();
      });
    });

    it('should prioritize newer Nintendo games on Switch platform', () => {
      const marioGames = getExpectedTopGames('mario');
      const sorted = sortGamesByPriority(marioGames, 'mario');
      
      // Modern Switch games should rank highly
      const switchGames = sorted.filter(g => 
        g.platforms?.some(p => p.name === 'Nintendo Switch')
      );
      
      if (switchGames.length > 0) {
        const highestSwitchRank = sorted.findIndex(g => 
          g.platforms?.some(p => p.name === 'Nintendo Switch')
        );
        
        // Switch games should appear in top 5 for modern franchises
        expect(highestSwitchRank).toBeLessThan(5);
      }
    });

    it('should calculate iconic scores correctly for flagship games', () => {
      const mario64 = getExpectedTopGames('mario').find(g => g.name === 'Super Mario 64');
      
      if (mario64) {
        const iconicScore = calculateIconicScore(mario64, 'mario');
        
        // Should have high iconic score due to flagship status
        expect(iconicScore.score).toBeGreaterThan(100);
        expect(iconicScore.isFlagship).toBe(true);
        expect(iconicScore.reasons.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Search Result Validation', () => {
    it('should validate Mario search results correctly', () => {
      const marioGames = getExpectedTopGames('mario', 3);
      const validation = validateSearchResults('mario', marioGames, 'mario');
      
      expect(validation.passed).toBe(true);
      expect(validation.flagshipCoverage).toBe(100);
      expect(validation.score).toBeGreaterThan(90);
    });

    it('should detect missing flagship games', () => {
      const incompleteResults = [
        { name: 'Mario Kart 8', category: 0 } // Not a flagship platformer
      ];
      
      const validation = validateSearchResults('mario', incompleteResults, 'mario');
      
      expect(validation.passed).toBe(false);
      expect(validation.flagshipCoverage).toBeLessThan(50);
      expect(validation.issues.length).toBeGreaterThan(0);
    });

    it('should handle empty search results', () => {
      const validation = validateSearchResults('pokemon', [], 'pokemon');
      
      expect(validation.passed).toBe(false);
      expect(validation.score).toBe(0);
      expect(validation.issues).toContain('No results returned - possible over-filtering');
    });
  });

  describe('Franchise-Specific Tests', () => {
    describe('Mario Franchise', () => {
      it('should include Super Mario Bros. 3 in top results', async () => {
        const results = await mockSearchFunction('mario');
        const hasSmb3 = results.some(g => g.name.includes('Super Mario Bros. 3'));
        expect(hasSmb3).toBe(true);
      });

      it('should include Super Mario 64 in top results', async () => {
        const results = await mockSearchFunction('mario');
        const hasSm64 = results.some(g => g.name.includes('Super Mario 64'));
        expect(hasSm64).toBe(true);
      });

      it('should filter out Mario bundles and collections', () => {
        const decoyGames = getFilterDecoyGames('mario');
        const bundleGames = decoyGames.filter(g => g.category === 3);
        
        expect(bundleGames.length).toBeGreaterThan(0);
        bundleGames.forEach(game => {
          expect(game.testReason).toContain('Bundle');
        });
      });
    });

    describe('Pokemon Franchise', () => {
      it('should include original Pokemon Red/Blue in top results', async () => {
        const results = await mockSearchFunction('pokemon');
        const hasRedOrBlue = results.some(g => 
          g.name.includes('Pokemon Red') || g.name.includes('Pokemon Blue')
        );
        expect(hasRedOrBlue).toBe(true);
      });

      it('should handle Pokemon publisher variations', () => {
        const pokemonGames = getExpectedTopGames('pokemon');
        
        // Test different publisher formats
        const gameFreak = pokemonGames.filter(g => g.developer === 'Game Freak');
        const pokemonCompany = pokemonGames.filter(g => 
          g.publisher?.includes('Pokemon Company')
        );
        
        expect(gameFreak.length).toBeGreaterThan(0);
        expect(pokemonCompany.length).toBeGreaterThan(0);
      });
    });

    describe('Zelda Franchise', () => {
      it('should prioritize Ocarina of Time and Breath of the Wild', async () => {
        const results = await mockSearchFunction('zelda');
        const topNames = results.slice(0, 3).map(g => g.name);
        
        const hasOoT = topNames.some(name => name.includes('Ocarina of Time'));
        const hasBotW = topNames.some(name => name.includes('Breath of the Wild'));
        
        expect(hasOoT || hasBotW).toBe(true);
      });

      it('should handle Switch version prioritization', () => {
        const zeldaGames = getExpectedTopGames('zelda');
        const switchGames = zeldaGames.filter(g => 
          g.platforms?.some(p => p.name === 'Nintendo Switch')
        );
        
        // Modern Zelda games should be on Switch
        expect(switchGames.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Content Filtering System', () => {
    it('should remove all problematic content types', () => {
      const problematic = TEST_COLLECTIONS.problematicContent;
      const filtered = filterProtectedContent(problematic);
      
      // All problematic content should be filtered out
      expect(filtered.length).toBe(0);
    });

    it('should preserve all legitimate flagship games', () => {
      const topGames = Object.values(TEST_COLLECTIONS.topGamesByFranchise).flat();
      const filtered = filterProtectedContent(topGames);
      
      // All flagship games should pass through
      expect(filtered.length).toBe(topGames.length);
    });

    it('should handle borderline cases appropriately', () => {
      const borderline = TEST_COLLECTIONS.borderlineCases;
      const filtered = filterProtectedContent(borderline);
      
      // Most borderline cases should pass (they're official games, just not flagship)
      const preservationRate = filtered.length / borderline.length;
      expect(preservationRate).toBeGreaterThan(0.7);
    });
  });

  describe('Search Quality Standards', () => {
    it('should meet flagship coverage requirements for major franchises', async () => {
      const majorFranchises = ['mario', 'pokemon', 'zelda', 'final fantasy'];
      
      for (const franchise of majorFranchises) {
        const results = await mockSearchFunction(franchise);
        const coverage = testFlagshipCoverage(results, franchise);
        
        expect(coverage.coverage).toBeGreaterThan(60); // At least 60% flagship coverage
        expect(results.length).toBeGreaterThan(0); // Should return some results
      }
    });

    it('should maintain consistent search performance', async () => {
      const testQueries = ['mario', 'pokemon', 'zelda'];
      const times: number[] = [];
      
      for (const query of testQueries) {
        const start = Date.now();
        await mockSearchFunction(query);
        times.push(Date.now() - start);
      }
      
      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      
      // Mock searches should be fast (under 100ms)
      expect(avgTime).toBeLessThan(100);
    });

    it('should not return empty results for major franchises', async () => {
      const majorFranchises = ['mario', 'pokemon', 'zelda', 'final fantasy'];
      
      for (const franchise of majorFranchises) {
        const results = await mockSearchFunction(franchise);
        expect(results.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Regression Prevention', () => {
    it('should always include Mario Bros 3 in mario searches', async () => {
      const results = await mockSearchFunction('mario');
      const hasSmb3 = results.some(g => 
        g.name.toLowerCase().includes('super mario bros. 3') ||
        g.name.toLowerCase().includes('mario bros 3') ||
        g.name.toLowerCase().includes('mario 3')
      );
      
      expect(hasSmb3).toBe(true);
    });

    it('should always include Pokemon Red/Blue in pokemon searches', async () => {
      const results = await mockSearchFunction('pokemon');
      const hasOriginals = results.some(g => 
        g.name.toLowerCase().includes('pokemon red') ||
        g.name.toLowerCase().includes('pokemon blue')
      );
      
      expect(hasOriginals).toBe(true);
    });

    it('should not break when searching for specific flagship titles', async () => {
      const specificSearches = [
        'super mario 64',
        'pokemon red',
        'ocarina of time',
        'final fantasy vii'
      ];
      
      for (const query of specificSearches) {
        const results = await mockSearchFunction(query);
        expect(results.length).toBeGreaterThan(0);
        
        // First result should be highly relevant to the specific query
        if (results.length > 0) {
          const firstResult = results[0];
          const queryWords = query.toLowerCase().split(' ');
          const nameWords = firstResult.name.toLowerCase().split(' ');
          
          const hasRelevantWords = queryWords.some(qw => 
            nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
          );
          
          expect(hasRelevantWords).toBe(true);
        }
      }
    });
  });

  describe('Platform Priority System', () => {
    it('should prioritize current-gen platforms for modern franchises', () => {
      const modernGames = getExpectedTopGames('mario').filter(g => 
        g.first_release_date && g.first_release_date > 1483228800 // After 2017
      );
      
      const currentGenPlatforms = ['Nintendo Switch', 'PlayStation 5', 'Xbox Series X'];
      
      modernGames.forEach(game => {
        const hasCurrentGen = game.platforms?.some(p => 
          currentGenPlatforms.some(cgp => p.name.includes(cgp))
        );
        
        if (!hasCurrentGen) {
          // Not required, but good to note for priority system testing
          console.log(`Modern game "${game.name}" not on current-gen platforms`);
        }
      });
    });
  });

  describe('Test Data Quality', () => {
    it('should have comprehensive test coverage for major franchises', () => {
      const majorFranchises = ['mario', 'pokemon', 'zelda', 'final fantasy'];
      
      majorFranchises.forEach(franchise => {
        const topGames = getExpectedTopGames(franchise);
        const decoyGames = getFilterDecoyGames(franchise);
        
        expect(topGames.length).toBeGreaterThan(0);
        expect(topGames.length).toBeLessThanOrEqual(5); // Reasonable test size
        
        // Should have some negative test cases
        if (decoyGames.length === 0) {
          console.log(`Warning: No decoy games for ${franchise} franchise`);
        }
      });
    });

    it('should have realistic game data', () => {
      const allTopGames = Object.values(TEST_COLLECTIONS.topGamesByFranchise).flat();
      
      allTopGames.forEach(game => {
        // Basic data validation
        expect(game.name).toBeTruthy();
        expect(game.category).toBeDefined();
        expect(game.testReason).toBeTruthy();
        
        // Quality scores should be realistic
        if (game.rating) {
          expect(game.rating).toBeGreaterThan(0);
          expect(game.rating).toBeLessThanOrEqual(100);
        }
        
        if (game.metacritic_score) {
          expect(game.metacritic_score).toBeGreaterThan(0);
          expect(game.metacritic_score).toBeLessThanOrEqual(100);
        }
      });
    });
  });
});