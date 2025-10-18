/**
 * Search Prioritization Integration Test
 *
 * Tests that main search now applies the same prioritization as admin sorting page
 */

import { describe, it, expect } from '@jest/globals';
import { searchService } from '../services/searchService';

describe('Search Prioritization Integration', () => {

  it('should prioritize famous Mario games over obscure titles', async () => {
    const response = await searchService.searchGames({
      query: 'mario',
      limit: 10
    });

    // Should find Mario games
    expect(response.results.length).toBeGreaterThan(0);

    // Top results should be famous Mario games
    const topResults = response.results.slice(0, 5);
    const topNames = topResults.map(r => r.name.toLowerCase());

    // Check that at least some famous Mario games appear in top 5
    const hasFamousMario = topNames.some(name =>
      name.includes('super mario bros') ||
      name.includes('super mario 64') ||
      name.includes('super mario odyssey') ||
      name.includes('super mario world')
    );

    expect(hasFamousMario).toBe(true);

    console.log('Top 5 Mario search results:');
    topResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.name} (score: ${result.relevance_score})`);
    });
  });

  it('should prioritize mainline Zelda games over spinoffs', async () => {
    const response = await searchService.searchGames({
      query: 'zelda',
      limit: 10
    });

    expect(response.results.length).toBeGreaterThan(0);

    const topResults = response.results.slice(0, 5);
    const topNames = topResults.map(r => r.name.toLowerCase());

    // Famous Zelda games should appear high
    const hasFamousZelda = topNames.some(name =>
      name.includes('ocarina of time') ||
      name.includes('breath of the wild') ||
      name.includes('tears of the kingdom') ||
      name.includes('majora') ||
      name.includes('twilight princess')
    );

    expect(hasFamousZelda).toBe(true);

    console.log('Top 5 Zelda search results:');
    topResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.name} (score: ${result.relevance_score})`);
    });
  });

  it('should prioritize mainline Final Fantasy over spinoffs', async () => {
    const response = await searchService.searchGames({
      query: 'final fantasy',
      limit: 10
    });

    expect(response.results.length).toBeGreaterThan(0);

    const topResults = response.results.slice(0, 5);
    const topNames = topResults.map(r => r.name.toLowerCase());

    // Famous FF games should appear high
    const hasFamousFF = topNames.some(name =>
      name.includes('final fantasy vii') ||
      name.includes('final fantasy 7') ||
      name.includes('final fantasy vi') ||
      name.includes('final fantasy x') ||
      name.includes('final fantasy xiv')
    );

    expect(hasFamousFF).toBe(true);

    console.log('Top 5 Final Fantasy search results:');
    topResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.name} (score: ${result.relevance_score})`);
    });
  });

  it('should assign relevance scores based on game priority', async () => {
    const response = await searchService.searchGames({
      query: 'mario',
      limit: 20
    });

    // All results should have relevance_score set
    response.results.forEach(result => {
      expect(result.relevance_score).toBeDefined();
      expect(typeof result.relevance_score).toBe('number');
    });

    // Scores should generally decrease (famous games first)
    const scores = response.results.map(r => r.relevance_score || 0);

    // At least top 5 should be in descending order
    for (let i = 0; i < Math.min(4, scores.length - 1); i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });

  it('should handle empty search gracefully', async () => {
    const response = await searchService.searchGames({
      query: '',
      limit: 10
    });

    expect(response.results).toEqual([]);
    expect(response.total_count).toBe(0);
  });

  it('should handle searches with no results', async () => {
    const response = await searchService.searchGames({
      query: 'xyzabc123nonexistentgame999',
      limit: 10
    });

    expect(response.results).toEqual([]);
    expect(response.total_count).toBe(0);
  });

});
