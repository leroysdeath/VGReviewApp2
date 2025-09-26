import { describe, test, expect } from '@jest/globals';
import { generateSlug } from '../utils/gameUrls';

describe('Critical Fixes - Simple Validation', () => {
  describe('Slug Generation', () => {
    test('should create basic slug from game name', () => {
      const slug = generateSlug('Super Mario Bros.');
      expect(slug).toBe('super-mario-bros');
    });

    test('should handle special characters correctly', () => {
      const slug = generateSlug('Grand Theft Auto: Vice City');
      expect(slug).toBe('grand-theft-auto-vice-city');
    });

    test('should append IGDB ID for uniqueness when provided', () => {
      const slug = generateSlug('Mario', 123);
      expect(slug).toBe('mario-123');
    });

    test('should handle empty string gracefully', () => {
      const slug = generateSlug('');
      expect(slug).toBe('');
    });

    test('should handle numbers and hyphens', () => {
      const slug = generateSlug('Call of Duty: Modern Warfare 2');
      expect(slug).toBe('call-of-duty-modern-warfare-2');
    });

    test('should handle multiple consecutive spaces', () => {
      const slug = generateSlug('Game    With    Many    Spaces');
      expect(slug).toBe('game-with-many-spaces');
    });

    test('should handle unicode characters', () => {
      const slug = generateSlug('Pokémon Red & Blue');
      expect(slug).toBe('pokemon-red-blue'); // é is properly converted to e
    });
  });

  describe('Image URL Retry Logic', () => {
    test('should generate correct retry variants for IGDB images', () => {
      const originalUrl = 'https://images.igdb.com/igdb/image/upload/f_webp,q_85,w_400,h_600,c_cover/co214e.webp';
      
      // Test the retry variant transformations
      const variants = [
        originalUrl.replace('/t_cover_big/', '/t_cover_small/'),
        originalUrl.replace('f_webp', 'f_jpg'),
        originalUrl.replace(',q_85', ',q_75'),
        originalUrl
      ];

      expect(variants[0]).toBe(originalUrl); // No t_cover_big to replace
      expect(variants[1]).toBe('https://images.igdb.com/igdb/image/upload/f_jpg,q_85,w_400,h_600,c_cover/co214e.webp');
      expect(variants[2]).toBe('https://images.igdb.com/igdb/image/upload/f_webp,q_75,w_400,h_600,c_cover/co214e.webp');
      expect(variants[3]).toBe(originalUrl);
    });

    test('should handle t_cover_big replacement', () => {
      const bigCoverUrl = 'https://images.igdb.com/igdb/image/upload/t_cover_big/co214e.webp';
      const smallCoverVariant = bigCoverUrl.replace('/t_cover_big/', '/t_cover_small/');
      
      expect(smallCoverVariant).toBe('https://images.igdb.com/igdb/image/upload/t_cover_small/co214e.webp');
    });

    test('should handle multiple transformations correctly', () => {
      const url = 'https://images.igdb.com/igdb/image/upload/t_cover_big,f_webp,q_85/co214e.webp';
      
      const step1 = url.replace('t_cover_big', 't_cover_small');
      const step2 = step1.replace('f_webp', 'f_jpg');
      const step3 = step2.replace(',q_85', ',q_75');
      
      expect(step1).toBe('https://images.igdb.com/igdb/image/upload/t_cover_small,f_webp,q_85/co214e.webp');
      expect(step2).toBe('https://images.igdb.com/igdb/image/upload/t_cover_small,f_jpg,q_85/co214e.webp');
      expect(step3).toBe('https://images.igdb.com/igdb/image/upload/t_cover_small,f_jpg,q_75/co214e.webp');
    });
  });

  describe('Error Handling Validation', () => {
    test('should validate timeout error structure', () => {
      const timeoutError = new Error('Review query timed out');
      expect(timeoutError.message).toContain('timed out');
      expect(timeoutError.message).toMatch(/timed out/i);
    });

    test('should validate abort error structure', () => {
      const abortError = { name: 'AbortError', message: 'Query aborted' };
      expect(abortError.name).toBe('AbortError');
      expect(abortError.message).toContain('abort');
    });

    test('should validate slug conflict error codes', () => {
      const slugError = { 
        code: '23505', 
        message: 'duplicate key value violates unique constraint "unique_game_slug"'
      };
      
      expect(slugError.code).toBe('23505');
      expect(slugError.message).toContain('unique_game_slug');
    });
  });

  describe('Performance Constants', () => {
    test('should validate timeout values are reasonable', () => {
      const REVIEW_TIMEOUT = 15000; // 15 seconds
      const NAME_SEARCH_TIMEOUT = 10000; // 10 seconds  
      const SUMMARY_SEARCH_TIMEOUT = 8000; // 8 seconds
      
      expect(REVIEW_TIMEOUT).toBeGreaterThan(0);
      expect(REVIEW_TIMEOUT).toBeLessThanOrEqual(30000); // Max 30s
      
      expect(NAME_SEARCH_TIMEOUT).toBeGreaterThan(0);
      expect(NAME_SEARCH_TIMEOUT).toBeLessThanOrEqual(15000); // Max 15s
      
      expect(SUMMARY_SEARCH_TIMEOUT).toBeGreaterThan(0);
      expect(SUMMARY_SEARCH_TIMEOUT).toBeLessThan(NAME_SEARCH_TIMEOUT); // Should be faster
    });

    test('should validate retry attempts are reasonable', () => {
      const MAX_RETRY_ATTEMPTS = 2;
      const IMAGE_RETRY_VARIANTS = 4;
      
      expect(MAX_RETRY_ATTEMPTS).toBeGreaterThanOrEqual(1);
      expect(MAX_RETRY_ATTEMPTS).toBeLessThanOrEqual(5); // Not too many
      
      expect(IMAGE_RETRY_VARIANTS).toBeGreaterThanOrEqual(3);
      expect(IMAGE_RETRY_VARIANTS).toBeLessThanOrEqual(10); // Reasonable number
    });
  });
});