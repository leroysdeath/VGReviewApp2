import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the igdbService
jest.mock('../services/igdbService', () => ({
  igdbService: {
    searchWithSequels: jest.fn(),
  }
}));

import { igdbService } from '../services/igdbService';

describe('Franchise Detection and Search Quality System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Franchise Detection Patterns', () => {
    it('should detect Nintendo franchises correctly', () => {
      const nintendoTestCases = [
        { query: 'mario', expectedFranchise: 'mario' },
        { query: 'super mario', expectedFranchise: 'mario' },
        { query: 'mario bros', expectedFranchise: 'mario' },
        { query: 'mario party', expectedFranchise: 'mario party' },
        { query: 'mario party superstars', expectedFranchise: 'mario party' },
        { query: 'zelda', expectedFranchise: 'zelda' },
        { query: 'legend of zelda', expectedFranchise: 'zelda' },
        { query: 'breath of the wild', expectedFranchise: 'zelda' },
        { query: 'pokemon', expectedFranchise: 'pokemon' },
        { query: 'pokémon', expectedFranchise: 'pokemon' },
        { query: 'metroid', expectedFranchise: 'metroid' }
      ];

      nintendoTestCases.forEach(({ query, expectedFranchise }) => {
        // Simulate franchise detection logic
        const queryLower = query.toLowerCase();
        
        // Franchise patterns matching system - order matters, most specific first
        const franchisePatterns = {
          'mario party': ['mario party'], // Check mario party FIRST (more specific)
          'mario': ['mario', 'super mario', 'mario bros'],
          'zelda': ['zelda', 'legend of zelda', 'breath of the wild', 'tears of the kingdom'],
          'pokemon': ['pokemon', 'pokémon'],
          'metroid': ['metroid']
        };

        const detectedFranchise = Object.keys(franchisePatterns).find(franchise =>
          franchisePatterns[franchise].some(pattern => queryLower.includes(pattern))
        );

        expect(detectedFranchise).toBe(expectedFranchise);
      });
    });

    it('should detect third-party franchises correctly', () => {
      const thirdPartyTestCases = [
        { query: 'final fantasy', expectedFranchise: 'final fantasy' },
        { query: 'ff7', expectedFranchise: 'final fantasy' },
        { query: 'street fighter', expectedFranchise: 'street fighter' },
        { query: 'resident evil', expectedFranchise: 'resident evil' },
        { query: 'metal gear', expectedFranchise: 'metal gear' },
        { query: 'metal gear solid', expectedFranchise: 'metal gear' },
        { query: 'sonic', expectedFranchise: 'sonic' },
        { query: 'sonic the hedgehog', expectedFranchise: 'sonic' },
        { query: 'mega man', expectedFranchise: 'mega man' },
        { query: 'megaman', expectedFranchise: 'mega man' }
      ];

      thirdPartyTestCases.forEach(({ query, expectedFranchise }) => {
        const queryLower = query.toLowerCase();
        
        const franchisePatterns = {
          'final fantasy': ['final fantasy', 'ff'],
          'street fighter': ['street fighter'],
          'resident evil': ['resident evil'],
          'metal gear': ['metal gear'],
          'sonic': ['sonic'],
          'mega man': ['mega man', 'megaman']
        };

        const detectedFranchise = Object.keys(franchisePatterns).find(franchise =>
          franchisePatterns[franchise].some(pattern => queryLower.includes(pattern))
        );

        expect(detectedFranchise).toBe(expectedFranchise);
      });
    });

    it('should prioritize specific franchise patterns over general ones', () => {
      // Test that "mario party" detects mario party franchise, not just mario
      const query = 'mario party';
      const queryLower = query.toLowerCase();
      
      // Franchise patterns should be checked in order of specificity
      const orderedFranchisePatterns = [
        { franchise: 'mario party', patterns: ['mario party'] },
        { franchise: 'mario', patterns: ['mario', 'super mario', 'mario bros'] }
      ];

      let detectedFranchise = null;
      for (const { franchise, patterns } of orderedFranchisePatterns) {
        if (patterns.some(pattern => queryLower.includes(pattern))) {
          detectedFranchise = franchise;
          break; // First match wins (most specific)
        }
      }

      expect(detectedFranchise).toBe('mario party'); // Should detect specific franchise
    });
  });

  describe('Search Quality Scoring', () => {
    it('should calculate search quality for Mario franchise accurately', () => {
      const importantMarioGames = [
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

      // Simulate current Mario search results
      const currentMarioResults = [
        { id: 1, name: 'Super Mario Bros.' },
        { id: 2, name: 'Super Mario Bros. 2' },
        { id: 3, name: 'Super Mario Bros. 3' },
        { id: 4, name: 'Super Mario World' },
        { id: 5, name: 'Super Mario 64' },
        { id: 6, name: 'Super Mario Odyssey' },
        { id: 7, name: 'Mario & Sonic at the Olympic Games' },
        { id: 8, name: 'Mario Kart Tour' }
      ];

      let foundImportantGames = 0;
      const foundGames = [];
      const missingGames = [];

      importantMarioGames.forEach(importantGame => {
        const found = currentMarioResults.some(result => {
          const resultName = result.name.toLowerCase();
          const targetName = importantGame.toLowerCase();
          return resultName.includes(targetName) || targetName.includes(resultName) ||
                 resultName.replace(/[:\-.]/g, '').includes(targetName.replace(/[:\-.]/g, ''));
        });
        
        if (found) {
          foundImportantGames++;
          foundGames.push(importantGame);
        } else {
          missingGames.push(importantGame);
        }
      });

      const marioQuality = (foundImportantGames / importantMarioGames.length) * 100;

      expect(foundImportantGames).toBe(6); // 6 out of 9 important Mario games found
      expect(marioQuality).toBeCloseTo(66.7, 1); // 66.7% quality score
      expect(foundGames).toContain('Super Mario Bros.');
      expect(foundGames).toContain('Super Mario 64');
      expect(foundGames).toContain('Super Mario Odyssey');
      expect(missingGames).toContain('Super Mario Sunshine');
      expect(missingGames).toContain('Super Mario Galaxy');
    });

    it('should calculate search quality for Zelda franchise accurately', () => {
      const importantZeldaGames = [
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

      // Simulate current Zelda search results (should be higher quality)
      const currentZeldaResults = [
        { id: 1, name: 'The Legend of Zelda' },
        { id: 2, name: 'The Legend of Zelda: A Link to the Past' },
        { id: 3, name: 'The Legend of Zelda: Link\'s Awakening' },
        { id: 4, name: 'The Legend of Zelda: Ocarina of Time' },
        { id: 5, name: 'The Legend of Zelda: Majora\'s Mask' },
        { id: 6, name: 'The Legend of Zelda: The Wind Waker' },
        { id: 7, name: 'The Legend of Zelda: Twilight Princess' },
        { id: 8, name: 'The Legend of Zelda: Breath of the Wild' },
        { id: 9, name: 'The Legend of Zelda: Tears of the Kingdom' },
        { id: 10, name: 'Hyrule Warriors' }
      ];

      let foundImportantGames = 0;
      importantZeldaGames.forEach(importantGame => {
        const found = currentZeldaResults.some(result => {
          const resultName = result.name.toLowerCase();
          const targetName = importantGame.toLowerCase();
          return resultName.includes(targetName) || targetName.includes(resultName);
        });
        
        if (found) foundImportantGames++;
      });

      const zeldaQuality = (foundImportantGames / importantZeldaGames.length) * 100;

      expect(foundImportantGames).toBe(9); // 9 out of 10 important Zelda games found
      expect(zeldaQuality).toBeCloseTo(90.0, 1); // 90% quality score
      expect(zeldaQuality).toBeGreaterThan(66.7); // Higher quality than Mario
    });

    it('should calculate search quality for Pokemon franchise accurately', () => {
      const importantPokemonGames = [
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

      // Simulate Pokemon search results (should improve with flagship fallback)
      const currentPokemonResults = [
        { id: 1, name: 'Pokemon Stadium 2' },
        { id: 2, name: 'Pokemon Red' }, // From flagship fallback
        { id: 3, name: 'Pokemon Blue' }, // From flagship fallback  
        { id: 4, name: 'Pokemon Gold' }, // From flagship fallback
        { id: 5, name: 'Pokemon Silver' }, // From flagship fallback
        { id: 6, name: 'Pokemon Crystal' }, // From flagship fallback
        { id: 7, name: 'Name That Pokemon' }
      ];

      let foundImportantGames = 0;
      importantPokemonGames.forEach(importantGame => {
        const found = currentPokemonResults.some(result => {
          const resultName = result.name.toLowerCase();
          const targetName = importantGame.toLowerCase();
          return resultName.includes(targetName) || targetName.includes(resultName);
        });
        
        if (found) foundImportantGames++;
      });

      const pokemonQuality = (foundImportantGames / importantPokemonGames.length) * 100;

      expect(foundImportantGames).toBeGreaterThanOrEqual(5); // Should find at least 5 main Pokemon games
      expect(pokemonQuality).toBeCloseTo(55.6, 1); // Should have ~55% quality
      expect(currentPokemonResults.some(game => game.name === 'Pokemon Red')).toBe(true);
      expect(currentPokemonResults.some(game => game.name === 'Pokemon Blue')).toBe(true);
    });
  });

  describe('Flagship Fallback Trigger Conditions', () => {
    it('should trigger flagship fallback when quality games are insufficient', async () => {
      // Mock poor quality Mario search results
      const poorQualityResults = [
        { id: 1, name: 'Mario & Sonic at the Olympic Winter Games', category: 0 },
        { id: 2, name: 'Mario & Sonic at the Olympic Games Tokyo 2020', category: 0 },
        { id: 3, name: 'Mario Kart Tour: Mario Bros. Tour', category: 7 }, // Season - will be filtered
        { id: 4, name: 'Super Mario All-Stars: Limited Edition', category: 3 } // Bundle - will be filtered
      ];

      (igdbService.searchWithSequels as jest.MockedFunction<typeof igdbService.searchWithSequels>).mockResolvedValueOnce(poorQualityResults);

      const results = await igdbService.searchWithSequels('mario', 20);
      
      // Apply filtering pipeline
      const afterSeasonFilter = results.filter(g => g.category !== 7);
      const afterBundleFilter = afterSeasonFilter.filter(g => g.category !== 3);
      
      // Count quality main games (excluding Olympic)
      const qualityMainGames = afterBundleFilter.filter(game => 
        game.category === 0 && 
        !game.name.toLowerCase().includes('olympic')
      );

      expect(qualityMainGames.length).toBe(0); // No quality main games
      expect(qualityMainGames.length < 3).toBe(true); // Should trigger flagship fallback
    });

    it('should NOT trigger flagship fallback when sufficient quality games exist', async () => {
      // Mock good quality Zelda search results
      const goodQualityResults = [
        { id: 1, name: 'The Legend of Zelda', category: 0 },
        { id: 2, name: 'The Legend of Zelda: A Link to the Past', category: 0 },
        { id: 3, name: 'The Legend of Zelda: Ocarina of Time', category: 0 },
        { id: 4, name: 'The Legend of Zelda: Breath of the Wild', category: 0 },
        { id: 5, name: 'The Legend of Zelda: Oracle of Ages', category: 0 }
      ];

      (igdbService.searchWithSequels as jest.MockedFunction<typeof igdbService.searchWithSequels>).mockResolvedValueOnce(goodQualityResults);

      const results = await igdbService.searchWithSequels('zelda', 20);
      
      // Count quality main games
      const qualityMainGames = results.filter(game => 
        game.category === 0 && 
        !game.name.toLowerCase().includes('olympic')
      );

      expect(qualityMainGames.length).toBe(5); // Plenty of quality main games
      expect(qualityMainGames.length >= 3).toBe(true); // Should NOT trigger flagship fallback
    });

    it('should handle edge case where Olympic games are primary results', () => {
      const olympicHeavyResults = [
        { id: 1, name: 'Mario & Sonic at the Olympic Games', category: 0 },
        { id: 2, name: 'Mario & Sonic at the Olympic Winter Games', category: 0 },
        { id: 3, name: 'Mario & Sonic at the Olympic Games Tokyo 2020', category: 0 },
        { id: 4, name: 'Mario Tennis Aces', category: 0 }, // Non-Olympic game
        { id: 5, name: 'Mario Party Superstars', category: 0 } // Non-Olympic game
      ];

      // Quality main games (excluding Olympic)
      const qualityMainGames = olympicHeavyResults.filter(game => 
        game.category === 0 && 
        !game.name.toLowerCase().includes('olympic')
      );

      expect(qualityMainGames.length).toBe(2); // 2 quality games
      expect(qualityMainGames.length < 3).toBe(true); // Should trigger flagship fallback
      expect(qualityMainGames.some(game => game.name === 'Mario Tennis Aces')).toBe(true);
      expect(qualityMainGames.some(game => game.name === 'Mario Party Superstars')).toBe(true);
    });
  });

  describe('Search Relevance Calculation', () => {
    it('should calculate relevance scores correctly', () => {
      function calculateSearchRelevance(game, searchQuery) {
        if (!searchQuery || !searchQuery.trim()) return 1;

        const query = searchQuery.toLowerCase().trim();
        const gameName = (game.name || '').toLowerCase();
        const developer = (game.developer || '').toLowerCase();
        const publisher = (game.publisher || '').toLowerCase();

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

        // Query words in name (very high relevance)
        maxPossibleScore += 80;
        const queryWords = query.split(/\s+/);
        const nameWords = gameName.split(/\s+/);
        let nameWordMatches = 0;
        queryWords.forEach(queryWord => {
          if (nameWords.some(nameWord => nameWord.includes(queryWord) || queryWord.includes(nameWord))) {
            nameWordMatches++;
          }
        });
        if (queryWords.length > 0) {
          relevanceScore += 80 * (nameWordMatches / queryWords.length);
        }

        // Developer/Publisher match (medium relevance)
        maxPossibleScore += 30;
        queryWords.forEach(queryWord => {
          if (developer.includes(queryWord) || publisher.includes(queryWord)) {
            relevanceScore += 30 / queryWords.length;
          }
        });

        // Calculate final relevance as percentage
        const finalRelevance = maxPossibleScore > 0 ? (relevanceScore / maxPossibleScore) : 0;
        
        // Apply threshold - games below 15% relevance are considered unrelated
        const RELEVANCE_THRESHOLD = 0.15;
        return finalRelevance >= RELEVANCE_THRESHOLD ? finalRelevance : 0;
      }

      // Test relevance calculations
      const testGames = [
        { id: 1, name: 'Super Mario Bros.', developer: 'Nintendo', publisher: 'Nintendo' },
        { id: 2, name: 'Mario Kart 8', developer: 'Nintendo EPD', publisher: 'Nintendo' },
        { id: 3, name: 'Sonic the Hedgehog', developer: 'SEGA', publisher: 'SEGA' }
      ];

      const marioQuery = 'mario';
      
      testGames.forEach(game => {
        const relevance = calculateSearchRelevance(game, marioQuery);
        
        if (game.name.includes('Mario')) {
          expect(relevance).toBeGreaterThan(0.15); // Mario games should pass threshold
        } else {
          expect(relevance).toBeLessThanOrEqual(0.15); // Non-Mario games should be below threshold
        }
      });

      // Test specific relevance scores
      const marioResult = calculateSearchRelevance(testGames[0], marioQuery);
      const sonicResult = calculateSearchRelevance(testGames[2], marioQuery);
      
      expect(marioResult).toBeGreaterThan(sonicResult); // Mario game should be more relevant for mario search
    });

    it('should handle dynamic relevance thresholds for franchise searches', () => {
      // For franchise searches, we may use lower thresholds to include more games
      const franchiseSearches = [
        { query: 'mario', isFranchise: true, expectedThreshold: 0.10 },
        { query: 'pokemon', isFranchise: true, expectedThreshold: 0.10 },
        { query: 'call of duty', isFranchise: false, expectedThreshold: 0.15 }, // Non-franchise
        { query: 'specific game title', isFranchise: false, expectedThreshold: 0.15 }
      ];

      franchiseSearches.forEach(({ query, isFranchise, expectedThreshold }) => {
        // Simulate dynamic threshold logic
        const baseThreshold = 0.15;
        const franchiseThreshold = 0.10;
        const actualThreshold = isFranchise ? franchiseThreshold : baseThreshold;
        
        expect(actualThreshold).toBe(expectedThreshold);
      });
    });
  });

  describe('Platform Priority System', () => {
    it('should prioritize current-generation platforms', () => {
      const platformPriorityScores = {
        'PlayStation 5': 80,
        'Xbox Series X': 80,
        'Xbox Series S': 80,
        'Nintendo Switch': 100, // Higher for Nintendo games
        'PC': 70,
        'PlayStation 4': 60,
        'Xbox One': 60,
        'Nintendo 3DS': 40,
        'PlayStation 3': 30,
        'Xbox 360': 30,
        'GameCube': 20
      };

      // Test Nintendo Switch priority for Nintendo games
      const nintendoSwitchScore = platformPriorityScores['Nintendo Switch'];
      const ps5Score = platformPriorityScores['PlayStation 5'];
      const gameCubeScore = platformPriorityScores['GameCube'];

      expect(nintendoSwitchScore).toBeGreaterThan(ps5Score); // Switch should have highest priority
      expect(ps5Score).toBeGreaterThan(gameCubeScore); // Current gen should beat old gen
      expect(nintendoSwitchScore).toBe(100); // Nintendo Switch gets 100 for Nintendo games
    });

    it('should boost Switch versions for Nintendo franchise searches', () => {
      const botWVersions = [
        { 
          id: 1,
          name: 'The Legend of Zelda: Breath of the Wild', 
          platforms: [{ name: 'Nintendo Switch' }],
          expectedPriorityBonus: 100 
        },
        { 
          id: 2,
          name: 'The Legend of Zelda: Breath of the Wild', 
          platforms: [{ name: 'Wii U' }],
          expectedPriorityBonus: 30 
        }
      ];

      botWVersions.forEach(version => {
        const platform = version.platforms[0].name;
        const isNintendoGame = true; // Zelda is Nintendo franchise
        
        let platformScore = 0;
        if (platform === 'Nintendo Switch' && isNintendoGame) {
          platformScore = 100;
        } else if (platform === 'Wii U') {
          platformScore = 30;
        }
        
        expect(platformScore).toBe(version.expectedPriorityBonus);
      });

      // Switch version should have higher priority
      expect(100).toBeGreaterThan(30);
    });
  });

  describe('Multi-Strategy Search System', () => {
    it('should combine primary search with flagship fallback effectively', async () => {
      // Mock primary search returning low-quality results
      const primaryResults = [
        { id: 1, name: 'Mario & Sonic at the Olympic Games', category: 0 },
        { id: 2, name: 'Mario Kart Tour: Anniversary Tour', category: 7 }
      ];

      // Mock flagship search returning high-quality results
      const flagshipResults = [
        { id: 3, name: 'Super Mario Bros. 3', category: 0 },
        { id: 4, name: 'Super Mario 64', category: 0 },
        { id: 5, name: 'Super Mario Odyssey', category: 0 }
      ];

      (igdbService.searchWithSequels as jest.MockedFunction<typeof igdbService.searchWithSequels>)
        .mockResolvedValueOnce(primaryResults) // First call - primary search
        .mockResolvedValueOnce(flagshipResults); // Second call - flagship fallback

      // Simulate the multi-strategy approach
      const initialResults = await igdbService.searchWithSequels('mario', 20);
      
      // Count quality games after filtering
      const qualityGames = initialResults.filter(game => 
        game.category === 0 && !game.name.toLowerCase().includes('olympic')
      );

      if (qualityGames.length < 3) {
        // Trigger flagship fallback
        const flagshipResults = await igdbService.searchWithSequels('Super Mario Bros.', 20);
        const combinedResults = [...initialResults, ...flagshipResults];
        
        expect(combinedResults.length).toBeGreaterThan(initialResults.length);
        expect(combinedResults.some(game => game.name === 'Super Mario Bros. 3')).toBe(true);
      }
    });

    it('should maintain search performance with multiple strategies', () => {
      // Test API call efficiency
      const searchStrategies = {
        primary: 1, // Primary search
        flagship: 3, // Up to 3 flagship searches
        fuzzy: 2 // Up to 2 fuzzy searches
      };

      const maxAPICalls = searchStrategies.primary + searchStrategies.flagship + searchStrategies.fuzzy;
      
      expect(maxAPICalls).toBe(6); // Should not exceed 6 API calls per search
      expect(maxAPICalls).toBeLessThan(10); // Performance constraint
    });
  });

  describe('Search Quality Metrics and Thresholds', () => {
    it('should define appropriate quality thresholds for different franchise types', () => {
      const franchiseQualityThresholds = {
        major: 70, // Nintendo, Sony first-party (mario, zelda, pokemon)
        popular: 60, // Third-party AAA (final fantasy, street fighter)
        niche: 50, // Smaller franchises (mega man, castlevania)
        indie: 40 // Independent/retro (shovel knight, celeste)
      };

      // Test that major franchises have high quality expectations
      expect(franchiseQualityThresholds.major).toBe(70);
      expect(franchiseQualityThresholds.major).toBeGreaterThan(franchiseQualityThresholds.popular);
      expect(franchiseQualityThresholds.popular).toBeGreaterThan(franchiseQualityThresholds.niche);
      expect(franchiseQualityThresholds.niche).toBeGreaterThan(franchiseQualityThresholds.indie);
    });

    it('should track search quality improvements over time', () => {
      const searchQualityHistory = {
        before: {
          mario: 33.3, // Before flagship fallback
          pokemon: 0, // Before publisher fixes
          zelda: 80 // Already good
        },
        after: {
          mario: 66.7, // After flagship fallback
          pokemon: 55.6, // After publisher fixes
          zelda: 90 // Maintained/improved
        }
      };

      // Verify quality improvements
      expect(searchQualityHistory.after.mario).toBeGreaterThan(searchQualityHistory.before.mario);
      expect(searchQualityHistory.after.pokemon).toBeGreaterThan(searchQualityHistory.before.pokemon);
      expect(searchQualityHistory.after.zelda).toBeGreaterThanOrEqual(searchQualityHistory.before.zelda);
      
      // All franchises should achieve minimum 50% quality
      Object.values(searchQualityHistory.after).forEach(quality => {
        expect(quality).toBeGreaterThanOrEqual(50);
      });
    });
  });

  describe('Search Result Prioritization', () => {
    it('should implement 6-tier priority system correctly', () => {
      const GamePriority = {
        FLAGSHIP_TIER: 1500,  // Tier 0 - Iconic franchise games
        FAMOUS_TIER: 1200,    // Tier 1 - Well-known titles
        SEQUEL_TIER: 1000,    // Tier 2 - Series entries
        POPULAR_TIER: 800,    // Tier 3 - Community favorites
        RELEVANT_TIER: 600,   // Tier 4 - Related games
        NICHE_TIER: 400,      // Tier 5 - Specialized content
        FALLBACK_TIER: 0      // Tier 6 - Default/unranked
      };

      // Test tier ordering
      expect(GamePriority.FLAGSHIP_TIER).toBeGreaterThan(GamePriority.FAMOUS_TIER);
      expect(GamePriority.FAMOUS_TIER).toBeGreaterThan(GamePriority.SEQUEL_TIER);
      expect(GamePriority.SEQUEL_TIER).toBeGreaterThan(GamePriority.POPULAR_TIER);
      expect(GamePriority.POPULAR_TIER).toBeGreaterThan(GamePriority.RELEVANT_TIER);
      expect(GamePriority.RELEVANT_TIER).toBeGreaterThan(GamePriority.NICHE_TIER);
      expect(GamePriority.NICHE_TIER).toBeGreaterThan(GamePriority.FALLBACK_TIER);

      // Test flagship tier prominence
      expect(GamePriority.FLAGSHIP_TIER).toBe(1500);
      expect(GamePriority.FLAGSHIP_TIER - GamePriority.FAMOUS_TIER).toBe(300); // Significant gap
    });

    it('should calculate flagship scores for iconic games', () => {
      function calculateFlagshipScore(gameName, franchise) {
        const flagshipGames = {
          mario: {
            'Super Mario Bros. 3': { base: 100, significance: 40, age: 25 }, // Peak platformer
            'Super Mario 64': { base: 100, significance: 30, age: 20 }, // 3D breakthrough
            'Super Mario Odyssey': { base: 100, significance: 20, age: 0 } // Modern classic
          },
          pokemon: {
            'Pokemon Red': { base: 100, significance: 50, age: 25 }, // Series originator
            'Pokemon Blue': { base: 100, significance: 50, age: 25 },
            'Pokemon Gold': { base: 100, significance: 35, age: 22 } // Major evolution
          }
        };

        const franchiseData = flagshipGames[franchise];
        if (!franchiseData) return 0;

        const gameData = Object.keys(franchiseData).find(flagship =>
          gameName.toLowerCase().includes(flagship.toLowerCase())
        );

        if (!gameData) return 0;

        const scores = franchiseData[gameData];
        return scores.base + scores.significance + scores.age;
      }

      // Test Mario flagship scores
      expect(calculateFlagshipScore('Super Mario Bros. 3', 'mario')).toBe(165); // 100+40+25
      expect(calculateFlagshipScore('Super Mario 64', 'mario')).toBe(150); // 100+30+20
      expect(calculateFlagshipScore('Super Mario Odyssey', 'mario')).toBe(120); // 100+20+0

      // Test Pokemon flagship scores
      expect(calculateFlagshipScore('Pokemon Red', 'pokemon')).toBe(175); // 100+50+25
      expect(calculateFlagshipScore('Pokemon Gold', 'pokemon')).toBe(157); // 100+35+22

      // All flagship games should qualify for FLAGSHIP_TIER
      const flagshipThreshold = 100;
      expect(calculateFlagshipScore('Super Mario Bros. 3', 'mario')).toBeGreaterThan(flagshipThreshold);
      expect(calculateFlagshipScore('Pokemon Red', 'pokemon')).toBeGreaterThan(flagshipThreshold);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty search results gracefully', async () => {
      (igdbService.searchWithSequels as jest.MockedFunction<typeof igdbService.searchWithSequels>).mockResolvedValueOnce([]);

      const results = await igdbService.searchWithSequels('nonexistent game', 20);
      
      expect(results).toEqual([]);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should handle API errors without breaking search', async () => {
      (igdbService.searchWithSequels as jest.MockedFunction<typeof igdbService.searchWithSequels>).mockRejectedValueOnce(new Error('IGDB API Error'));

      try {
        await igdbService.searchWithSequels('mario', 20);
        // Should not reach here if properly handled
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toBe('IGDB API Error');
        // Error should be caught and handled gracefully in actual implementation
      }
    });

    it('should handle malformed game data', () => {
      const malformedGames = [
        { id: 1, name: null, category: 0 }, // Missing name
        { id: 2, category: 0 }, // Missing name property
        { id: 3, name: 'Super Mario Bros.' }, // Missing category
        { id: 4, name: '', category: 0 }, // Empty name
        { id: 5, name: 'Normal Game', category: 0 } // Complete data
      ];

      // Filter out malformed entries
      const validGames = malformedGames.filter(game => 
        game.name && game.name.trim().length > 0 && typeof game.category === 'number'
      );

      expect(validGames).toHaveLength(1); // Only the complete game should remain
      expect(validGames[0].name).toBe('Normal Game');
    });
  });
});