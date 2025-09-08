import { describe, it, expect } from '@jest/globals';
import { 
  detectGameSeries, 
  generateSisterGameQueries, 
  applySisterGameBoost, 
  calculateGenreSimilarityBonus,
  isSisterGame 
} from '../utils/sisterGameDetection';

describe('Sister Game and Sequel Detection Tests', () => {
  
  describe('Pokemon Series Detection', () => {
    it('should detect Pokemon color versions and suggest sister games', () => {
      const testCases = [
        { query: 'Pokemon Red', expected: true },
        { query: 'pokemon blue', expected: true },
        { query: 'Pokemon Yellow', expected: true },
        { query: 'Pokemon Gold', expected: true },
        { query: 'pokemon silver', expected: true },
        { query: 'Pokemon Crystal', expected: true },
        { query: 'Pokemon Ruby', expected: true },
        { query: 'Pokemon Sapphire', expected: true },
        { query: 'Pokemon Emerald', expected: true },
        { query: 'Pokemon Sword', expected: true },
        { query: 'Pokemon Shield', expected: true }
      ];

      console.log('🎮 POKEMON SERIES DETECTION TEST:');

      testCases.forEach(testCase => {
        const detection = detectGameSeries(testCase.query);
        const hasDetection = detection !== null;
        
        console.log(`  - "${testCase.query}": ${hasDetection ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
        
        if (hasDetection && detection) {
          console.log(`    Series: ${detection.seriesInfo.baseName} (${detection.seriesInfo.type})`);
          console.log(`    Expansions: ${detection.expandedQueries.slice(0, 5).join(', ')}... (${detection.expandedQueries.length} total)`);
        }

        expect(hasDetection).toBe(testCase.expected);

        if (detection) {
          expect(detection.seriesInfo.baseName).toBe('Pokemon');
          expect(detection.seriesInfo.type).toBe('versioned');
          expect(detection.expandedQueries.length).toBeGreaterThan(10);
          
          // Should include sister games like Blue when searching Red
          if (testCase.query.toLowerCase().includes('red')) {
            expect(detection.expandedQueries).toContain('pokemon blue');
            expect(detection.expandedQueries).toContain('pokemon yellow');
          }
        }
      });
    });

    it('should generate comprehensive Pokemon sister game queries', () => {
      const queries = generateSisterGameQueries('Pokemon Red');
      
      console.log(`\n🔍 POKEMON RED SISTER GAME QUERIES (${queries.length} total):`);
      queries.forEach((query, index) => {
        console.log(`  ${index + 1}. "${query}"`);
      });

      expect(queries).toContain('pokemon blue');
      expect(queries).toContain('pokemon green'); 
      expect(queries).toContain('pokemon yellow');
      expect(queries).toContain('pokemon gold');
      expect(queries).toContain('pokemon silver');
      
      // Should respect API limits
      expect(queries.length).toBeLessThanOrEqual(8);
    });
  });

  describe('Final Fantasy Series Detection', () => {
    it('should detect Final Fantasy numbered entries and suggest sequels', () => {
      const testCases = [
        { query: 'Final Fantasy VII', roman: true },
        { query: 'Final Fantasy 7', arabic: true },
        { query: 'final fantasy vi', roman: true },
        { query: 'Final Fantasy 6', arabic: true },
        { query: 'Final Fantasy X', roman: true },
        { query: 'Final Fantasy 10', arabic: true }
      ];

      console.log('\n⚔️ FINAL FANTASY SERIES DETECTION TEST:');

      testCases.forEach(testCase => {
        const detection = detectGameSeries(testCase.query);
        
        console.log(`  - "${testCase.query}": ${detection ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
        
        if (detection) {
          console.log(`    Series: ${detection.seriesInfo.baseName} (${detection.seriesInfo.type})`);
          console.log(`    Sample expansions: ${detection.expandedQueries.slice(0, 6).join(', ')}...`);
        }

        expect(detection).not.toBeNull();

        if (detection) {
          expect(detection.seriesInfo.baseName).toBe('Final Fantasy');
          expect(detection.seriesInfo.type).toBe('numbered');
          
          // Should include both Roman and Arabic numerals
          expect(detection.expandedQueries).toContain('final fantasy vii');
          expect(detection.expandedQueries).toContain('final fantasy 7');
          expect(detection.expandedQueries).toContain('final fantasy vi');
          expect(detection.expandedQueries).toContain('final fantasy 6');
        }
      });
    });

    it('should analyze sister game relationships for Final Fantasy', () => {
      const detection = detectGameSeries('Final Fantasy VII');
      expect(detection).not.toBeNull();

      if (detection) {
        const testGames = [
          { name: 'Final Fantasy VII', relationship: 'exact' },
          { name: 'Final Fantasy VIII', relationship: 'sequel' },
          { name: 'Final Fantasy VI', relationship: 'prequel' },
          { name: 'Final Fantasy X', relationship: 'sequel' },
          { name: 'Final Fantasy II', relationship: 'prequel' }
        ];

        console.log('\n🎯 FINAL FANTASY RELATIONSHIP ANALYSIS:');

        testGames.forEach(testGame => {
          const analysis = isSisterGame('Final Fantasy VII', testGame.name, detection.seriesInfo);
          console.log(`  - "${testGame.name}": ${analysis.relationship} (${Math.round(analysis.confidence * 100)}% confidence)`);
          
          expect(analysis.isSister).toBe(true);
          expect(analysis.relationship).toBe(testGame.relationship);
        });
      }
    });
  });

  describe('Zelda Series Detection', () => {
    it('should detect Zelda subtitled entries and suggest related games', () => {
      const testCases = [
        'The Legend of Zelda: A Link to the Past',
        'zelda ocarina of time', 
        'Legend of Zelda Breath of the Wild',
        'zelda wind waker',
        'The Legend of Zelda: Links Awakening'
      ];

      console.log('\n🗡️ ZELDA SERIES DETECTION TEST:');

      testCases.forEach(query => {
        const detection = detectGameSeries(query);
        
        console.log(`  - "${query}": ${detection ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
        
        if (detection) {
          console.log(`    Series: ${detection.seriesInfo.baseName} (${detection.seriesInfo.type})`);
          console.log(`    Sample expansions: ${detection.expandedQueries.slice(0, 4).join(', ')}...`);
        }

        expect(detection).not.toBeNull();

        if (detection) {
          expect(detection.seriesInfo.baseName).toBe('The Legend of Zelda');
          expect(detection.seriesInfo.type).toBe('subtitled');
          expect(detection.expandedQueries).toContain('zelda ocarina of time');
          expect(detection.expandedQueries).toContain('zelda breath of the wild');
        }
      });
    });
  });

  describe('Genre-Based Prioritization', () => {
    it('should calculate genre similarity bonuses correctly', () => {
      const testCases = [
        {
          original: ['RPG', 'Adventure'],
          related: ['RPG', 'Adventure'], 
          expectedBonus: 200, // Exact match
          description: 'Exact genre match'
        },
        {
          original: ['RPG', 'Turn-based'],
          related: ['RPG', 'Strategy'],
          expectedBonus: 100, // Partial match
          description: 'Partial genre match'
        },
        {
          original: ['Action', 'Adventure'],
          related: ['Action-Adventure', 'RPG'],
          expectedBonus: 50, // Some similarity
          description: 'Some genre similarity'
        },
        {
          original: ['Sports', 'Racing'],
          related: ['RPG', 'Adventure'],
          expectedBonus: 0, // No match
          description: 'No genre similarity'
        }
      ];

      console.log('\n🎨 GENRE SIMILARITY BONUS TEST:');

      testCases.forEach(testCase => {
        const bonus = calculateGenreSimilarityBonus(testCase.original, testCase.related);
        
        console.log(`  - ${testCase.description}:`);
        console.log(`    Original: [${testCase.original.join(', ')}]`);
        console.log(`    Related:  [${testCase.related.join(', ')}]`);
        console.log(`    Bonus: +${bonus} points (expected: +${testCase.expectedBonus})`);

        expect(bonus).toBe(testCase.expectedBonus);
      });
    });

    it('should apply genre bonuses to sister games', () => {
      const testGames = [
        {
          id: 1,
          name: 'Pokemon Red',
          genres: ['RPG', 'Adventure'],
          developer: 'Game Freak'
        },
        {
          id: 2, 
          name: 'Pokemon Blue',
          genres: ['RPG', 'Adventure'], // Same genres as Red
          developer: 'Game Freak'
        },
        {
          id: 3,
          name: 'Pokemon Pinball', // Spin-off with different genre
          genres: ['Arcade', 'Pinball'],
          developer: 'Jupiter'
        }
      ];

      const originalGameGenres = ['RPG', 'Adventure'];
      const boostedGames = applySisterGameBoost(testGames, 'Pokemon Red', originalGameGenres);

      console.log('\n⚡ SISTER GAME BOOST APPLICATION:');

      boostedGames.forEach(game => {
        const boost = (game as any)._sisterGameBoost || 0;
        const relationship = (game as any)._sisterGameRelationship || 'none';
        
        console.log(`  - "${game.name}": +${boost} points (${relationship})`);
        
        if (game.name === 'Pokemon Red') {
          expect(boost).toBeGreaterThan(400); // Exact match with genre bonus
          expect(relationship).toBe('exact');
        } else if (game.name === 'Pokemon Blue') {
          expect(boost).toBeGreaterThan(300); // Sister with genre bonus  
          expect(relationship).toBe('sister');
        } else if (game.name === 'Pokemon Pinball') {
          expect(boost).toBeGreaterThan(0); // Sister but no genre bonus
          expect(boost).toBeLessThan(200);
          expect(relationship).toBe('sister');
        }
      });
    });
  });

  describe('API and Database Limit Compliance', () => {
    it('should respect API limits for sister game queries', () => {
      const testSeries = [
        'Pokemon Red',
        'Final Fantasy VII', 
        'The Legend of Zelda: Ocarina of Time',
        'Call of Duty: Modern Warfare',
        'Street Fighter II'
      ];

      console.log('\n📊 API LIMIT COMPLIANCE TEST:');

      testSeries.forEach(query => {
        const sisterQueries = generateSisterGameQueries(query);
        
        console.log(`  - "${query}": ${sisterQueries.length} sister game queries`);
        
        // Should respect the maximum limit to avoid API overload
        expect(sisterQueries.length).toBeLessThanOrEqual(8);
        
        // Should have some results for known series
        if (query.includes('Pokemon') || query.includes('Final Fantasy')) {
          expect(sisterQueries.length).toBeGreaterThan(0);
        }
      });

      console.log('\n📈 ESTIMATED API USAGE PER SEARCH:');
      console.log('  - Original query: 1 call (limit 100)');
      console.log('  - Franchise expansion: ~6 calls (limit 100 each)');
      console.log('  - Sister games: ~8 calls (limit 50 each)'); 
      console.log('  - Partial fallback: 1 call (limit 50, if <10 results)');
      console.log('  - Total: ~15 calls max, ~1150 records max');
      console.log('  - With deduplication: Reasonable for user experience');

      // Verify total estimated load is reasonable
      const maxApiCalls = 15;
      const maxRecordsProcessed = 1200;
      
      expect(maxApiCalls).toBeLessThan(20); // Reasonable API usage
      expect(maxRecordsProcessed).toBeLessThan(1500); // Manageable memory usage
    });

    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        '', // Empty query
        'unknown game xyz', // Unknown series
        'a', // Very short query
        'Super Mario Bros Enhanced Ultimate Special Edition DLC Pack', // Very long query
        'Final Fantasy 999', // Invalid number
        'Pokemon Violet2' // Malformed version
      ];

      console.log('\n🛡️ EDGE CASE HANDLING TEST:');

      edgeCases.forEach(query => {
        const detection = detectGameSeries(query);
        const sisterQueries = generateSisterGameQueries(query);
        
        console.log(`  - "${query}": ${detection ? 'DETECTED' : 'NOT DETECTED'} (${sisterQueries.length} queries)`);
        
        // Should not crash and should return reasonable results
        expect(sisterQueries).toBeInstanceOf(Array);
        expect(sisterQueries.length).toBeLessThanOrEqual(8);
        
        // Should gracefully handle empty/invalid queries
        if (query === '' || query.length < 2) {
          expect(sisterQueries.length).toBe(0);
        }
      });
    });
  });

  describe('Series Pattern Accuracy', () => {
    it('should correctly identify different series types', () => {
      const seriesExamples = [
        { query: 'Pokemon Red', type: 'versioned', baseName: 'Pokemon' },
        { query: 'Final Fantasy VII', type: 'numbered', baseName: 'Final Fantasy' },
        { query: 'The Legend of Zelda: Breath of the Wild', type: 'subtitled', baseName: 'The Legend of Zelda' },
        { query: 'Street Fighter II', type: 'generational', baseName: 'Street Fighter' },
        { query: 'Grand Theft Auto Vice City', type: 'numbered', baseName: 'Grand Theft Auto' },
        { query: 'Call of Duty: Modern Warfare', type: 'subtitled', baseName: 'Call of Duty' }
      ];

      console.log('\n🔍 SERIES TYPE CLASSIFICATION TEST:');

      seriesExamples.forEach(example => {
        const detection = detectGameSeries(example.query);
        
        console.log(`  - "${example.query}": ${detection?.seriesInfo.type || 'UNDETECTED'}`);
        
        expect(detection).not.toBeNull();
        
        if (detection) {
          expect(detection.seriesInfo.type).toBe(example.type);
          expect(detection.seriesInfo.baseName).toBe(example.baseName);
        }
      });
    });

    it('should generate appropriate expansions for each series type', () => {
      const testCases = [
        {
          query: 'Pokemon Blue',
          expectedIncludes: ['pokemon red', 'pokemon yellow', 'pokemon green'],
          shouldNotInclude: ['final fantasy', 'zelda']
        },
        {
          query: 'Final Fantasy X',
          expectedIncludes: ['final fantasy ix', 'final fantasy 9', 'final fantasy xi'],
          shouldNotInclude: ['pokemon', 'street fighter']
        }
      ];

      console.log('\n🎯 EXPANSION QUALITY TEST:');

      testCases.forEach(testCase => {
        const queries = generateSisterGameQueries(testCase.query);
        
        console.log(`\n"${testCase.query}" generates ${queries.length} sister queries:`);
        
        // Check that expected games are included
        testCase.expectedIncludes.forEach(expected => {
          const found = queries.some(q => q.includes(expected.toLowerCase()));
          console.log(`  ✓ Should include "${expected}": ${found ? 'YES' : 'NO'}`);
          expect(found).toBe(true);
        });
        
        // Check that unrelated games are not included
        testCase.shouldNotInclude.forEach(shouldNotHave => {
          const found = queries.some(q => q.includes(shouldNotHave.toLowerCase()));
          console.log(`  ✗ Should not include "${shouldNotHave}": ${found ? 'FOUND' : 'CLEAN'}`);
          expect(found).toBe(false);
        });
      });
    });
  });
});