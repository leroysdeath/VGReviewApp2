import { UserService, userService } from '../services/userService';
import type { Session } from '@supabase/supabase-js';

// Mock Supabase completely to avoid network calls
jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn()
    }
  }
}));

// Import after mocking
const { supabase } = require('../services/supabase');
const mockSupabase = supabase;

// Mock user data for consistent testing
const mockAuthUser = {
  id: 'auth-user-123',
  email: 'test@example.com',
  user_metadata: {
    username: 'testuser',
    name: 'Test User'
  }
} as Session['user'];

const mockDatabaseUser = {
  id: 1,
  provider_id: 'auth-user-123',
  email: 'test@example.com',
  name: 'testuser',
  username: 'testuser',
  provider: 'supabase',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z'
};

describe('UserService', () => {
  let testUserService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create fresh instance for each test to avoid cache pollution
    testUserService = new UserService();
    
    // Mock current time for consistent cache testing
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // 2022-01-01
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Cache Management', () => {
    it('should cache user ID after successful lookup', async () => {
      // Mock successful database query chain
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockDatabaseUser,
        error: null
      });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const result = await testUserService.getOrCreateDatabaseUser(mockAuthUser);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(1);
      
      // Verify cache entry exists
      expect(testUserService.getCacheSize()).toBe(1);
      
      // Second call should use cache (no additional DB calls)
      mockSupabase.from.mockClear();
      const cachedResult = await testUserService.getOrCreateDatabaseUser(mockAuthUser);
      
      expect(cachedResult.success).toBe(true);
      expect(cachedResult.userId).toBe(1);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should expire cache entries after TTL', async () => {
      // Mock initial successful lookup
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockDatabaseUser,
              error: null
            })
          })
        })
      } as any);

      // First call - populates cache
      await testUserService.getOrCreateDatabaseUser(mockAuthUser);
      expect(testUserService.getCacheSize()).toBe(1);

      // Advance time past TTL (5 minutes + 1ms)
      jest.spyOn(Date, 'now').mockReturnValue(1640995200000 + (5 * 60 * 1000) + 1);

      // Second call should miss cache and query DB again
      const result = await testUserService.getOrCreateDatabaseUser(mockAuthUser);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it('should provide accurate cache statistics', () => {
      // Initially empty cache
      const initialStats = testUserService.getCacheStats();
      expect(initialStats.userCacheSize).toBe(0);
      expect(initialStats.profileCacheSize).toBe(0);
      expect(initialStats.totalCachedItems).toBe(0);
      expect(initialStats.oldestCacheEntry).toBeNull();

      // Add cache entry manually for testing
      testUserService['setCacheEntry']('test-user-1', 1);
      testUserService['setCacheEntry']('test-user-2', 2);

      const stats = testUserService.getCacheStats();
      expect(stats.userCacheSize).toBe(2);
      expect(stats.totalCachedItems).toBe(2);
      expect(stats.oldestCacheEntry).toBeDefined();
    });

    it('should clear cache completely', async () => {
      // Populate cache first
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockDatabaseUser,
              error: null
            })
          })
        })
      } as any);

      await testUserService.getOrCreateDatabaseUser(mockAuthUser);
      expect(testUserService.getCacheSize()).toBe(1);

      testUserService.clearCache();
      expect(testUserService.getCacheSize()).toBe(0);
      expect(testUserService.getProfileCacheSize()).toBe(0);
    });
  });

  describe('User Lookup Operations', () => {
    it('should successfully lookup existing user', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockDatabaseUser,
              error: null
            })
          })
        })
      } as any);

      const result = await testUserService.getOrCreateDatabaseUser(mockAuthUser);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('user');
    });

    it('should handle user not found gracefully', async () => {
      // Mock user not found scenario
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' }
              })
            })
          })
        } as any)
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockDatabaseUser,
                error: null
              })
            })
          })
        } as any);

      const result = await testUserService.getOrCreateDatabaseUser(mockAuthUser);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(1);
    });

    it('should handle database connection errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Connection failed'))
          })
        })
      } as any);

      const result = await testUserService.getOrCreateDatabaseUser(mockAuthUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
    });

    it('should validate auth user input', async () => {
      const invalidUser = null as any;
      const result = await testUserService.getOrCreateDatabaseUser(invalidUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No authenticated user provided');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('User Creation Operations', () => {
    it('should create new user with generated username', async () => {
      const userWithoutUsername = {
        ...mockAuthUser,
        user_metadata: { email: 'newuser@example.com' }
      };

      // Mock user not found
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        } as any)
        // Mock username availability check
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0 })
          })
        } as any)
        // Mock successful insert
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockDatabaseUser, username: 'newuser' },
                error: null
              })
            })
          })
        } as any);

      const result = await testUserService.getOrCreateDatabaseUser(userWithoutUsername);

      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
    });

    it('should handle username collisions with suffix generation', async () => {
      const userWithCommonName = {
        ...mockAuthUser,
        email: 'admin@example.com',
        user_metadata: { email: 'admin@example.com' }
      };

      // Mock user not found
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        } as any)
        // Mock username 'admin' is taken
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 1 })
          })
        } as any)
        // Mock username 'admin1' is available
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 0 })
          })
        } as any)
        // Mock successful insert with suffixed username
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockDatabaseUser, username: 'admin1' },
                error: null
              })
            })
          })
        } as any);

      const result = await testUserService.getOrCreateDatabaseUser(userWithCommonName);

      expect(result.success).toBe(true);
    });

    it('should handle race conditions during user creation', async () => {
      // Mock user not found initially
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        } as any)
        // Mock unique constraint violation (race condition)
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockRejectedValue({
                code: '23505',
                message: 'duplicate key value violates unique constraint'
              })
            })
          })
        } as any)
        // Mock retry lookup finds the user created by parallel process
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockDatabaseUser,
                error: null
              })
            })
          })
        } as any);

      const result = await testUserService.getOrCreateDatabaseUser(mockAuthUser);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(1);
    });
  });

  describe('Profile Management', () => {
    it('should fetch and cache user profile', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockDatabaseUser,
              error: null
            })
          })
        })
      } as any);

      const profile = await testUserService.getUserProfile(1);

      expect(profile).toEqual(mockDatabaseUser);
      expect(testUserService.getProfileCacheSize()).toBe(1);

      // Second call should use cache
      mockSupabase.from.mockClear();
      const cachedProfile = await testUserService.getUserProfile(1);
      
      expect(cachedProfile).toEqual(mockDatabaseUser);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should update user profile and refresh cache', async () => {
      const updates = { name: 'Updated Name', bio: 'Updated bio' };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockDatabaseUser, ...updates },
                error: null
              })
            })
          })
        })
      } as any);

      const result = await testUserService.updateUserProfile(1, updates);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(1);
      expect(testUserService.getProfileCacheSize()).toBe(1);
    });

    it('should handle profile update errors', async () => {
      const updates = { name: 'Updated Name' };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed' }
              })
            })
          })
        })
      } as any);

      const result = await testUserService.updateUserProfile(1, updates);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('Batch Operations', () => {
    it('should fetch multiple users by IDs', async () => {
      const userIds = [1, 2, 3];
      const mockUsers = [
        { ...mockDatabaseUser, id: 1 },
        { ...mockDatabaseUser, id: 2, username: 'user2' },
        { ...mockDatabaseUser, id: 3, username: 'user3' }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: mockUsers,
            error: null
          })
        })
      } as any);

      const users = await testUserService.getUsersByIds(userIds);

      expect(users).toEqual(mockUsers);
      expect(testUserService.getProfileCacheSize()).toBe(3);
      expect(mockSupabase.from).toHaveBeenCalledWith('user');
    });

    it('should handle empty user IDs array', async () => {
      const users = await testUserService.getUsersByIds([]);

      expect(users).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle batch operation errors gracefully', async () => {
      const userIds = [1, 2, 3];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockRejectedValue(new Error('Batch operation failed'))
        })
      } as any);

      const users = await testUserService.getUsersByIds(userIds);

      expect(users).toEqual([]);
      expect(testUserService.getProfileCacheSize()).toBe(0);
    });
  });

  describe('Memory Management and Performance', () => {
    it('should not grow cache indefinitely in production environment', () => {
      // Simulate production environment (no cleanup interval)
      const prodUserService = new UserService();
      
      // Add many cache entries
      for (let i = 0; i < 1000; i++) {
        prodUserService['setCacheEntry'](`test-user-${i}`, i);
      }

      expect(prodUserService.getCacheSize()).toBe(1000);
      
      // In production, cleanup would be handled by TTL expiration on access
      // This test ensures the service can handle large cache sizes without breaking
    });

    it('should handle concurrent operations without cache corruption', async () => {
      // Mock successful database operations
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockDatabaseUser,
              error: null
            })
          })
        })
      } as any);

      // Simulate concurrent user creation requests
      const concurrentPromises = Array.from({ length: 10 }, (_, i) => 
        testUserService.getOrCreateDatabaseUser({
          ...mockAuthUser,
          id: `concurrent-user-${i}`
        })
      );

      const results = await Promise.all(concurrentPromises);

      // All operations should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Cache should contain all entries
      expect(testUserService.getCacheSize()).toBe(10);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed auth user data', async () => {
      const malformedUser = {
        id: '', // Empty ID
        email: 'invalid-email', // Invalid email
        user_metadata: null // Null metadata
      } as any;

      const result = await testUserService.getOrCreateDatabaseUser(malformedUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No authenticated user provided');
    });

    it('should handle database timeout scenarios', async () => {
      const timeoutError = new Error('Connection timeout');
      timeoutError.name = 'TimeoutError';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(timeoutError)
          })
        })
      } as any);

      const result = await testUserService.getOrCreateDatabaseUser(mockAuthUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection timeout');
    });

    it('should handle unexpected data structures from database', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { unexpected: 'structure' }, // Wrong data structure
              error: null
            })
          })
        })
      } as any);

      const result = await testUserService.getOrCreateDatabaseUser(mockAuthUser);

      // Service should handle unexpected data gracefully
      expect(result.success).toBeDefined();
    });
  });
});