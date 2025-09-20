import { filteringAnalysisService } from '../services/filteringAnalysisService';
import type { Game } from '../types/database';

describe('Admin Filtering Analysis', () => {
  
  test('should analyze high-quality game with exemption', () => {
    const highQualityGame: Game = {
      id: 1,
      name: 'Super Mario Odyssey',
      developer: 'Nintendo',
      publisher: 'Nintendo',
      category: 0, // Main game
      total_rating: 95,
      rating_count: 2000,
      follows: 5000,
      greenlight_flag: false,
      redlight_flag: false
    } as Game;

    const analysis = filteringAnalysisService.analyzeGame(highQualityGame, 'mario');
    
    expect(analysis.wouldPass).toBe(true);
    expect(analysis.qualityExemption).toBe(true);
    expect(analysis.summary).toContain('quality exemption');
    expect(analysis.reasons.some(r => r.type === 'quality')).toBe(true);
  });

  test('should analyze mod game as blocked', () => {
    const modGame: Game = {
      id: 2,
      name: 'Pokemon ROM Hack',
      developer: 'Fan Developer',
      publisher: 'Fan Publisher',
      category: 5, // Mod
      total_rating: 60,
      rating_count: 10,
      follows: 100,
      greenlight_flag: false,
      redlight_flag: false
    } as Game;

    const analysis = filteringAnalysisService.analyzeGame(modGame, 'pokemon');
    
    expect(analysis.wouldBeFiltered).toBe(true);
    expect(analysis.wouldPass).toBe(false);
    expect(analysis.reasons.some(r => r.severity === 'blocked')).toBe(true);
    expect(analysis.reasons.some(r => r.title.includes('Mod'))).toBe(true);
  });

  test('should analyze greenlight override', () => {
    const greenlightGame: Game = {
      id: 3,
      name: 'Some Mod Game',
      developer: 'Unknown',
      publisher: 'Unknown',
      category: 5, // Mod - would normally be blocked
      greenlight_flag: true,
      redlight_flag: false
    } as Game;

    const analysis = filteringAnalysisService.analyzeGame(greenlightGame);
    
    expect(analysis.wouldPass).toBe(true);
    expect(analysis.wouldBeFiltered).toBe(false);
    expect(analysis.adminOverride).toBe('greenlight');
    expect(analysis.summary).toContain('manually approved');
  });

  test('should analyze DLC content as filtered', () => {
    const dlcGame: Game = {
      id: 4,
      name: 'Game DLC Pack',
      developer: 'Game Studio',
      publisher: 'Game Publisher',
      category: 1, // DLC
      total_rating: 70,
      rating_count: 30,
      follows: 200,
      greenlight_flag: false,
      redlight_flag: false
    } as Game;

    const analysis = filteringAnalysisService.analyzeGame(dlcGame);
    
    expect(analysis.wouldBeFiltered).toBe(true);
    expect(analysis.reasons.some(r => r.type === 'category')).toBe(true);
    expect(analysis.reasons.some(r => r.title.includes('DLC'))).toBe(true);
  });

  test('should detect publisher mismatch warning', () => {
    const mismatchGame: Game = {
      id: 5,
      name: 'Mario Fan Game',
      developer: 'Third Party Dev',
      publisher: 'Not Nintendo',
      category: 0,
      total_rating: 50, // Lower rating to avoid quality exemption
      rating_count: 10,  // Low review count
      follows: 100,      // Low follows
      greenlight_flag: false,
      redlight_flag: false
    } as Game;

    const analysis = filteringAnalysisService.analyzeGame(mismatchGame, 'mario');
    
    // Should have copyright warning or name filtering for fan content
    expect(analysis.reasons.length).toBeGreaterThan(0);
    expect(
      analysis.reasons.some(r => r.type === 'copyright') ||
      analysis.reasons.some(r => r.type === 'name')
    ).toBe(true);
  });

  test('should provide comprehensive analysis with multiple reasons', () => {
    const complexGame: Game = {
      id: 6,
      name: 'Final Fantasy Fan Mod Collection',
      developer: 'Fan Developer',
      publisher: 'Unknown',
      category: 3, // Bundle/Collection
      total_rating: 50,
      rating_count: 5,
      follows: 50,
      greenlight_flag: false,
      redlight_flag: false
    } as Game;

    const analysis = filteringAnalysisService.analyzeGame(complexGame, 'final fantasy');
    
    expect(analysis.wouldBeFiltered).toBe(true);
    expect(analysis.reasons.length).toBeGreaterThan(1);
    expect(analysis.reasons.some(r => r.type === 'category')).toBe(true);
    expect(analysis.reasons.some(r => r.type === 'name')).toBe(true);
    expect(analysis.summary).toContain('filtered');
  });

});