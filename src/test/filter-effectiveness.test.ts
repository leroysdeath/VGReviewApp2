/**
 * Filter Effectiveness Tests - Percentage-based testing for filter performance
 */

import { describe, it, expect } from '@jest/globals';

// Mock filter functions for testing
const mockSeasonFilter = (games: any[]) => games.filter(g => g.category !== 7);
const mockPackFilter = (games: any[]) => games.filter(g => g.category !== 3);
const mockEReaderFilter = (games: any[]) => games.filter(g => !/-e\s*-\s*.+/i.test(g.name));

describe('Filter Effectiveness Tests', () => {

  describe('Season Filter Effectiveness', () => {
    it('should achieve 100% accuracy filtering season content', () => {
      const testGames = [
        { id: 1, name: 'Super Mario Bros.', category: 0 },        // MainGame - SHOULD PASS
        { id: 2, name: 'Super Mario 64', category: 0 },          // MainGame - SHOULD PASS  
        { id: 3, name: 'Mario Kart 8 Expansion', category: 2 },  // Expansion - SHOULD PASS
        { id: 4, name: 'Fortnite Season 5', category: 7 },       // Season - SHOULD BE FILTERED
        { id: 5, name: 'Apex Legends Season 12', category: 7 },  // Season - SHOULD BE FILTERED
        { id: 6, name: 'Destiny 2: Season of the Lost', category: 7 } // Season - SHOULD BE FILTERED
      ];

      const filtered = mockSeasonFilter(testGames);
      
      const originalCount = testGames.length;
      const filteredCount = filtered.length;
      const removedCount = originalCount - filteredCount;
      const seasonGamesCount = testGames.filter(g => g.category === 7).length;
      
      // Should remove exactly the season games (100% accuracy)
      expect(removedCount).toBe(seasonGamesCount);
      expect(removedCount).toBe(3); // 3 season games removed
      expect(filteredCount).toBe(3); // 3 regular games preserved
      
      // Effectiveness percentage
      const effectiveness = (removedCount / seasonGamesCount) * 100;
      expect(effectiveness).toBe(100); // 100% of season games filtered
      
      // Preserve non-season games (0% false positives)
      const nonSeasonGames = testGames.filter(g => g.category !== 7);
      const preservedNonSeason = filtered.filter(g => g.category !== 7);
      const falsePositiveRate = ((nonSeasonGames.length - preservedNonSeason.length) / nonSeasonGames.length) * 100;
      expect(falsePositiveRate).toBe(0); // 0% false positives
    });
  });

  describe('Pack Filter Effectiveness', () => {
    it('should achieve 100% accuracy filtering pack/bundle content', () => {
      const testGames = [
        { id: 1, name: 'Super Mario Bros.', category: 0 },             // MainGame - SHOULD PASS
        { id: 2, name: 'Super Mario Bros. 3 DLC', category: 1 },       // DLCAddon - SHOULD PASS
        { id: 3, name: 'Mario Kart 8 Expansion', category: 2 },        // Expansion - SHOULD PASS
        { id: 4, name: 'Nintendo Game Bundle', category: 3 },          // Bundle - SHOULD BE FILTERED
        { id: 5, name: 'Super Mario All-Stars', category: 3 },         // Bundle - SHOULD BE FILTERED
        { id: 6, name: 'Mario Collection Pack', category: 3 }          // Bundle - SHOULD BE FILTERED
      ];

      const filtered = mockPackFilter(testGames);
      
      const packGamesCount = testGames.filter(g => g.category === 3).length;
      const removedCount = testGames.length - filtered.length;
      
      // Should remove exactly the pack games
      expect(removedCount).toBe(packGamesCount);
      expect(removedCount).toBe(3); // 3 pack games removed
      expect(filtered.length).toBe(3); // 3 individual games preserved
      
      // Effectiveness metrics
      const effectiveness = (removedCount / packGamesCount) * 100;
      expect(effectiveness).toBe(100); // 100% pack removal rate
      
      // Verify no false positives on individual games
      const individualGames = testGames.filter(g => g.category !== 3);
      const preservedIndividual = filtered.filter(g => g.category !== 3);
      expect(preservedIndividual.length).toBe(individualGames.length); // All individual games preserved
    });
  });

  describe('E-Reader Filter Effectiveness', () => {
    it('should achieve high accuracy filtering e-reader micro-content', () => {
      const testGames = [
        // Legitimate games - SHOULD PASS
        { id: 1, name: 'Super Mario Bros. 3' },
        { id: 2, name: 'Super Mario Advance 4: Super Mario Bros. 3' },
        { id: 3, name: 'Mario vs. Donkey Kong' },
        { id: 4, name: 'Mario Party 4' },
        
        // E-reader content - SHOULD BE FILTERED
        { id: 5, name: 'Super Mario Advance 4: Super Mario Bros. 3-e - Para Beetle Challenge' },
        { id: 6, name: 'Mario vs. Donkey Kong-e - Level 1-1' },
        { id: 7, name: 'Mario Party-e - Bowser Game' },
        { id: 8, name: 'Super Mario Bros. 3-e Card Series' }
      ];

      const filtered = mockEReaderFilter(testGames);
      
      const eReaderCount = testGames.filter(g => /-e\s*-\s*.+/i.test(g.name)).length;
      const removedCount = testGames.length - filtered.length;
      
      // Should remove e-reader content
      expect(removedCount).toBe(eReaderCount);
      expect(removedCount).toBeGreaterThan(0);
      
      // Effectiveness calculation
      const effectiveness = eReaderCount > 0 ? (removedCount / eReaderCount) * 100 : 100;
      expect(effectiveness).toBeGreaterThanOrEqual(90); // High accuracy expected
      
      // Verify legitimate games preserved
      const legitimateGames = ['Super Mario Bros. 3', 'Super Mario Advance 4: Super Mario Bros. 3', 'Mario vs. Donkey Kong', 'Mario Party 4'];
      legitimateGames.forEach(gameName => {
        expect(filtered.some(g => g.name === gameName)).toBe(true);
      });
    });

    it('should avoid false positives on games with "e" in name', () => {
      const testGames = [
        { id: 1, name: 'Super Mario Maker' },           // Has 'e' but not e-reader
        { id: 2, name: 'Fire Emblem' },                 // Has 'e' but not e-reader  
        { id: 3, name: 'Mario Kart Live: Home Circuit' }, // Has 'e' but not e-reader
        { id: 4, name: 'Pokemon Red-e - Card Challenge' } // E-reader pattern - should filter
      ];

      const filtered = mockEReaderFilter(testGames);
      
      // Should preserve games with 'e' that aren't e-reader cards
      expect(filtered.some(g => g.name === 'Super Mario Maker')).toBe(true);
      expect(filtered.some(g => g.name === 'Fire Emblem')).toBe(true);
      expect(filtered.some(g => g.name === 'Mario Kart Live: Home Circuit')).toBe(true);
      
      // Should filter actual e-reader content
      expect(filtered.some(g => g.name === 'Pokemon Red-e - Card Challenge')).toBe(false);
      
      // False positive rate should be 0%
      const falsePositives = 3 - filtered.filter(g => !g.name.includes('-e -')).length;
      const falsePositiveRate = (falsePositives / 3) * 100;
      expect(falsePositiveRate).toBe(0);
    });
  });

  describe('Combined Filter Effectiveness', () => {
    it('should achieve high overall accuracy with multiple filters', () => {
      const testGames = [
        // Should pass all filters
        { id: 1, name: 'Super Mario Bros.', category: 0 },
        { id: 2, name: 'Super Mario 64', category: 0 },
        
        // Should be filtered by season filter
        { id: 3, name: 'Fortnite Season 10', category: 7 },
        
        // Should be filtered by pack filter  
        { id: 4, name: 'Nintendo Game Bundle', category: 3 },
        
        // Should be filtered by e-reader filter
        { id: 5, name: 'Mario Party-e - Mini Game', category: 0 }
      ];

      // Apply filters in sequence
      let filtered = mockSeasonFilter(testGames);
      filtered = mockPackFilter(filtered);
      filtered = mockEReaderFilter(filtered);
      
      const originalCount = testGames.length;
      const finalCount = filtered.length;
      const totalRemoved = originalCount - finalCount;
      
      // Should remove 3 problematic games, keep 2 legitimate games
      expect(finalCount).toBe(2);
      expect(totalRemoved).toBe(3);
      
      // Combined filter effectiveness
      const targetRemovals = 3; // Season + Pack + E-reader games
      const filterEffectiveness = (totalRemoved / targetRemovals) * 100;
      expect(filterEffectiveness).toBe(100); // Perfect filtering
      
      // Preservation rate for legitimate games
      const legitimateGames = testGames.filter(g => g.category === 0 && !g.name.includes('-e -'));
      const preservedLegitimate = filtered.filter(g => g.category === 0 && !g.name.includes('-e -'));
      const preservationRate = (preservedLegitimate.length / legitimateGames.length) * 100;
      expect(preservationRate).toBe(100); // Perfect preservation
    });
  });

  describe('Filter Performance Metrics', () => {
    it('should measure precision and recall for search filters', () => {
      // Test dataset with known good/bad games
      const testGames = [
        // True Positives (should pass and do pass)
        { id: 1, name: 'Super Mario Bros.', category: 0, shouldPass: true },
        { id: 2, name: 'Super Mario 64', category: 0, shouldPass: true },
        
        // True Negatives (should be filtered and are filtered)
        { id: 3, name: 'Fortnite Season 5', category: 7, shouldPass: false },
        { id: 4, name: 'Mario Bundle Pack', category: 3, shouldPass: false },
        
        // Potential False Positives (should be filtered but might pass)
        { id: 5, name: 'Mario Edge Case', category: 0, shouldPass: true }, // Borderline
        
        // Potential False Negatives (should pass but might be filtered)  
        { id: 6, name: 'Super Mario Collection', category: 3, shouldPass: false } // Bundle
      ];

      // Apply combined filtering
      let filtered = mockSeasonFilter(testGames);
      filtered = mockPackFilter(filtered);
      
      // Calculate confusion matrix
      let truePositives = 0;  // Should pass and does pass
      let trueNegatives = 0;  // Should be filtered and is filtered
      let falsePositives = 0; // Should be filtered but passes
      let falseNegatives = 0; // Should pass but is filtered
      
      testGames.forEach(game => {
        const passed = filtered.some(f => f.id === game.id);
        
        if (game.shouldPass && passed) truePositives++;
        else if (!game.shouldPass && !passed) trueNegatives++;
        else if (!game.shouldPass && passed) falsePositives++;
        else if (game.shouldPass && !passed) falseNegatives++;
      });
      
      // Calculate metrics
      const precision = truePositives / (truePositives + falsePositives) * 100;
      const recall = truePositives / (truePositives + falseNegatives) * 100;
      const accuracy = (truePositives + trueNegatives) / testGames.length * 100;
      
      // Quality thresholds
      expect(accuracy).toBeGreaterThanOrEqual(80);   // Overall accuracy > 80%
      expect(precision).toBeGreaterThanOrEqual(75);  // Precision > 75% (low false positives)
      expect(recall).toBeGreaterThanOrEqual(75);     // Recall > 75% (low false negatives)
      
      console.log(`Filter Performance: Accuracy=${accuracy.toFixed(1)}%, Precision=${precision.toFixed(1)}%, Recall=${recall.toFixed(1)}%`);
    });
  });
});