import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { getGameUrl } from '../utils/gameUrls';
import type { GameWithCalculatedFields } from '../types/database';

describe('Navbar Game Navigation Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGameUrl function behavior', () => {
    it('should prioritize slug over igdb_id and database id', () => {
      const gameWithSlug: GameWithCalculatedFields = {
        id: 123,
        igdb_id: 456,
        slug: 'super-mario-bros',
        name: 'Super Mario Bros.',
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

      const url = getGameUrl(gameWithSlug);
      expect(url).toBe('/game/super-mario-bros');
    });

    it('should use igdb_id when slug is not available', () => {
      const gameWithIgdbId: GameWithCalculatedFields = {
        id: 123,
        igdb_id: 456,
        slug: null,
        name: 'Super Mario Bros.',
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

      const url = getGameUrl(gameWithIgdbId);
      expect(url).toBe('/game/456');
    });

    it('should generate slug from name when neither slug nor igdb_id available', () => {
      const gameWithoutSlugOrIgdb: GameWithCalculatedFields = {
        id: 123,
        igdb_id: null,
        slug: null,
        name: 'Super Mario Bros.',
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

      const url = getGameUrl(gameWithoutSlugOrIgdb);
      expect(url).toBe('/game/super-mario-bros');
    });

    it('should fallback to database id as last resort', () => {
      const gameWithOnlyId: GameWithCalculatedFields = {
        id: 123,
        igdb_id: null,
        slug: null,
        name: '',
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

      const url = getGameUrl(gameWithOnlyId);
      expect(url).toBe('/game/123');
    });
  });

  describe('Navigation URL validation', () => {
    it('should generate valid URLs for Mario franchise games', () => {
      const marioGames: Partial<GameWithCalculatedFields>[] = [
        { id: 1, slug: 'super-mario-bros', name: 'Super Mario Bros.' },
        { id: 2, igdb_id: 1020, slug: null, name: 'Super Mario World' },
        { id: 3, igdb_id: null, slug: null, name: 'Mario Kart 64' },
      ];

      const urls = marioGames.map(game => getGameUrl(game as GameWithCalculatedFields));
      
      expect(urls[0]).toBe('/game/super-mario-bros');
      expect(urls[1]).toBe('/game/1020');
      expect(urls[2]).toBe('/game/mario-kart-64');
      
      // Ensure all URLs are valid game routes
      urls.forEach(url => {
        expect(url).toMatch(/^\/game\/[a-z0-9-]+$/);
      });
    });

    it('should handle special characters in game names correctly', () => {
      const gameWithSpecialChars: GameWithCalculatedFields = {
        id: 999,
        igdb_id: null,
        slug: null,
        name: 'Pokémon: Red & Blue!',
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

      const url = getGameUrl(gameWithSpecialChars);
      expect(url).toBe('/game/pokmon-red-blue'); // Note: accent normalization removes accents
      expect(url).toMatch(/^\/game\/[a-z0-9-]+$/);
    });
  });

  describe('Regression test for navbar navigation bug', () => {
    it('should not use database ID directly for game navigation', () => {
      const testGame: GameWithCalculatedFields = {
        id: 999, // This should NOT be used in the URL
        igdb_id: 456,
        slug: 'correct-game-slug',
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
      
      // Should use slug, not database ID
      expect(url).toBe('/game/correct-game-slug');
      expect(url).not.toBe('/game/999');
      
      // Ensure the fix prevents the bug where database ID was used
      expect(url).not.toMatch(/\/game\/999$/);
    });
  });
});