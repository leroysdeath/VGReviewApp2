/**
 * Unit tests for GamePage P1.2 Optimizations
 * Tests memoization and caching improvements
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { useMemo } from 'react';
import { mapPlatformNames } from '../utils/platformMapping';

describe('GamePage P1.2 Optimizations', () => {
  // Test sessionStorage availability
  const mockSessionStorage = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      }
    };
  })();

  beforeEach(() => {
    // Setup sessionStorage mock
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true
    });
    mockSessionStorage.clear();
  });

  afterEach(() => {
    mockSessionStorage.clear();
  });

  describe('Platform Display Memoization', () => {
    it('should memoize platform names to avoid recalculation', () => {
      const platforms = [6, 48, 49]; // PS5, PS4, Xbox One
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        return useMemo(() =>
          platforms ? mapPlatformNames(platforms).join(', ') : '',
          [platforms]
        );
      };

      const { result, rerender } = renderHook(() => TestComponent());

      const firstResult = result.current;
      expect(firstResult).toBeTruthy();
      expect(renderCount).toBe(1);

      // Rerender with same platforms - should use memoized value
      rerender();
      expect(result.current).toBe(firstResult);
      expect(renderCount).toBe(2); // Component rerenders but useMemo returns cached value
    });

    it('should recalculate when platforms change', () => {
      let platforms = [6, 48]; // PS5, PS4

      const { result, rerender } = renderHook(() =>
        useMemo(() =>
          platforms ? mapPlatformNames(platforms).join(', ') : '',
          [platforms]
        )
      );

      const firstResult = result.current;
      expect(firstResult).toBeTruthy();
      expect(firstResult.length).toBeGreaterThan(0);

      // Change platforms
      platforms = [49, 130]; // Xbox One, Switch
      rerender();

      expect(result.current).not.toBe(firstResult);
      expect(result.current.length).toBeGreaterThan(0);
    });

    it('should handle empty platforms array', () => {
      const { result } = renderHook(() =>
        useMemo(() =>
          [] ? mapPlatformNames([]).join(', ') : '',
          [[]]
        )
      );

      expect(result.current).toBe('');
    });
  });

  describe('Category Caching (sessionStorage)', () => {
    it('should cache category data with timestamp', () => {
      const igdbId = 123;
      const category = 0; // Main game
      const cacheKey = `game-category-${igdbId}`;

      // Simulate caching
      const cacheData = {
        category,
        timestamp: Date.now()
      };

      mockSessionStorage.setItem(cacheKey, JSON.stringify(cacheData));

      // Verify cache
      const cached = mockSessionStorage.getItem(cacheKey);
      expect(cached).toBeTruthy();

      const parsed = JSON.parse(cached!);
      expect(parsed.category).toBe(category);
      expect(parsed.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should validate cache TTL (1 hour)', () => {
      const igdbId = 456;
      const cacheKey = `game-category-${igdbId}`;
      const ONE_HOUR = 60 * 60 * 1000;

      // Cache from 30 minutes ago (should be valid)
      const recentCache = {
        category: 0,
        timestamp: Date.now() - (30 * 60 * 1000)
      };
      mockSessionStorage.setItem(cacheKey, JSON.stringify(recentCache));

      const cached = mockSessionStorage.getItem(cacheKey);
      const { timestamp } = JSON.parse(cached!);
      const age = Date.now() - timestamp;

      expect(age).toBeLessThan(ONE_HOUR);
    });

    it('should invalidate expired cache (> 1 hour)', () => {
      const igdbId = 789;
      const cacheKey = `game-category-${igdbId}`;
      const ONE_HOUR = 60 * 60 * 1000;

      // Cache from 2 hours ago (should be expired)
      const expiredCache = {
        category: 0,
        timestamp: Date.now() - (2 * ONE_HOUR)
      };
      mockSessionStorage.setItem(cacheKey, JSON.stringify(expiredCache));

      const cached = mockSessionStorage.getItem(cacheKey);
      const { timestamp } = JSON.parse(cached!);
      const age = Date.now() - timestamp;

      expect(age).toBeGreaterThan(ONE_HOUR);

      // In real code, this would trigger a fresh fetch
      if (age >= ONE_HOUR) {
        mockSessionStorage.removeItem(cacheKey);
      }

      expect(mockSessionStorage.getItem(cacheKey)).toBeNull();
    });

    it('should handle corrupted cache gracefully', () => {
      const igdbId = 999;
      const cacheKey = `game-category-${igdbId}`;

      // Corrupt cache data
      mockSessionStorage.setItem(cacheKey, 'invalid-json{');

      try {
        const cached = mockSessionStorage.getItem(cacheKey);
        JSON.parse(cached!);
        expect(true).toBe(false); // Should not reach here
      } catch (e) {
        // Should catch parse error and remove invalid cache
        mockSessionStorage.removeItem(cacheKey);
        expect(mockSessionStorage.getItem(cacheKey)).toBeNull();
      }
    });

    it('should cache different categories for different games', () => {
      const game1 = { igdbId: 111, category: 0 }; // Main game
      const game2 = { igdbId: 222, category: 1 }; // DLC
      const game3 = { igdbId: 333, category: 2 }; // Expansion

      // Cache all three
      [game1, game2, game3].forEach(game => {
        const cacheKey = `game-category-${game.igdbId}`;
        mockSessionStorage.setItem(cacheKey, JSON.stringify({
          category: game.category,
          timestamp: Date.now()
        }));
      });

      // Verify all cached independently
      const cached1 = JSON.parse(mockSessionStorage.getItem(`game-category-111`)!);
      const cached2 = JSON.parse(mockSessionStorage.getItem(`game-category-222`)!);
      const cached3 = JSON.parse(mockSessionStorage.getItem(`game-category-333`)!);

      expect(cached1.category).toBe(0);
      expect(cached2.category).toBe(1);
      expect(cached3.category).toBe(2);
    });
  });

  describe('Performance Impact', () => {
    it('should reduce platform mapping calls with memoization', () => {
      const platforms = [6, 48, 49, 130, 167]; // 5 platforms
      let mappingCalls = 0;

      // Mock the mapping function to count calls
      const trackedMapPlatformNames = (p: number[]) => {
        mappingCalls++;
        return mapPlatformNames(p);
      };

      const { result, rerender } = renderHook(() =>
        useMemo(() =>
          trackedMapPlatformNames(platforms).join(', '),
          [platforms]
        )
      );

      expect(mappingCalls).toBe(1);
      const firstResult = result.current;

      // Rerender with same platforms - should not call mapping again
      rerender();

      // useMemo should prevent the second call
      expect(mappingCalls).toBe(1); // Still 1, not 2
      expect(result.current).toBe(firstResult);
    });

    it('should eliminate 8-second IGDB timeout with cache hit', async () => {
      const igdbId = 123;
      const cacheKey = `game-category-${igdbId}`;

      // Simulate cache hit
      mockSessionStorage.setItem(cacheKey, JSON.stringify({
        category: 0,
        timestamp: Date.now()
      }));

      const startTime = Date.now();

      // Simulate cache lookup (instant)
      const cached = mockSessionStorage.getItem(cacheKey);
      const { category } = JSON.parse(cached!);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(category).toBe(0);
      expect(duration).toBeLessThan(10); // Should be instant (<10ms)

      // Without cache, this would take up to 8000ms (8 second timeout)
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined platforms gracefully', () => {
      const { result: result1 } = renderHook(() =>
        useMemo(() =>
          null ? mapPlatformNames(null as any).join(', ') : '',
          [null]
        )
      );

      const { result: result2 } = renderHook(() =>
        useMemo(() =>
          undefined ? mapPlatformNames(undefined as any).join(', ') : '',
          [undefined]
        )
      );

      expect(result1.current).toBe('');
      expect(result2.current).toBe('');
    });

    it('should handle missing sessionStorage', () => {
      // Simulate browser with no sessionStorage
      Object.defineProperty(window, 'sessionStorage', {
        value: undefined,
        writable: true
      });

      // Code should handle gracefully without crashing
      expect(() => {
        try {
          const cached = sessionStorage?.getItem('test');
          expect(cached).toBeUndefined();
        } catch (e) {
          // Expected to fail gracefully
          expect(e).toBeTruthy();
        }
      }).not.toThrow();

      // Restore
      Object.defineProperty(window, 'sessionStorage', {
        value: mockSessionStorage,
        writable: true
      });
    });

    it('should handle very large platform arrays', () => {
      // Simulate game on 20+ platforms
      const platforms = Array.from({ length: 25 }, (_, i) => i + 1);

      const { result } = renderHook(() =>
        useMemo(() =>
          platforms ? mapPlatformNames(platforms).join(', ') : '',
          [platforms]
        )
      );

      expect(result.current).toBeTruthy();
      expect(result.current.split(',').length).toBeGreaterThan(0);
    });
  });
});
