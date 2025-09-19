/**
 * Debug Mario search results to identify issues
 */

import { describe, it, expect } from '@jest/globals';
import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';

describe('Mario Search Debug', () => {
  it('should show current Mario search results for debugging', async () => {
    const searchCoordination = new AdvancedSearchCoordination();
    
    const result = await searchCoordination.coordinatedSearch('mario', {
      maxResults: 20,
      includeMetrics: true
    });

    console.log(`\n=== MARIO SEARCH RESULTS (${result.results.length} total) ===`);
    
    result.results.forEach((game, index) => {
      console.log(`${index + 1}. ${game.name}`);
      console.log(`   - Category: ${game.category || 'unknown'}`);
      console.log(`   - Developer: ${game.developer || 'unknown'}`);
      console.log(`   - Release Date: ${game.release_date || 'unknown'}`);
      console.log(`   - IGDB Rating: ${game.igdb_rating || 'unknown'}`);
      console.log(`   - Relevance Score: ${game.relevanceScore || 'unknown'}`);
      console.log(`   - Quality Score: ${game.qualityScore || 'unknown'}`);
      if (game.summary && game.summary.length > 100) {
        console.log(`   - Summary: ${game.summary.substring(0, 100)}...`);
      }
      console.log('');
    });

    // Check for iconic Mario games
    const iconicGames = [
      'Super Mario Bros.',
      'Super Mario Bros. 2',
      'Super Mario Bros. 3',
      'Super Mario World',
      'Super Mario 64',
      'Super Mario Odyssey',
      'Super Mario Galaxy',
      'New Super Mario Bros.'
    ];

    console.log('\n=== ICONIC MARIO GAMES FOUND ===');
    iconicGames.forEach(iconic => {
      const found = result.results.find(game => 
        game.name.toLowerCase().includes(iconic.toLowerCase())
      );
      console.log(`${iconic}: ${found ? '✅ FOUND' : '❌ MISSING'}`);
      if (found) {
        console.log(`   Position: #${result.results.indexOf(found) + 1}`);
      }
    });

    // Check for mods/hacks
    console.log('\n=== POTENTIAL MODS/HACKS FOUND ===');
    const potentialMods = result.results.filter(game => {
      const name = game.name.toLowerCase();
      return name.includes('hack') || 
             name.includes('mod') || 
             name.includes('rom') ||
             name.includes('fan') ||
             (game.category === 5) || // IGDB mod category
             (game.developer && game.developer.toLowerCase().includes('fan'));
    });

    potentialMods.forEach((mod, index) => {
      console.log(`${index + 1}. ${mod.name} (Category: ${mod.category}, Developer: ${mod.developer})`);
    });

    console.log(`\nTotal potential mods: ${potentialMods.length}`);

    expect(result.results.length).toBeGreaterThan(0);
  }, 60000);
});