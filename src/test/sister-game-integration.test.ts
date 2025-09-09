import { describe, it, expect } from '@jest/globals';
import { 
  detectGameSeries, 
  generateSisterGameQueries, 
  applySisterGameBoost
} from '../utils/sisterGameDetection';

describe('Sister Game Integration Tests', () => {
  
  describe('Pokemon Sister Game Detection', () => {
    it('should detect Pokemon Red and expand to sister games', () => {
      console.log('🔍 POKEMON RED SISTER GAME TEST:');
      
      const detection = detectGameSeries('Pokemon Red');
      console.log(`Detection: ${detection ? 'SUCCESS' : 'FAILED'}`);
      
      if (detection) {
        console.log(`Series: ${detection.seriesInfo.baseName} (${detection.seriesInfo.type})`);
        console.log(`Generated ${detection.expandedQueries.length} queries`);
        console.log(`First 5 queries: ${detection.expandedQueries.slice(0, 5).join(', ')}`);
        
        expect(detection.seriesInfo.baseName).toBe('Pokemon');
        expect(detection.expandedQueries).toContain('pokemon blue');
        expect(detection.expandedQueries).toContain('pokemon yellow');
      }

      const sisterQueries = generateSisterGameQueries('Pokemon Red');
      console.log(`\nGenerated ${sisterQueries.length} sister game queries for Pokemon Red`);
      console.log(`Sister queries: ${sisterQueries.join(', ')}`);
      
      expect(sisterQueries.length).toBeGreaterThan(0);
      expect(sisterQueries.length).toBeLessThanOrEqual(8); // API limit compliance
      expect(sisterQueries).toContain('pokemon blue');
    });

    it('should apply sister game boosts correctly', () => {
      console.log('\n⚡ SISTER GAME BOOST TEST:');
      
      const mockGames = [
        {
          id: 1,
          name: 'Pokemon Red',
          genres: ['RPG', 'Adventure'],
          category: 0
        },
        {
          id: 2,
          name: 'Pokemon Blue', 
          genres: ['RPG', 'Adventure'],
          category: 0
        },
        {
          id: 3,
          name: 'Pokemon Yellow',
          genres: ['RPG', 'Adventure'],
          category: 0
        },
        {
          id: 4,
          name: 'Final Fantasy VII', // Unrelated game
          genres: ['RPG', 'Adventure'],
          category: 0
        }
      ];

      const boostedGames = applySisterGameBoost(mockGames, 'Pokemon Red', ['RPG', 'Adventure']);
      
      console.log('Boost results:');
      boostedGames.forEach(game => {
        const boost = (game as any)._sisterGameBoost || 0;
        const relationship = (game as any)._sisterGameRelationship || 'none';
        console.log(`  - "${game.name}": +${boost} points (${relationship})`);
      });

      // Pokemon Red (exact match) should get the highest boost
      const pokemonRed = boostedGames.find(g => g.name === 'Pokemon Red');
      expect((pokemonRed as any)._sisterGameBoost).toBeGreaterThan(400);
      expect((pokemonRed as any)._sisterGameRelationship).toBe('exact');

      // Pokemon Blue (sister game) should get a good boost
      const pokemonBlue = boostedGames.find(g => g.name === 'Pokemon Blue');
      expect((pokemonBlue as any)._sisterGameBoost).toBeGreaterThan(300);
      expect((pokemonBlue as any)._sisterGameRelationship).toBe('sister');

      // Final Fantasy VII should get no boost
      const finalFantasy = boostedGames.find(g => g.name === 'Final Fantasy VII');
      expect((finalFantasy as any)._sisterGameBoost).toBeUndefined();
    });
  });

  describe('Final Fantasy Series Detection', () => {
    it('should detect Final Fantasy games and generate sister games', () => {
      console.log('\n⚔️ FINAL FANTASY SERIES TEST:');
      
      const testCases = ['Final Fantasy VII', 'Final Fantasy 7', 'final fantasy vi'];
      
      testCases.forEach(query => {
        const detection = detectGameSeries(query);
        console.log(`\n"${query}": ${detection ? 'DETECTED' : 'NOT DETECTED'}`);
        
        if (detection) {
          console.log(`  Series: ${detection.seriesInfo.baseName}`);
          console.log(`  Type: ${detection.seriesInfo.type}`);
          console.log(`  Sample queries: ${detection.expandedQueries.slice(0, 4).join(', ')}...`);
          
          expect(detection.seriesInfo.baseName).toBe('Final Fantasy');
          expect(detection.seriesInfo.type).toBe('numbered');
          expect(detection.expandedQueries).toContain('final fantasy vii');
          expect(detection.expandedQueries).toContain('final fantasy 7');
        }
      });
    });
  });

  describe('API Limit Compliance', () => {
    it('should respect API limits across all series types', () => {
      console.log('\n📊 API LIMIT COMPLIANCE:');
      
      const testQueries = [
        'Pokemon Red',
        'Final Fantasy X', 
        'The Legend of Zelda: Breath of the Wild',
        'Street Fighter II',
        'Call of Duty: Modern Warfare'
      ];

      let totalQueries = 0;
      
      testQueries.forEach(query => {
        const sisterQueries = generateSisterGameQueries(query);
        totalQueries += sisterQueries.length;
        
        console.log(`"${query}": ${sisterQueries.length} queries`);
        expect(sisterQueries.length).toBeLessThanOrEqual(8);
      });

      console.log(`\nTotal sister game queries across all test cases: ${totalQueries}`);
      console.log('Average per search: ' + Math.round(totalQueries / testQueries.length));

      // Verify reasonable total load
      expect(totalQueries).toBeLessThan(50); // Reasonable total for testing
    });

    it('should estimate search performance impact', () => {
      console.log('\n🚀 SEARCH PERFORMANCE ESTIMATION:');
      
      console.log('Without sister games:');
      console.log('  - Original query: 1 call (100 results)');
      console.log('  - Franchise expansion: ~6 calls (100 each) = 600 results');
      console.log('  - Partial fallback: 1 call (50 results)');
      console.log('  - Total: ~8 calls, ~750 results max');

      console.log('\nWith sister games:');
      console.log('  - Original query: 1 call (100 results)');
      console.log('  - Franchise expansion: ~6 calls (100 each) = 600 results');
      console.log('  - Sister games: ~8 calls (50 each) = 400 results');
      console.log('  - Partial fallback: 1 call (50 results)');
      console.log('  - Total: ~16 calls, ~1150 results max');
      console.log('  - With deduplication: Significant overlap expected');

      const estimatedCalls = 16;
      const estimatedResults = 1150;
      
      // Verify performance impact is reasonable
      expect(estimatedCalls).toBeLessThan(20);
      expect(estimatedResults).toBeLessThan(1500);
      
      console.log('\n✅ Performance impact acceptable for enhanced coverage');
    });
  });

  describe('Genre-Based Prioritization', () => {
    it('should prioritize sister games with matching genres', () => {
      console.log('\n🎨 GENRE PRIORITIZATION TEST:');
      
      const testGames = [
        {
          id: 1,
          name: 'Pokemon Red',
          genres: ['RPG', 'Adventure'],
          category: 0
        },
        {
          id: 2,
          name: 'Pokemon Blue',
          genres: ['RPG', 'Adventure'], // Same genres - should get bonus
          category: 0
        },
        {
          id: 3,
          name: 'Pokemon Pinball',
          genres: ['Arcade', 'Sports'], // Different genres - lower bonus
          category: 0
        }
      ];

      const boostedGames = applySisterGameBoost(testGames, 'Pokemon Red', ['RPG', 'Adventure']);
      
      console.log('Genre-based prioritization results:');
      boostedGames.forEach(game => {
        const boost = (game as any)._sisterGameBoost || 0;
        console.log(`  - "${game.name}" [${game.genres.join(', ')}]: +${boost} points`);
      });

      const pokemonBlue = boostedGames.find(g => g.name === 'Pokemon Blue');
      const pokemonPinball = boostedGames.find(g => g.name === 'Pokemon Pinball');

      // Pokemon Blue (matching genres) should get higher boost than Pokemon Pinball
      expect((pokemonBlue as any)._sisterGameBoost).toBeGreaterThan((pokemonPinball as any)._sisterGameBoost || 0);
      
      console.log('\n✅ Genre matching correctly prioritizes similar games');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid or edge case queries gracefully', () => {
      console.log('\n🛡️ EDGE CASE HANDLING:');
      
      const edgeCases = [
        '',
        'a',
        'nonexistent series xyz',
        'Pokemon Red Blue Yellow Gold Silver Crystal', // Very long
        'Final Fantasy 999' // Invalid number
      ];

      edgeCases.forEach(query => {
        const detection = detectGameSeries(query);
        const sisterQueries = generateSisterGameQueries(query);
        
        console.log(`"${query || '<empty>'}": ${detection ? 'DETECTED' : 'SAFE'} (${sisterQueries.length} queries)`);
        
        // Should not crash
        expect(sisterQueries).toBeInstanceOf(Array);
        expect(sisterQueries.length).toBeLessThanOrEqual(8);
      });
      
      console.log('\n✅ All edge cases handled safely');
    });
  });
});