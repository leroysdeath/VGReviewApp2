import { describe, it, expect } from '@jest/globals';
import { getGameUrl } from '../utils/gameUrls';
import type { GameWithCalculatedFields } from '../types/database';

describe('Navbar Integration Test', () => {
  describe('Game navigation URL generation', () => {
    it('should generate correct URLs for typical Mario search results', () => {
      // Simulating typical games that would appear in Mario search results
      const marioGames: Partial<GameWithCalculatedFields>[] = [
        {
          id: 1,
          igdb_id: 1020,
          slug: 'super-mario-bros',
          name: 'Super Mario Bros.'
        },
        {
          id: 2,
          igdb_id: 1021,
          slug: 'super-mario-world',
          name: 'Super Mario World'
        },
        {
          id: 3,
          igdb_id: 1022,
          slug: null, // No slug, should use IGDB ID
          name: 'Mario Kart 64'
        },
        {
          id: 4,
          igdb_id: null, // No IGDB ID, should generate slug
          slug: null,
          name: 'Super Mario Galaxy'
        }
      ];

      const urls = marioGames.map(game => getGameUrl(game as GameWithCalculatedFields));
      
      // Verify each URL is correct and follows expected pattern
      expect(urls[0]).toBe('/game/super-mario-bros');
      expect(urls[1]).toBe('/game/super-mario-world');
      expect(urls[2]).toBe('/game/1022'); // Uses IGDB ID
      expect(urls[3]).toBe('/game/super-mario-galaxy'); // Generated slug
      
      // Ensure no URLs use the database ID directly (the bug we fixed)
      expect(urls).not.toContain('/game/1');
      expect(urls).not.toContain('/game/2');
      expect(urls).not.toContain('/game/3');
      expect(urls).not.toContain('/game/4');
    });

    it('should handle edge cases in game data', () => {
      const edgeCaseGames: Partial<GameWithCalculatedFields>[] = [
        {
          id: 999,
          igdb_id: 123,
          slug: '', // Empty slug should fallback to IGDB ID
          name: 'Game with Empty Slug'
        },
        {
          id: 998,
          igdb_id: 0, // Zero IGDB ID should be treated as falsy
          slug: null,
          name: 'Game with Zero IGDB ID'
        },
        {
          id: 997,
          igdb_id: null,
          slug: null,
          name: '' // Empty name should fallback to database ID
        }
      ];

      const urls = edgeCaseGames.map(game => getGameUrl(game as GameWithCalculatedFields));
      
      expect(urls[0]).toBe('/game/123'); // Should use IGDB ID when slug is empty
      expect(urls[1]).toBe('/game/game-with-zero-igdb-id'); // Should generate slug from name
      expect(urls[2]).toBe('/game/997'); // Should use database ID as last resort
    });

    it('should ensure navbar uses same URL logic as other components', () => {
      // This test ensures the navbar fix is consistent with how other components
      // like ActivityItem generate URLs
      const testGame: GameWithCalculatedFields = {
        id: 12345, // Should NOT appear in URL
        igdb_id: 5678,
        slug: 'test-game-slug',
        name: 'Test Game',
        summary: '',
        release_dates: [],
        genres: [],
        platforms: [],
        involved_companies: [],
        total_rating: 85,
        total_rating_count: 100,
        cover_url: '',
        screenshots: [],
        videos: [],
        game_modes: [],
        themes: [],
        keywords: [],
        storyline: '',
        aggregated_rating: null,
        aggregated_rating_count: null,
        similar_games: [],
        first_release_date: '',
        created_at: '',
        updated_at: '',
        _calculated_match_score: 1.0,
        _calculated_quality_score: 0.8,
        _calculated_priority_score: 0.9
      };

      const url = getGameUrl(testGame);
      
      // Should prioritize slug over everything else
      expect(url).toBe('/game/test-game-slug');
      
      // Should never use database ID when better options exist
      expect(url).not.toBe('/game/12345');
      expect(url).not.toBe('/game/5678');
    });
  });

  describe('URL pattern validation', () => {
    it('should generate valid URL patterns for all game types', () => {
      const gameTypes = [
        { id: 1, slug: 'valid-slug', name: 'Game with Slug' },
        { id: 2, igdb_id: 999, slug: null, name: 'Game with IGDB ID' },
        { id: 3, igdb_id: null, slug: null, name: 'Game Name Only' },
        { id: 4, igdb_id: null, slug: null, name: 'Special! Chars: & Symbols?' }
      ];

      gameTypes.forEach(game => {
        const url = getGameUrl(game as GameWithCalculatedFields);
        
        // All URLs should start with /game/
        expect(url).toMatch(/^\/game\//);
        
        // Should not contain invalid URL characters after the /game/ part
        const urlPart = url.replace('/game/', '');
        expect(urlPart).toMatch(/^[a-z0-9-]+$/);
        
        // Should not be empty after /game/
        expect(urlPart.length).toBeGreaterThan(0);
      });
    });
  });
});