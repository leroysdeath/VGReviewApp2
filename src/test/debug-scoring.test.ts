/**
 * Debug Scoring Test
 * Detailed analysis of the enhanced scoring algorithm
 */

import { GameDataServiceV2 } from '../services/gameDataServiceV2';
import type { GameWithCalculatedFields } from '../types/database';

describe('Debug Scoring Algorithm', () => {
  let gameService: GameDataServiceV2;

  beforeEach(() => {
    gameService = new GameDataServiceV2();
  });

  test('should demonstrate scoring breakdown for different game types', () => {
    const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
    
    // Test Case 1: AAA Game with high metrics
    const aaaGame: GameWithCalculatedFields = {
      id: 1,
      name: 'The Witcher 3: Wild Hunt',
      slug: 'the-witcher-3',
      igdb_id: 1942,
      total_rating: 94,
      rating_count: 2453,
      follows: 892,
      hypes: 0,
      igdb_rating: 92,
      summary: 'Epic open-world RPG with stunning visuals and deep narrative. Explore a vast world filled with meaningful choices and consequences.',
      cover_url: 'https://example.com/cover.jpg',
      averageUserRating: 4.7,
      totalUserRatings: 156,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };

    // Test Case 2: Indie Gem with good ratings but fewer reviews
    const indieGame: GameWithCalculatedFields = {
      id: 2,
      name: 'Hades',
      slug: 'hades',
      igdb_id: 113,
      total_rating: 93,
      rating_count: 387,
      follows: 245,
      hypes: 0,
      igdb_rating: 91,
      summary: 'Rogue-like dungeon crawler where you defy the god of the dead as you hack and slash out of the Underworld.',
      cover_url: 'https://example.com/cover.jpg',
      averageUserRating: 4.8,
      totalUserRatings: 89,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };

    // Test Case 3: Upcoming hyped game
    const hypedGame: GameWithCalculatedFields = {
      id: 3,
      name: 'Silksong',
      slug: 'silksong',
      igdb_id: 119,
      total_rating: null,
      rating_count: 0,
      follows: 1250,
      hypes: 456,
      igdb_rating: 0,
      summary: 'Highly anticipated sequel to Hollow Knight. Play as Hornet, princess-protector of Hallownest.',
      cover_url: 'https://example.com/cover.jpg',
      averageUserRating: 0,
      totalUserRatings: 0,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };

    // Test Case 4: Classic with moderate metrics
    const classicGame: GameWithCalculatedFields = {
      id: 4,
      name: 'Super Mario 64',
      slug: 'super-mario-64',
      igdb_id: 1074,
      total_rating: 96,
      rating_count: 892,
      follows: 123,
      hypes: 0,
      igdb_rating: 94,
      summary: 'Revolutionary 3D platformer that defined a generation. Help Mario save Princess Peach from Bowser.',
      cover_url: 'https://example.com/cover.jpg',
      averageUserRating: 4.9,
      totalUserRatings: 234,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };

    // Test exact match scoring
    console.log('\n=== EXACT MATCH SCORING ===');
    const witcherScore = calculateScore(aaaGame, 'the witcher 3');
    const hadesScore = calculateScore(indieGame, 'hades');
    const silksongScore = calculateScore(hypedGame, 'silksong');
    const marioScore = calculateScore(classicGame, 'super mario 64');

    console.log(`Witcher 3 (AAA): ${witcherScore}`);
    console.log(`  - Text match: ~60-80 (partial match)`);
    console.log(`  - Quality (94 rating): ~47`);
    console.log(`  - Authority (2453 reviews): ~40`);
    console.log(`  - Engagement (892 follows): ~8`);
    
    console.log(`\nHades (Indie): ${hadesScore}`);
    console.log(`  - Text match: 100 (exact)`);
    console.log(`  - Quality (93 rating): ~46.5`);
    console.log(`  - Authority (387 reviews): ~25`);
    console.log(`  - Engagement (245 follows): ~7`);
    
    console.log(`\nSilksong (Hyped): ${silksongScore}`);
    console.log(`  - Text match: 100 (exact)`);
    console.log(`  - Quality: 0 (no rating yet)`);
    console.log(`  - Authority: 0 (no reviews)`);
    console.log(`  - Engagement (456 hypes + 1250 follows): ~23`);
    
    console.log(`\nMario 64 (Classic): ${marioScore}`);
    console.log(`  - Text match: 100 (exact)`);
    console.log(`  - Quality (96 rating): ~48`);
    console.log(`  - Authority (892 reviews): ~32`);
    console.log(`  - Engagement (123 follows): ~6`);

    // Test partial match scoring
    console.log('\n=== PARTIAL MATCH SCORING ===');
    const witcherPartial = calculateScore(aaaGame, 'witcher');
    const hadesPartial = calculateScore(indieGame, 'hade');
    const marioPartial = calculateScore(classicGame, 'mario');

    console.log(`Witcher 3 (partial "witcher"): ${witcherPartial}`);
    console.log(`Hades (partial "hade"): ${hadesPartial}`);
    console.log(`Mario 64 (partial "mario"): ${marioPartial}`);

    // Validate scoring ranges with new algorithm
    expect(witcherScore).toBeGreaterThan(150); // High quality + elite authority
    expect(hadesScore).toBeGreaterThan(175); // Exact match + high quality + mid authority
    expect(silksongScore).toBeGreaterThan(120); // Exact match + high engagement
    expect(marioScore).toBeGreaterThan(185); // Exact match + excellent quality + high authority
  });

  test('should properly weight authority tiers', () => {
    const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
    
    const baseGame: GameWithCalculatedFields = {
      id: 1,
      name: 'Test Game',
      slug: 'test-game',
      igdb_id: 1,
      total_rating: 85,
      rating_count: 0,
      follows: 0,
      hypes: 0,
      igdb_rating: 85,
      summary: 'Test game with comprehensive description for testing purposes.',
      cover_url: 'https://example.com/cover.jpg',
      averageUserRating: 0,
      totalUserRatings: 15,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };

    // Test different rating count tiers
    const scores: number[] = [];
    const tiers = [10, 50, 150, 600, 1200, 5000];
    
    console.log('\n=== AUTHORITY TIER SCORING ===');
    console.log('Base score (text + quality + content): ~145');
    tiers.forEach(count => {
      const game = { ...baseGame, rating_count: count };
      const score = calculateScore(game, 'test game');
      const baseScore = 100 + 37.5 + 5; // text + quality + content bonuses
      const authorityBonus = score - baseScore;
      scores.push(score);
      
      let tier = '';
      if (count >= 1000) tier = ' (Elite tier)';
      else if (count >= 500) tier = ' (High tier)';
      else if (count >= 100) tier = ' (Mid tier)';
      else if (count >= 20) tier = ' (Low tier)';
      else tier = ' (Minimal tier)';
      
      console.log(`Rating count ${count}${tier}: ${score.toFixed(1)} (authority: +${authorityBonus.toFixed(1)})`);
    });

    // Verify progressive scoring with proper tier gaps
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1]);
    }
    
    // Verify tier boundaries create meaningful jumps
    const minimal = scores[0]; // 10 reviews
    const low = scores[1]; // 50 reviews  
    const mid = scores[2]; // 150 reviews
    const high = scores[3]; // 600 reviews
    const elite = scores[4]; // 1200 reviews
    
    expect(low - minimal).toBeGreaterThan(5); // Meaningful jump to low tier
    expect(mid - low).toBeGreaterThan(3); // Jump to mid tier
    expect(high - mid).toBeGreaterThan(2); // Jump to high tier
    expect(elite - high).toBeGreaterThan(5); // Jump to elite tier
  });

  test('should properly weight engagement metrics', () => {
    const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
    
    const baseGame: GameWithCalculatedFields = {
      id: 1,
      name: 'Test Game',
      slug: 'test-game',
      igdb_id: 1,
      total_rating: 85,
      rating_count: 100,
      follows: 0,
      hypes: 0,
      igdb_rating: 85,
      summary: 'Test game with comprehensive description for testing purposes.',
      cover_url: 'https://example.com/cover.jpg',
      averageUserRating: 0,
      totalUserRatings: 15,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };

    console.log('\n=== ENGAGEMENT SCORING (HYPES) ===');
    console.log('Base score (no engagement): ~165');
    
    // Test hype impact with new tiered system
    const noHype = calculateScore(baseGame, 'test game');
    const minimalHype = calculateScore({ ...baseGame, hypes: 5 }, 'test game');
    const lowHype = calculateScore({ ...baseGame, hypes: 25 }, 'test game');
    const midHype = calculateScore({ ...baseGame, hypes: 75 }, 'test game');
    const highHype = calculateScore({ ...baseGame, hypes: 150 }, 'test game');
    const veryHighHype = calculateScore({ ...baseGame, hypes: 500 }, 'test game');
    
    console.log(`No hype: ${noHype.toFixed(1)}`);
    console.log(`Minimal hype (5): ${minimalHype.toFixed(1)} (+${(minimalHype - noHype).toFixed(1)})`);
    console.log(`Low hype (25): ${lowHype.toFixed(1)} (+${(lowHype - noHype).toFixed(1)})`);
    console.log(`Mid hype (75): ${midHype.toFixed(1)} (+${(midHype - noHype).toFixed(1)})`);
    console.log(`High hype (150): ${highHype.toFixed(1)} (+${(highHype - noHype).toFixed(1)})`);
    console.log(`Very high hype (500): ${veryHighHype.toFixed(1)} (+${(veryHighHype - noHype).toFixed(1)})`);
    
    console.log('\n=== ENGAGEMENT SCORING (FOLLOWS) ===');
    // Test follows impact
    const noFollows = calculateScore(baseGame, 'test game');
    const someFollows = calculateScore({ ...baseGame, follows: 100 }, 'test game');
    const manyFollows = calculateScore({ ...baseGame, follows: 1000 }, 'test game');
    const massiveFollows = calculateScore({ ...baseGame, follows: 10000 }, 'test game');
    
    console.log(`No follows: ${noFollows.toFixed(1)}`);
    console.log(`Some follows (100): ${someFollows.toFixed(1)} (+${(someFollows - noFollows).toFixed(1)})`);
    console.log(`Many follows (1000): ${manyFollows.toFixed(1)} (+${(manyFollows - noFollows).toFixed(1)})`);
    console.log(`Massive follows (10000): ${massiveFollows.toFixed(1)} (+${(massiveFollows - noFollows).toFixed(1)})`);
    
    console.log('\n=== COMBINED ENGAGEMENT ===');
    const combined = calculateScore({ ...baseGame, hypes: 100, follows: 500 }, 'test game');
    console.log(`100 hypes + 500 follows: ${combined.toFixed(1)} (+${(combined - noHype).toFixed(1)} total engagement)`);
    
    // Verify progressive scoring
    expect(minimalHype).toBeGreaterThan(noHype);
    expect(lowHype).toBeGreaterThan(minimalHype);
    expect(midHype).toBeGreaterThan(lowHype);
    expect(highHype).toBeGreaterThan(midHype);
    
    expect(someFollows).toBeGreaterThan(noFollows);
    expect(manyFollows).toBeGreaterThan(someFollows);
    
    // Verify hypes are weighted more heavily than follows
    const hypeOnly = calculateScore({ ...baseGame, hypes: 100 }, 'test game');
    const followOnly = calculateScore({ ...baseGame, follows: 100 }, 'test game');
    expect(hypeOnly - noHype).toBeGreaterThan(followOnly - noFollows);
  });

  test('should demonstrate quality tier scoring', () => {
    const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
    
    const baseGame: GameWithCalculatedFields = {
      id: 1,
      name: 'Test Game',
      slug: 'test-game',
      igdb_id: 1,
      total_rating: 0,
      rating_count: 100,
      follows: 0,
      hypes: 0,
      igdb_rating: 0,
      summary: 'Test game with comprehensive description for testing purposes.',
      cover_url: 'https://example.com/cover.jpg',
      averageUserRating: 0,
      totalUserRatings: 15,
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    };

    console.log('\n=== QUALITY TIER SCORING ===');
    const ratings = [50, 65, 75, 85, 92, 98];
    
    ratings.forEach(rating => {
      const game = { ...baseGame, total_rating: rating };
      const score = calculateScore(game, 'test game');
      const baseScore = 100 + 20 + 5; // text + authority + content
      const qualityBonus = score - baseScore;
      
      let tier = '';
      if (rating >= 90) tier = ' (Elite quality)';
      else if (rating >= 80) tier = ' (High quality)';
      else if (rating >= 70) tier = ' (Good quality)';
      else tier = ' (Average quality)';
      
      console.log(`Rating ${rating}${tier}: ${score.toFixed(1)} (quality: +${qualityBonus.toFixed(1)})`);
    });
  });
});