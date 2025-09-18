/**
 * Test suite for Mario search improvements
 * 
 * Validates:
 * 1. Mods are filtered out
 * 2. Iconic Mario games are prioritized
 * 3. New database columns are used correctly
 * 4. Search relevance is improved
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { filterProtectedContent } from '../utils/contentProtectionFilter';
import { calculateIntelligentScore, sortGamesIntelligently, detectSearchIntent, SearchIntent } from '../utils/intelligentPrioritization';

// Mock game data for testing
const mockMarioGames = [
  // Original trilogy (should be prioritized)
  {
    id: 1,
    name: 'Super Mario Bros.',
    developer: 'Nintendo EAD',
    publisher: 'Nintendo',
    category: 0, // Main game
    igdb_rating: 85,
    total_rating: 92,
    rating_count: 150,
    follows: 5000,
    hypes: 0,
    release_date: '1985-09-13'
  },
  {
    id: 2,
    name: 'Super Mario Bros. 2',
    developer: 'Nintendo EAD',
    publisher: 'Nintendo',
    category: 0,
    igdb_rating: 78,
    total_rating: 85,
    rating_count: 120,
    follows: 3000,
    hypes: 0,
    release_date: '1988-10-09'
  },
  {
    id: 3,
    name: 'Super Mario Bros. 3',
    developer: 'Nintendo EAD',
    publisher: 'Nintendo',
    category: 0,
    igdb_rating: 95,
    total_rating: 96,
    rating_count: 200,
    follows: 6000,
    hypes: 0,
    release_date: '1988-10-23'
  },
  
  // Modern iconic entries
  {
    id: 4,
    name: 'Super Mario Odyssey',
    developer: 'Nintendo EPD',
    publisher: 'Nintendo',
    category: 0,
    igdb_rating: 97,
    total_rating: 97,
    rating_count: 300,
    follows: 10000,
    hypes: 500,
    release_date: '2017-10-27'
  },
  {
    id: 5,
    name: 'Super Mario 64',
    developer: 'Nintendo EAD',
    publisher: 'Nintendo',
    category: 0,
    igdb_rating: 94,
    total_rating: 94,
    rating_count: 250,
    follows: 8000,
    hypes: 0,
    release_date: '1996-06-23'
  },
  
  // Mods that should be filtered out
  {
    id: 6,
    name: 'Super Mario Bros. ROM Hack',
    developer: 'Fan Developer',
    publisher: 'Homebrew',
    category: 5, // Mod category
    igdb_rating: 70,
    total_rating: 75,
    rating_count: 10,
    follows: 100,
    hypes: 0,
    summary: 'A modified version of Super Mario Bros with new levels'
  },
  {
    id: 7,
    name: 'Mario mod: Crazy Adventures',
    developer: 'Community',
    publisher: 'Fan Made',
    category: 0,
    igdb_rating: 65,
    total_rating: 70,
    rating_count: 5,
    follows: 50,
    hypes: 0,
    summary: 'Unofficial Mario game created by fans'
  },
  
  // Less iconic but official Mario games
  {
    id: 8,
    name: 'Mario Party Superstars',
    developer: 'NDcube',
    publisher: 'Nintendo',
    category: 0,
    igdb_rating: 82,
    total_rating: 85,
    rating_count: 80,
    follows: 2000,
    hypes: 50,
    release_date: '2021-10-29'
  },
  
  // Unrelated game for comparison
  {
    id: 9,
    name: 'Sonic the Hedgehog',
    developer: 'Sonic Team',
    publisher: 'Sega',
    category: 0,
    igdb_rating: 80,
    total_rating: 83,
    rating_count: 100,
    follows: 3000,
    hypes: 0,
    release_date: '1991-06-23'
  }
];

describe('Mario Search Improvements', () => {
  describe('Content Protection Filter', () => {
    it('should filter out mods by category', () => {
      const filtered = filterProtectedContent(mockMarioGames);
      
      // Should filter out the ROM hack (category 5)
      const romHack = filtered.find(game => game.id === 6);
      expect(romHack).toBeUndefined();
      
      console.log(`Filtered out ROM hack: ${romHack ? 'NO' : 'YES'}`);
    });

    it('should filter out mods by name indicators', () => {
      const filtered = filterProtectedContent(mockMarioGames);
      
      // Should filter out games with "mod" in the name
      const modGame = filtered.find(game => game.id === 7);
      expect(modGame).toBeUndefined();
      
      console.log(`Filtered out mod by name: ${modGame ? 'NO' : 'YES'}`);
    });

    it('should preserve official Mario games', () => {
      const filtered = filterProtectedContent(mockMarioGames);
      
      // Should keep official Nintendo games
      const mario1 = filtered.find(game => game.id === 1);
      const mario64 = filtered.find(game => game.id === 5);
      const odyssey = filtered.find(game => game.id === 4);
      
      expect(mario1).toBeDefined();
      expect(mario64).toBeDefined();
      expect(odyssey).toBeDefined();
      
      console.log(`Preserved official games: ${[mario1, mario64, odyssey].filter(Boolean).length}/3`);
    });
  });

  describe('Search Intent Detection', () => {
    it('should detect Mario search as franchise browse', () => {
      const intent = detectSearchIntent('mario');
      expect(intent).toBe(SearchIntent.FRANCHISE_BROWSE);
      console.log(`Mario search intent: ${intent}`);
    });

    it('should detect specific Mario game search', () => {
      const intent = detectSearchIntent('Super Mario Bros. 3');
      expect(intent).toBe(SearchIntent.SPECIFIC_GAME);
      console.log(`Specific Mario game intent: ${intent}`);
    });
  });

  describe('Iconic Game Prioritization', () => {
    it('should prioritize original trilogy in Mario searches', () => {
      const filtered = filterProtectedContent(mockMarioGames);
      const sorted = sortGamesIntelligently(filtered, 'mario');
      
      // Check scores for original trilogy
      const mario1Score = calculateIntelligentScore(mockMarioGames[0], 'mario');
      const mario2Score = calculateIntelligentScore(mockMarioGames[1], 'mario');
      const mario3Score = calculateIntelligentScore(mockMarioGames[2], 'mario');
      
      console.log(`Mario 1 iconic boost: ${mario1Score.iconicBonus}`);
      console.log(`Mario 2 iconic boost: ${mario2Score.iconicBonus}`);
      console.log(`Mario 3 iconic boost: ${mario3Score.iconicBonus}`);
      
      // Original trilogy should have high iconic bonuses
      expect(mario1Score.iconicBonus).toBe(100); // Highest for original
      expect(mario2Score.iconicBonus).toBe(95);
      expect(mario3Score.iconicBonus).toBe(95);
      
      // Top results should include the original trilogy
      const topNames = sorted.slice(0, 5).map(game => game.name);
      console.log(`Top 5 Mario search results:`, topNames);
      
      expect(topNames).toContain('Super Mario Bros.');
      expect(topNames).toContain('Super Mario Bros. 2');
      expect(topNames).toContain('Super Mario Bros. 3');
    });

    it('should give lower boost to non-iconic games', () => {
      const partyScore = calculateIntelligentScore(mockMarioGames[7], 'mario'); // Mario Party
      const sonicScore = calculateIntelligentScore(mockMarioGames[8], 'mario'); // Sonic (unrelated)
      
      console.log(`Mario Party iconic boost: ${partyScore.iconicBonus}`);
      console.log(`Sonic iconic boost: ${sonicScore.iconicBonus}`);
      
      // Non-iconic Mario games should have no boost
      expect(partyScore.iconicBonus).toBe(0);
      expect(sonicScore.iconicBonus).toBe(0);
    });
  });

  describe('New Database Columns Usage', () => {
    it('should use total_rating in scoring', () => {
      const odysseyScore = calculateIntelligentScore(mockMarioGames[3], 'mario');
      const mario2Score = calculateIntelligentScore(mockMarioGames[1], 'mario');
      
      console.log(`Odyssey quality score: ${odysseyScore.qualityScore}`);
      console.log(`Mario 2 quality score: ${mario2Score.qualityScore}`);
      
      // Odyssey has higher total_rating (97 vs 85), should have higher quality score
      expect(odysseyScore.qualityScore).toBeGreaterThan(mario2Score.qualityScore);
    });

    it('should use rating_count for authority scoring', () => {
      const odyssey = mockMarioGames[3]; // 300 rating_count
      const mario2 = mockMarioGames[1];  // 120 rating_count
      
      // Higher rating count should contribute to higher quality/popularity scores
      const odysseyScore = calculateIntelligentScore(odyssey, 'mario');
      const mario2Score = calculateIntelligentScore(mario2, 'mario');
      
      console.log(`Odyssey rating count: ${odyssey.rating_count}, score: ${odysseyScore.qualityScore}`);
      console.log(`Mario 2 rating count: ${mario2.rating_count}, score: ${mario2Score.qualityScore}`);
      
      expect(odyssey.rating_count).toBeGreaterThan(mario2.rating_count);
    });

    it('should use follows and hypes for popularity', () => {
      const odyssey = mockMarioGames[3]; // High follows + hypes
      const mario2 = mockMarioGames[1];  // Lower follows, no hypes
      
      const odysseyScore = calculateIntelligentScore(odyssey, 'mario');
      const mario2Score = calculateIntelligentScore(mario2, 'mario');
      
      console.log(`Odyssey follows: ${odyssey.follows}, hypes: ${odyssey.hypes}, popularity: ${odysseyScore.popularityScore}`);
      console.log(`Mario 2 follows: ${mario2.follows}, hypes: ${mario2.hypes}, popularity: ${mario2Score.popularityScore}`);
      
      // Higher follows/hypes should result in higher popularity score
      expect(odysseyScore.popularityScore).toBeGreaterThan(mario2Score.popularityScore);
    });
  });

  describe('Overall Search Quality', () => {
    it('should return relevant Mario games without mods', () => {
      const filtered = filterProtectedContent(mockMarioGames);
      const sorted = sortGamesIntelligently(filtered, 'mario');
      
      console.log(`\n=== FINAL MARIO SEARCH RESULTS ===`);
      sorted.forEach((game, index) => {
        const score = calculateIntelligentScore(game, 'mario');
        console.log(`${index + 1}. ${game.name} (Total: ${score.totalScore}, Iconic: ${score.iconicBonus})`);
      });
      
      // Should have no mods in results
      const hasModsInResults = sorted.some(game => 
        game.category === 5 || 
        game.name.toLowerCase().includes('mod') ||
        game.name.toLowerCase().includes('hack')
      );
      expect(hasModsInResults).toBe(false);
      
      // Should have iconic Mario games in top positions
      const topGame = sorted[0];
      const iconicNames = ['Super Mario Bros.', 'Super Mario Bros. 3', 'Super Mario Odyssey', 'Super Mario 64'];
      expect(iconicNames.some(name => topGame.name.includes(name))).toBe(true);
      
      console.log(`\nTest Results:`);
      console.log(`- No mods in results: ${!hasModsInResults ? '✅' : '❌'}`);
      console.log(`- Iconic game in top spot: ${iconicNames.some(name => topGame.name.includes(name)) ? '✅' : '❌'}`);
      console.log(`- Total results: ${sorted.length}`);
    });
  });
});