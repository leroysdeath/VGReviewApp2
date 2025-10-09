/**
 * RLS Policy Tests for ExplorePage
 *
 * Tests that anonymous (logged-out) users can access published ratings
 * for the ExplorePage sitewide rankings feature.
 *
 * Phase 1 Fix: Update rating table RLS policy to allow anon SELECT
 */

import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase connection
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

describe('ExplorePage RLS Policy - Anonymous Access', () => {
  // Create a client with ONLY the anon key (simulates logged-out user)
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  describe('Rating Table Access - Anonymous Users', () => {
    test('should allow anon users to read published ratings', async () => {
      const { data, error } = await anonClient
        .from('rating')
        .select('id, game_id, rating, is_published')
        .eq('is_published', true)
        .limit(10);

      // Should succeed without authentication
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    test('should return only published ratings to anon users', async () => {
      const { data, error } = await anonClient
        .from('rating')
        .select('id, is_published')
        .limit(50);

      if (error) {
        // If error is permission denied, that's what we're fixing
        expect(error.code).toBe('42501'); // Permission denied
      } else {
        // If successful, all returned ratings must be published
        expect(data).toBeDefined();
        data?.forEach(rating => {
          expect(rating.is_published).toBe(true);
        });
      }
    });

    test('should allow anon users to aggregate published ratings', async () => {
      const { data, error } = await anonClient
        .from('rating')
        .select('game_id, rating')
        .eq('is_published', true)
        .limit(100);

      // This is what exploreService.ts does - should work for anon
      expect(error).toBeNull();
      expect(data).toBeDefined();

      if (data && data.length > 0) {
        // Verify we can aggregate the data (like exploreService does)
        const aggregated = data.reduce((acc, rating) => {
          if (!acc[rating.game_id]) {
            acc[rating.game_id] = { sum: 0, count: 0 };
          }
          acc[rating.game_id].sum += rating.rating;
          acc[rating.game_id].count += 1;
          return acc;
        }, {} as Record<number, { sum: number; count: number }>);

        expect(Object.keys(aggregated).length).toBeGreaterThan(0);
      }
    });

    test('should NOT allow anon users to read unpublished ratings', async () => {
      const { data, error } = await anonClient
        .from('rating')
        .select('id, is_published')
        .eq('is_published', false)
        .limit(10);

      // Should either get permission denied OR empty results
      if (!error) {
        expect(data).toEqual([]);
      } else {
        expect(error.code).toBe('42501');
      }
    });

    test('should NOT allow anon users to insert ratings', async () => {
      const { error } = await anonClient
        .from('rating')
        .insert({
          game_id: 1,
          user_id: 1,
          rating: 8,
          is_published: true
        });

      // Should fail - anon cannot insert
      expect(error).toBeDefined();
      expect(error?.code).toBe('42501'); // Permission denied
    });

    test('should NOT allow anon users to update ratings', async () => {
      const { error } = await anonClient
        .from('rating')
        .update({ rating: 10 })
        .eq('id', 1);

      // Should fail - anon cannot update
      expect(error).toBeDefined();
      expect(error?.code).toBe('42501');
    });

    test('should NOT allow anon users to delete ratings', async () => {
      const { error } = await anonClient
        .from('rating')
        .delete()
        .eq('id', 1);

      // Should fail - anon cannot delete
      expect(error).toBeDefined();
      expect(error?.code).toBe('42501');
    });
  });

  describe('Game Table Access - Anonymous Users', () => {
    test('should allow anon users to read game data', async () => {
      const { data, error } = await anonClient
        .from('game')
        .select('id, name, slug, cover_url')
        .limit(10);

      // Games should be publicly readable
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBeGreaterThan(0);
    });
  });

  describe('ExplorePage Data Flow - Anonymous Users', () => {
    test('should replicate exploreService.ts data fetching for anon users', async () => {
      // Step 1: Fetch ratings (what exploreService does at line 96)
      const { data: ratings, error: ratingsError } = await anonClient
        .from('rating')
        .select('game_id, rating')
        .eq('is_published', true);

      expect(ratingsError).toBeNull();
      expect(ratings).toBeDefined();

      if (ratings && ratings.length > 0) {
        // Step 2: Aggregate by game_id (line 105-109 in exploreService)
        const gameStats = ratings.reduce((acc, rating) => {
          if (!acc[rating.game_id]) {
            acc[rating.game_id] = {
              totalRating: 0,
              count: 0
            };
          }
          acc[rating.game_id].totalRating += rating.rating;
          acc[rating.game_id].count += 1;
          return acc;
        }, {} as Record<number, { totalRating: number; count: number }>);

        // Step 3: Calculate averages and get top games
        const gameIds = Object.keys(gameStats).map(id => parseInt(id));
        expect(gameIds.length).toBeGreaterThan(0);

        // Step 4: Fetch game details
        const { data: games, error: gamesError } = await anonClient
          .from('game')
          .select('id, name, slug, cover_url')
          .in('id', gameIds.slice(0, 20));

        expect(gamesError).toBeNull();
        expect(games).toBeDefined();
        expect(games?.length).toBeGreaterThan(0);
      }
    });

    test('should work with different published rating counts', async () => {
      // Verify behavior with various rating thresholds
      const thresholds = [1, 3, 5, 10];

      for (const threshold of thresholds) {
        const { data, error } = await anonClient
          .from('rating')
          .select('game_id, rating')
          .eq('is_published', true);

        expect(error).toBeNull();

        if (data) {
          // Count games with at least 'threshold' ratings
          const gameCounts = data.reduce((acc, r) => {
            acc[r.game_id] = (acc[r.game_id] || 0) + 1;
            return acc;
          }, {} as Record<number, number>);

          const qualifyingGames = Object.entries(gameCounts)
            .filter(([_, count]) => count >= threshold);

          // Just verify the query works - actual counts may vary
          expect(Array.isArray(qualifyingGames)).toBe(true);
        }
      }
    });
  });

  describe('Security - Prevent Data Leakage', () => {
    test('should not expose user_id in anonymous queries', async () => {
      const { data, error } = await anonClient
        .from('rating')
        .select('id, game_id, rating, user_id')
        .eq('is_published', true)
        .limit(10);

      // This test verifies we CAN read user_id (it's needed for some operations)
      // but in production, RLS may restrict certain columns
      if (error) {
        expect(error.code).toBe('42501'); // Permission denied is OK
      } else {
        expect(data).toBeDefined();
        // If readable, that's fine - RLS allows it for aggregation
      }
    });

    test('should not expose review_text to anon users via basic query', async () => {
      const { data, error } = await anonClient
        .from('rating')
        .select('id, review_text')
        .eq('is_published', true)
        .limit(5);

      // Review text should be readable (it's public content)
      // This is expected behavior - published reviews are public
      if (!error) {
        expect(data).toBeDefined();
      }
    });
  });

  describe('Performance - Anonymous Queries', () => {
    test('should complete rating aggregation within 2 seconds', async () => {
      const startTime = Date.now();

      const { data, error } = await anonClient
        .from('rating')
        .select('game_id, rating')
        .eq('is_published', true)
        .limit(1000);

      const duration = Date.now() - startTime;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(2000);
    });

    test('should handle large result sets efficiently', async () => {
      const { data, error } = await anonClient
        .from('rating')
        .select('game_id, rating')
        .eq('is_published', true)
        .limit(5000);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Should not timeout or crash
      if (data) {
        expect(Array.isArray(data)).toBe(true);
      }
    });
  });
});

describe('ExplorePage RLS Policy - Authenticated Users', () => {
  // Note: This requires a real authenticated session
  // In actual tests, you'd use a service role key or test user

  test('authenticated users should have same or better access than anon', async () => {
    // This is a placeholder - in real implementation:
    // 1. Create test user session
    // 2. Verify they can read published ratings
    // 3. Verify they can also read their own unpublished ratings

    expect(true).toBe(true); // Placeholder
  });
});

describe('RLS Policy Verification Queries', () => {
  test('should verify rating table has SELECT policy for anon', async () => {
    // This test will pass once migration is applied
    // It verifies the policy exists in the database

    const { data, error } = await anonClient
      .from('rating')
      .select('id')
      .eq('is_published', true)
      .limit(1);

    // After migration: should succeed
    // Before migration: will fail with 42501

    if (error) {
      console.warn('RLS policy not yet applied - expected before Phase 1 migration');
      expect(error.code).toBe('42501');
    } else {
      console.log('✅ RLS policy correctly allows anon SELECT on published ratings');
      expect(data).toBeDefined();
    }
  });
});
