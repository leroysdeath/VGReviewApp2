/**
 * Unit Tests for userService Cache Management
 *
 * Tests the cache management fixes to prevent stale data issues:
 * - Cache invalidation on clearCache()
 * - Profile cache TTL and cleanup
 * - User cache consistency
 * - State logger integration
 */

import { userService } from '../userService';
import { supabase } from '../supabase';
import { stateLogger } from '../../utils/stateLogger';

// Mock dependencies
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn()
    })),
    rpc: jest.fn()
  }
}));

jest.mock('../../utils/stateLogger');

describe('userService Cache Management', () => {
  const mockProviderId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID v4
  const mockUserId = 456;

  const mockDatabaseUser = {
    id: mockUserId,
    provider_id: mockProviderId,
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    display_name: '',
    bio: 'Test bio',
    location: 'Test City',
    website: 'https://test.com',
    avatar_url: 'https://example.com/avatar.png',
    platform: 'PC',
    provider: 'supabase',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  };

  const mockSession = {
    user: {
      id: mockProviderId,
      email: 'test@example.com',
      user_metadata: {
        name: 'Test User',
        username: 'testuser'
      }
    },
    access_token: 'mock-token',
    refresh_token: 'mock-refresh'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear cache before each test
    userService.clearCache();

    // Default supabase mocks
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockSession.user },
      error: null
    });
  });

  describe('clearCache()', () => {
    test('should clear all caches when called', async () => {
      // First, populate the caches
      const fromMock = supabase.from as jest.Mock;
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDatabaseUser,
          error: null
        })
      });

      // Fetch profile to populate cache
      await userService.getUserProfile(mockProviderId);

      // Clear state logger calls
      jest.clearAllMocks();

      // Clear cache
      userService.clearCache();

      // Verify state logger tracked the clear
      expect(stateLogger.log).toHaveBeenCalledWith(
        'userService_clearCache',
        expect.objectContaining({
          profileCacheSize: expect.any(Number),
          userCacheSize: expect.any(Number),
          timestampCacheSize: expect.any(Number)
        })
      );

      // Verify cache is empty by triggering another fetch
      jest.clearAllMocks();
      await userService.getUserProfile(mockProviderId);

      // Should have made a database call (cache miss)
      expect(fromMock).toHaveBeenCalled();
    });

    test('should handle clearCache when caches are already empty', () => {
      // Clear on empty cache should not throw
      expect(() => userService.clearCache()).not.toThrow();

      expect(stateLogger.log).toHaveBeenCalledWith(
        'userService_clearCache',
        expect.any(Object)
      );
    });

    test('should clear user cache and profile cache independently', async () => {
      const fromMock = supabase.from as jest.Mock;
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDatabaseUser,
          error: null
        })
      });

      // Populate profile cache
      await userService.getUserProfile(mockProviderId);

      // Populate user cache
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockUserId,
        error: null
      });
      await userService.getOrCreateUser(mockSession as any);

      // Clear all
      userService.clearCache();

      // Both caches should be cleared
      jest.clearAllMocks();

      await userService.getUserProfile(mockProviderId);
      expect(fromMock).toHaveBeenCalled(); // Cache miss

      await userService.getOrCreateUser(mockSession as any);
      expect(supabase.rpc).toHaveBeenCalled(); // Cache miss
    });
  });

  describe('Profile Cache Management', () => {
    test('should cache profile after successful fetch', async () => {
      const fromMock = supabase.from as jest.Mock;
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDatabaseUser,
          error: null
        })
      });

      // First fetch - should hit database
      const result1 = await userService.getUserProfile(mockProviderId);
      expect(result1.success).toBe(true);
      expect(fromMock).toHaveBeenCalledTimes(1);

      // Second fetch - should use cache
      jest.clearAllMocks();
      const result2 = await userService.getUserProfile(mockProviderId);
      expect(result2.success).toBe(true);
      expect(fromMock).not.toHaveBeenCalled(); // Cache hit
    });

    test('should cache profile by both provider_id and user id', async () => {
      const fromMock = supabase.from as jest.Mock;
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDatabaseUser,
          error: null
        })
      });

      // Fetch by provider_id
      await userService.getUserProfile(mockProviderId);

      jest.clearAllMocks();

      // Fetch by user id - should also hit cache
      const result = await userService.getUserProfileById(mockUserId);
      expect(result.success).toBe(true);
      expect(fromMock).toHaveBeenCalledTimes(1); // Only 1 call, uses cache for second
    });

    test('should not cache failed profile fetches', async () => {
      const fromMock = supabase.from as jest.Mock;
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found', code: 'PGRST116' }
        })
      });

      // First fetch - fails
      const result1 = await userService.getUserProfile(mockProviderId);
      expect(result1.success).toBe(false);

      // Second fetch - should retry database (not cached)
      jest.clearAllMocks();
      const result2 = await userService.getUserProfile(mockProviderId);
      expect(fromMock).toHaveBeenCalled(); // Should make a new call
    });

    test('should update cached profile when updateUserProfile succeeds', async () => {
      const fromMock = supabase.from as jest.Mock;

      // Initial fetch
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDatabaseUser,
          error: null
        })
      });

      await userService.getUserProfile(mockProviderId);

      // Update profile
      const updatedUser = { ...mockDatabaseUser, bio: 'Updated bio' };
      fromMock.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: updatedUser,
          error: null
        })
      });

      await userService.updateUserProfile(mockUserId, { bio: 'Updated bio' });

      // Fetch again - should have updated cache
      jest.clearAllMocks();
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: updatedUser,
          error: null
        })
      });

      const result = await userService.getUserProfile(mockProviderId);
      expect(result.success).toBe(true);
      expect(result.data?.bio).toBe('Updated bio');
    });

    test('should clear profile cache for specific user with clearProfileCache', async () => {
      const fromMock = supabase.from as jest.Mock;
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDatabaseUser,
          error: null
        })
      });

      // Populate cache
      await userService.getUserProfile(mockProviderId);

      // Clear specific user cache
      userService.clearProfileCache(mockProviderId);

      // Next fetch should hit database
      jest.clearAllMocks();
      await userService.getUserProfile(mockProviderId);
      expect(fromMock).toHaveBeenCalled();
    });
  });

  describe('User Cache Management', () => {
    test('should cache getOrCreateUser result', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockUserId,
        error: null
      });

      // First call
      const result1 = await userService.getOrCreateUser(mockSession as any);
      expect(result1.success).toBe(true);
      expect(result1.userId).toBe(mockUserId);
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      jest.clearAllMocks();
      const result2 = await userService.getOrCreateUser(mockSession as any);
      expect(result2.success).toBe(true);
      expect(result2.userId).toBe(mockUserId);
      expect(supabase.rpc).not.toHaveBeenCalled();

      // Verify cache hit was logged
      expect(stateLogger.log).toHaveBeenCalledWith(
        'userService_cache_hit',
        expect.objectContaining({
          userId: mockProviderId,
          cachedUserId: mockUserId
        })
      );
    });

    test('should not cache failed getOrCreateUser attempts', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' }
      });

      // Mock manual operation to also fail
      const fromMock = supabase.from as jest.Mock;
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        }),
        insert: jest.fn().mockReturnThis()
      });

      // First call - fails
      const result1 = await userService.getOrCreateUser(mockSession as any);
      expect(result1.success).toBe(false);

      // Second call - should retry (not cached)
      jest.clearAllMocks();
      await userService.getOrCreateUser(mockSession as any);
      expect(supabase.rpc).toHaveBeenCalled();
    });

    test('should log cache miss when user not in cache', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockUserId,
        error: null
      });

      await userService.getOrCreateUser(mockSession as any);

      expect(stateLogger.log).toHaveBeenCalledWith(
        'userService_cache_miss',
        { userId: mockProviderId }
      );
    });
  });

  describe('Cache TTL and Cleanup', () => {
    test('cache should expire after TTL', async () => {
      const fromMock = supabase.from as jest.Mock;
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDatabaseUser,
          error: null
        })
      });

      // Fetch to populate cache
      await userService.getUserProfile(mockProviderId);
      expect(fromMock).toHaveBeenCalledTimes(1);

      // Mock time passing (5 minutes + 1 second)
      jest.useFakeTimers();
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000);

      // Trigger cache cleanup manually (normally runs on interval)
      userService['cleanupCache']();

      jest.useRealTimers();

      // Next fetch should hit database (cache expired)
      jest.clearAllMocks();
      await userService.getUserProfile(mockProviderId);
      expect(fromMock).toHaveBeenCalled();
    });

    test('cache should NOT expire before TTL', async () => {
      const fromMock = supabase.from as jest.Mock;
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDatabaseUser,
          error: null
        })
      });

      // Fetch to populate cache
      await userService.getUserProfile(mockProviderId);
      expect(fromMock).toHaveBeenCalledTimes(1);

      // Mock time passing (4 minutes - still within TTL)
      jest.useFakeTimers();
      jest.advanceTimersByTime(4 * 60 * 1000);
      jest.useRealTimers();

      // Next fetch should use cache
      jest.clearAllMocks();
      await userService.getUserProfile(mockProviderId);
      expect(fromMock).not.toHaveBeenCalled();
    });
  });

  describe('State Logger Integration', () => {
    test('should log getOrCreateUser lifecycle', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockUserId,
        error: null
      });

      await userService.getOrCreateUser(mockSession as any);

      expect(stateLogger.log).toHaveBeenCalledWith(
        'userService_getOrCreateUser_start',
        expect.objectContaining({
          hasSession: true,
          userId: mockProviderId
        })
      );

      expect(stateLogger.log).toHaveBeenCalledWith(
        'userService_db_function_success',
        expect.objectContaining({
          userId: mockProviderId,
          dbUserId: mockUserId
        })
      );
    });

    test('should log database function failure and manual fallback', async () => {
      // Database function fails
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Function error', code: '42883' }
      });

      // Manual lookup succeeds
      const fromMock = supabase.from as jest.Mock;
      fromMock.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockUserId },
          error: null
        })
      });

      await userService.getOrCreateUser(mockSession as any);

      expect(stateLogger.log).toHaveBeenCalledWith(
        'userService_db_function_failed',
        expect.objectContaining({
          userId: mockProviderId,
          error: expect.any(String)
        })
      );

      expect(stateLogger.log).toHaveBeenCalledWith(
        'userService_manual_success',
        expect.objectContaining({
          userId: mockProviderId,
          dbUserId: mockUserId
        })
      );
    });

    test('should log cache statistics on clearCache', () => {
      userService.clearCache();

      expect(stateLogger.log).toHaveBeenCalledWith(
        'userService_clearCache',
        expect.objectContaining({
          profileCacheSize: expect.any(Number),
          userCacheSize: expect.any(Number),
          timestampCacheSize: expect.any(Number)
        })
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle concurrent getOrCreateUser calls', async () => {
      (supabase.rpc as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: mockUserId, error: null }), 100))
      );

      // Make 3 concurrent calls
      const promises = [
        userService.getOrCreateUser(mockSession as any),
        userService.getOrCreateUser(mockSession as any),
        userService.getOrCreateUser(mockSession as any)
      ];

      const results = await Promise.all(promises);

      // All should succeed with same userId
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.userId).toBe(mockUserId);
      });

      // Should have cached after first call
      // (subsequent calls may hit cache depending on timing)
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
    });

    test('should handle invalid provider_id gracefully', async () => {
      const result = await userService.getUserProfile('invalid-uuid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid provider ID format');
    });

    test('should handle missing session in getOrCreateUser', async () => {
      const result = await userService.getOrCreateUser(undefined as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No session provided');

      expect(stateLogger.log).toHaveBeenCalledWith('userService_no_session', {});
    });
  });
});
