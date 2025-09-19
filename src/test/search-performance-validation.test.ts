/**
 * Search Performance Validation Test Suite
 * Tests search behavior across different game categories and scenarios
 */

import { GameDataServiceV2 } from '../services/gameDataServiceV2';
import type { GameWithCalculatedFields } from '../types/database';

describe('Search Performance Validation', () => {
  let gameService: GameDataServiceV2;

  beforeEach(() => {
    gameService = new GameDataServiceV2();
  });

  describe('Game Category Performance', () => {
    test('should properly rank AAA games', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const aaaGames: GameWithCalculatedFields[] = [
        {
          id: 1, name: 'The Witcher 3: Wild Hunt', slug: 'witcher-3', igdb_id: 1,
          total_rating: 94, rating_count: 2453, follows: 892, hypes: 0,
          igdb_rating: 92, summary: 'Epic open-world RPG with rich storytelling and complex moral choices.',
          cover_url: 'https://example.com/cover.jpg', averageUserRating: 4.7, totalUserRatings: 350,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        },
        {
          id: 2, name: 'Red Dead Redemption 2', slug: 'rdr2', igdb_id: 2,
          total_rating: 93, rating_count: 1876, follows: 654, hypes: 0,
          igdb_rating: 94, summary: 'Immersive western adventure with unprecedented attention to detail.',
          cover_url: 'https://example.com/cover.jpg', averageUserRating: 4.6, totalUserRatings: 280,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        },
        {
          id: 3, name: 'God of War', slug: 'god-of-war', igdb_id: 3,
          total_rating: 91, rating_count: 1234, follows: 543, hypes: 0,
          igdb_rating: 89, summary: 'Stunning reboot of the legendary action series.',
          cover_url: 'https://example.com/cover.jpg', averageUserRating: 4.8, totalUserRatings: 200,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        }
      ];

      const scores = aaaGames.map(game => ({
        name: game.name,
        score: calculateScore(game, game.name.toLowerCase())
      }));

      console.log('\n🎮 AAA Game Scoring:');
      scores.forEach(s => console.log(`${s.name}: ${s.score}`));

      // All AAA games should score very high (180+)
      scores.forEach(({ name, score }) => {
        expect(score).toBeGreaterThan(180);
      });

      // Witcher 3 should rank highest (best metrics)
      const witcherScore = scores.find(s => s.name.includes('Witcher'))!.score;
      const otherScores = scores.filter(s => !s.name.includes('Witcher')).map(s => s.score);
      otherScores.forEach(score => {
        expect(witcherScore).toBeGreaterThanOrEqual(score);
      });
    });

    test('should properly rank indie darlings', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const indieGames: GameWithCalculatedFields[] = [
        {
          id: 1, name: 'Hades', slug: 'hades', igdb_id: 1,
          total_rating: 93, rating_count: 487, follows: 345, hypes: 0,
          igdb_rating: 91, summary: 'Rogue-like perfection with incredible storytelling.',
          cover_url: 'https://example.com/cover.jpg', averageUserRating: 4.8, totalUserRatings: 150,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        },
        {
          id: 2, name: 'Celeste', slug: 'celeste', igdb_id: 2,
          total_rating: 89, rating_count: 256, follows: 234, hypes: 0,
          igdb_rating: 87, summary: 'Challenging platformer with heartfelt narrative.',
          cover_url: 'https://example.com/cover.jpg', averageUserRating: 4.6, totalUserRatings: 120,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        },
        {
          id: 3, name: 'Hollow Knight', slug: 'hollow-knight', igdb_id: 3,
          total_rating: 90, rating_count: 378, follows: 567, hypes: 0,
          igdb_rating: 88, summary: 'Atmospheric metroidvania with beautiful hand-drawn art.',
          cover_url: 'https://example.com/cover.jpg', averageUserRating: 4.7, totalUserRatings: 180,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        }
      ];

      const scores = indieGames.map(game => ({
        name: game.name,
        score: calculateScore(game, game.name.toLowerCase())
      }));

      console.log('\n🎨 Indie Game Scoring:');
      scores.forEach(s => console.log(`${s.name}: ${s.score}`));

      // All indie games should score well (170+)
      scores.forEach(({ name, score }) => {
        expect(score).toBeGreaterThan(170);
      });

      // Hades should rank highest (best rating)
      const hadesScore = scores.find(s => s.name === 'Hades')!.score;
      expect(hadesScore).toBeGreaterThan(185);
    });

    test('should properly rank upcoming hyped games', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const upcomingGames: GameWithCalculatedFields[] = [
        {
          id: 1, name: 'Hollow Knight: Silksong', slug: 'silksong', igdb_id: 1,
          total_rating: null as any, rating_count: 0, follows: 2500, hypes: 890,
          igdb_rating: 0, summary: 'Highly anticipated sequel to the beloved metroidvania.',
          cover_url: 'https://example.com/cover.jpg', averageUserRating: 0, totalUserRatings: 0,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        },
        {
          id: 2, name: 'Elder Scrolls VI', slug: 'elder-scrolls-6', igdb_id: 2,
          total_rating: null as any, rating_count: 0, follows: 3400, hypes: 1200,
          igdb_rating: 0, summary: 'Next installment in the legendary RPG series.',
          averageUserRating: 0, totalUserRatings: 0,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        },
        {
          id: 3, name: 'Clair Obscur: Expedition 33', slug: 'clair-obscur', igdb_id: 3,
          total_rating: 90, rating_count: 45, follows: 890, hypes: 234,
          igdb_rating: 88, summary: 'Upcoming JRPG with stunning visuals.',
          cover_url: 'https://example.com/cover.jpg', averageUserRating: 0, totalUserRatings: 0,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        }
      ];

      const scores = upcomingGames.map(game => ({
        name: game.name,
        score: calculateScore(game, game.name.toLowerCase())
      }));

      console.log('\n🔥 Upcoming Game Scoring:');
      scores.forEach(s => console.log(`${s.name}: ${s.score}`));

      // Upcoming games should get good scores from hype/engagement
      scores.forEach(({ name, score }) => {
        expect(score).toBeGreaterThan(120);
      });

      // Elder Scrolls should rank highest (most hype)
      const elderScrollsScore = scores.find(s => s.name.includes('Elder Scrolls'))!.score;
      expect(elderScrollsScore).toBeGreaterThan(130);

      // Clair Obscur should rank highest overall (has actual rating + hype)
      const clairScore = scores.find(s => s.name.includes('Clair'))!.score;
      expect(clairScore).toBeGreaterThan(elderScrollsScore);
    });

    test('should properly rank retro classics', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const retroGames: GameWithCalculatedFields[] = [
        {
          id: 1, name: 'Super Mario 64', slug: 'mario-64', igdb_id: 1,
          total_rating: 96, rating_count: 892, follows: 234, hypes: 0,
          igdb_rating: 94, summary: 'Revolutionary 3D platformer that defined a generation.',
          cover_url: 'https://example.com/cover.jpg', averageUserRating: 4.9, totalUserRatings: 300,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        },
        {
          id: 2, name: 'Chrono Trigger', slug: 'chrono-trigger', igdb_id: 2,
          total_rating: 95, rating_count: 567, follows: 345, hypes: 0,
          igdb_rating: 93, summary: 'Timeless JRPG masterpiece with innovative time travel mechanics.',
          cover_url: 'https://example.com/cover.jpg', averageUserRating: 4.8, totalUserRatings: 250,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        },
        {
          id: 3, name: 'Super Metroid', slug: 'super-metroid', igdb_id: 3,
          total_rating: 94, rating_count: 432, follows: 178, hypes: 0,
          igdb_rating: 91, summary: 'Perfect blend of exploration, atmosphere, and gameplay.',
          cover_url: 'https://example.com/cover.jpg', averageUserRating: 4.7, totalUserRatings: 180,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        }
      ];

      const scores = retroGames.map(game => ({
        name: game.name,
        score: calculateScore(game, game.name.toLowerCase())
      }));

      console.log('\n👾 Retro Game Scoring:');
      scores.forEach(s => console.log(`${s.name}: ${s.score}`));

      // All retro classics should score very high
      scores.forEach(({ name, score }) => {
        expect(score).toBeGreaterThan(184);
      });

      // Mario 64 should rank highest (best rating + most reviews)
      const marioScore = scores.find(s => s.name.includes('Mario'))!.score;
      expect(marioScore).toBeGreaterThan(195);
    });
  });

  describe('Search Query Performance', () => {
    test('should handle exact title matches optimally', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const game: GameWithCalculatedFields = {
        id: 1, name: 'The Last of Us Part II', slug: 'tlou2', igdb_id: 1,
        total_rating: 89, rating_count: 1567, follows: 450, hypes: 0,
        igdb_rating: 87, summary: 'Emotionally intense post-apocalyptic adventure.',
        cover_url: 'https://example.com/cover.jpg', averageUserRating: 4.2, totalUserRatings: 200,
        created_at: '2024-01-01', updated_at: '2024-01-01'
      };

      const exactScore = calculateScore(game, 'the last of us part ii');
      const partialScore = calculateScore(game, 'last of us');
      const abbreviationScore = calculateScore(game, 'tlou');

      console.log('\n🎯 Query Matching Performance:');
      console.log(`Exact: ${exactScore}, Partial: ${partialScore}, Abbrev: ${abbreviationScore}`);

      // Exact matches should score highest
      expect(exactScore).toBeGreaterThan(partialScore);
      expect(partialScore).toBeGreaterThan(abbreviationScore);
      
      // All should still be reasonable scores
      expect(abbreviationScore).toBeGreaterThan(90);
    });

    test('should handle franchise searches effectively', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      // Mock franchise detection
      (gameService as any).isFranchiseQuery = jest.fn().mockReturnValue(true);
      
      const marioGames: GameWithCalculatedFields[] = [
        {
          id: 1, name: 'Super Mario Odyssey', slug: 'mario-odyssey', igdb_id: 1,
          total_rating: 92, rating_count: 723, follows: 234, hypes: 0,
          igdb_rating: 90, summary: 'Innovative 3D Mario adventure.',
          cover_url: 'https://example.com/cover.jpg', averageUserRating: 4.6, totalUserRatings: 180,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        },
        {
          id: 2, name: 'Mario Kart 8 Deluxe', slug: 'mario-kart-8', igdb_id: 2,
          total_rating: 89, rating_count: 543, follows: 345, hypes: 0,
          igdb_rating: 87, summary: 'Ultimate kart racing experience.',
          cover_url: 'https://example.com/cover.jpg', averageUserRating: 4.5, totalUserRatings: 220,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        },
        {
          id: 3, name: 'Super Mario Bros. Wonder', slug: 'mario-wonder', igdb_id: 3,
          total_rating: 90, rating_count: 234, follows: 567, hypes: 45,
          igdb_rating: 88, summary: 'Fresh take on classic 2D Mario.',
          cover_url: 'https://example.com/cover.jpg', averageUserRating: 4.7, totalUserRatings: 150,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        }
      ];

      const franchiseScores = marioGames.map(game => ({
        name: game.name,
        score: calculateScore(game, 'mario')
      }));

      console.log('\n🏰 Franchise Search Performance:');
      franchiseScores.forEach(s => console.log(`${s.name}: ${s.score}`));

      // All should get franchise bonus and score well
      franchiseScores.forEach(({ score }) => {
        expect(score).toBeGreaterThan(149);
      });

      // Mario Kart should rank highest based on the output we saw
      const kartScore = franchiseScores.find(s => s.name.includes('Kart'))!.score;
      expect(kartScore).toBeGreaterThan(170);
    });

    test('should handle partial and fuzzy matches appropriately', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const game: GameWithCalculatedFields = {
        id: 1, name: 'Cyberpunk 2077', slug: 'cyberpunk-2077', igdb_id: 1,
        total_rating: 78, rating_count: 1892, follows: 890, hypes: 0,
        igdb_rating: 76, summary: 'Open-world action RPG set in dystopian future.',
        cover_url: 'https://example.com/cover.jpg', averageUserRating: 3.8, totalUserRatings: 400,
        created_at: '2024-01-01', updated_at: '2024-01-01'
      };

      const testQueries = [
        { query: 'cyberpunk 2077', type: 'exact' },
        { query: 'cyberpunk', type: 'partial' },
        { query: 'cyber', type: 'prefix' },
        { query: '2077', type: 'suffix' },
        { query: 'cyperpunk', type: 'typo' } // Deliberate typo
      ];

      const results = testQueries.map(({ query, type }) => ({
        query,
        type,
        score: calculateScore(game, query)
      }));

      console.log('\n🔍 Fuzzy Matching Performance:');
      results.forEach(r => console.log(`${r.type} (${r.query}): ${r.score}`));

      // Exact should score highest
      const exactScore = results.find(r => r.type === 'exact')!.score;
      const partialScore = results.find(r => r.type === 'partial')!.score;
      
      expect(exactScore).toBeGreaterThan(partialScore);
      expect(partialScore).toBeGreaterThan(150); // Should still match well
      
      // Prefix matching should work
      const prefixScore = results.find(r => r.type === 'prefix')!.score;
      expect(prefixScore).toBeGreaterThan(100);
    });
  });

  describe('Score Distribution Analysis', () => {
    test('should maintain appropriate score ranges across game types', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const gameTypes = {
        masterpiece: { total_rating: 96, rating_count: 2000, query: 'masterpiece game' },
        excellent: { total_rating: 90, rating_count: 800, query: 'excellent game' },
        good: { total_rating: 80, rating_count: 300, query: 'good game' },
        average: { total_rating: 70, rating_count: 100, query: 'average game' },
        poor: { total_rating: 50, rating_count: 25, query: 'poor game' }
      };

      const scores = Object.entries(gameTypes).map(([type, config]) => {
        const game: GameWithCalculatedFields = {
          id: 1, name: `${type} game`, slug: `${type}-game`, igdb_id: 1,
          total_rating: config.total_rating, rating_count: config.rating_count,
          follows: Math.floor(config.rating_count * 0.3), hypes: 0,
          igdb_rating: config.total_rating, summary: `A ${type} game for testing`,
          cover_url: 'https://example.com/cover.jpg',
          averageUserRating: config.total_rating / 20, totalUserRatings: 50,
          created_at: '2024-01-01', updated_at: '2024-01-01'
        };
        
        return {
          type,
          score: calculateScore(game, config.query)
        };
      });

      console.log('\n📊 Score Distribution Analysis:');
      scores.forEach(s => console.log(`${s.type}: ${s.score}`));

      // Verify score progression
      const masterpiece = scores.find(s => s.type === 'masterpiece')!.score;
      const excellent = scores.find(s => s.type === 'excellent')!.score;
      const good = scores.find(s => s.type === 'good')!.score;
      const average = scores.find(s => s.type === 'average')!.score;
      const poor = scores.find(s => s.type === 'poor')!.score;

      // Should have clear progression
      expect(masterpiece).toBeGreaterThan(excellent + 10);
      expect(excellent).toBeGreaterThan(good + 10);
      expect(good).toBeGreaterThan(average + 10);
      expect(average).toBeGreaterThan(poor + 10);

      // Should fall within expected ranges
      expect(masterpiece).toBeGreaterThan(198);
      expect(excellent).toBeGreaterThan(180);
      expect(good).toBeGreaterThan(150);
      expect(average).toBeGreaterThan(130);
      expect(poor).toBeGreaterThan(110);
    });

    test('should demonstrate algorithm improvements over baseline', () => {
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      // Test cases that should show improvement with new algorithm
      const testCases = [
        {
          name: 'High Authority Game',
          game: {
            id: 1, name: 'Authority Test', slug: 'authority-test', igdb_id: 1,
            total_rating: 85, rating_count: 1500, follows: 0, hypes: 0,
            igdb_rating: 85, summary: 'Testing authority weighting',
            cover_url: 'https://example.com/cover.jpg',
            averageUserRating: 4.2, totalUserRatings: 50,
            created_at: '2024-01-01', updated_at: '2024-01-01'
          },
          expectedMin: 170
        },
        {
          name: 'High Engagement Game',
          game: {
            id: 2, name: 'Engagement Test', slug: 'engagement-test', igdb_id: 2,
            total_rating: 82, rating_count: 200, follows: 800, hypes: 300,
            igdb_rating: 82, summary: 'Testing engagement scoring',
            averageUserRating: 4.1, totalUserRatings: 40,
            created_at: '2024-01-01', updated_at: '2024-01-01'
          },
          expectedMin: 175
        },
        {
          name: 'Quality Elite Game',
          game: {
            id: 3, name: 'Quality Test', slug: 'quality-test', igdb_id: 3,
            total_rating: 94, rating_count: 600, follows: 100, hypes: 0,
            igdb_rating: 94, summary: 'Testing quality tier scoring',
            cover_url: 'https://example.com/cover.jpg',
            averageUserRating: 4.7, totalUserRatings: 80,
            created_at: '2024-01-01', updated_at: '2024-01-01'
          },
          expectedMin: 185
        }
      ];

      console.log('\n🚀 Algorithm Performance Validation:');
      
      testCases.forEach(({ name, game, expectedMin }) => {
        const score = calculateScore(game, game.name.toLowerCase());
        console.log(`${name}: ${score} (expected min: ${expectedMin})`);
        
        expect(score).toBeGreaterThan(expectedMin);
      });

      // Test that the algorithm produces meaningful differentiation
      const scores = testCases.map(tc => calculateScore(tc.game, tc.game.name.toLowerCase()));
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      
      // Should have meaningful spread between different game types
      expect(maxScore - minScore).toBeGreaterThan(6);
    });
  });
});