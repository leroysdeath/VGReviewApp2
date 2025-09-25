import { UserService } from '../services/userService';

// Mock the entire supabase module
const mockSupabaseQuery = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(), 
  neq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  maybeSingle: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  in: jest.fn()
};

const mockSupabase = {
  from: jest.fn(() => mockSupabaseQuery),
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn()
  }
};

jest.mock('../services/supabase', () => ({
  supabase: mockSupabase
}));

describe('UserService Unit Tests', () => {
  let userService: UserService;
  
  const mockUser = {
    id: 'test-auth-id',
    email: 'test@example.com',
    user_metadata: { username: 'testuser' }
  };

  const mockDbUser = {
    id: 1,
    provider_id: 'test-auth-id',
    email: 'test@example.com',
    username: 'testuser',
    name: 'testuser'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService();
    
    // Mock Date.now for cache testing
    jest.spyOn(Date, 'now').mockReturnValue(Date.now());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Cache Management', () => {
    test('should initialize with empty cache', () => {
      const stats = userService.getCacheStats();
      expect(stats.userCacheSize).toBe(0);
      expect(stats.profileCacheSize).toBe(0);
      expect(stats.totalCachedItems).toBe(0);
    });

    test('should clear cache successfully', () => {
      // Manually add cache entry for testing
      userService['setCacheEntry']('test-id', 1);
      expect(userService.getCacheSize()).toBe(1);
      
      userService.clearCache();
      expect(userService.getCacheSize()).toBe(0);
    });

    test('should provide cache statistics', () => {
      // Add test entries
      userService['setCacheEntry']('user1', 1);
      userService['setCacheEntry']('user2', 2);
      
      const stats = userService.getCacheStats();
      expect(stats.userCacheSize).toBe(2);
      expect(stats.totalCachedItems).toBeGreaterThanOrEqual(2);
    });
  });

  describe('User Lookup Operations', () => {
    test('should validate auth user input', async () => {
      const result = await userService.getOrCreateDatabaseUser(null as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No authenticated user provided');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    test('should handle empty user ID', async () => {
      const invalidUser = { id: '', email: 'test@example.com' };
      
      const result = await userService.getOrCreateDatabaseUser(invalidUser as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No authenticated user provided');
    });

    test('should attempt database lookup for valid user', async () => {
      // Mock successful user lookup
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: mockDbUser,
        error: null
      });

      const result = await userService.getOrCreateDatabaseUser(mockUser as any);

      expect(mockSupabase.from).toHaveBeenCalledWith('user');
      expect(mockSupabaseQuery.select).toHaveBeenCalled();
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('provider_id', 'test-auth-id');
    });

    test('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabaseQuery.single.mockRejectedValueOnce(new Error('Database error'));

      const result = await userService.getOrCreateDatabaseUser(mockUser as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('User Creation Operations', () => {
    test('should generate username from email when not provided', () => {
      const email = 'john.doe@example.com';
      const expectedUsername = userService['generateUsernameFromEmail'](email);
      
      expect(expectedUsername).toBe('johndoe');
    });

    test('should handle invalid email formats', () => {
      const invalidEmail = 'not-an-email';
      const result = userService['generateUsernameFromEmail'](invalidEmail);
      
      expect(result).toBeNull();
    });

    test('should pad short usernames to minimum length', () => {
      const shortEmail = 'ab@example.com';
      const username = userService['generateUsernameFromEmail'](shortEmail);
      
      expect(username).toBe('ab0'); // Padded to 3 characters
    });

    test('should truncate long usernames', () => {
      const longEmail = 'verylongusernamethatisgreaterthan18chars@example.com';
      const username = userService['generateUsernameFromEmail'](longEmail);
      
      expect(username!.length).toBeLessThanOrEqual(18);
    });
  });

  describe('Profile Management', () => {
    test('should handle empty user IDs in batch fetch', async () => {
      const result = await userService.getUsersByIds([]);
      
      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    test('should prepare batch query for multiple user IDs', async () => {
      const userIds = [1, 2, 3];
      mockSupabaseQuery.in.mockResolvedValueOnce({
        data: [],
        error: null
      });

      await userService.getUsersByIds(userIds);

      expect(mockSupabase.from).toHaveBeenCalledWith('user');
      expect(mockSupabaseQuery.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseQuery.in).toHaveBeenCalledWith('id', userIds);
    });

    test('should handle batch operation errors', async () => {
      const userIds = [1, 2, 3];
      mockSupabaseQuery.in.mockRejectedValueOnce(new Error('Batch error'));

      const result = await userService.getUsersByIds(userIds);

      expect(result).toEqual([]);
    });
  });

  describe('Cache TTL and Cleanup', () => {
    test('should expire cache entries after TTL', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValueOnce(now);
      
      // Add cache entry
      userService['setCacheEntry']('test-user', 1);
      
      // Advance time past TTL (5 minutes + 1ms)
      jest.spyOn(Date, 'now').mockReturnValue(now + (5 * 60 * 1000) + 1);
      
      // Entry should be expired when accessed
      const cachedEntry = userService['getCacheEntry']('test-user');
      expect(cachedEntry).toBeNull();
    });

    test('should return valid cache entry within TTL', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);
      
      // Add cache entry
      userService['setCacheEntry']('test-user', 1);
      
      // Access within TTL (1 minute later)
      jest.spyOn(Date, 'now').mockReturnValue(now + (1 * 60 * 1000));
      
      const cachedEntry = userService['getCacheEntry']('test-user');
      expect(cachedEntry).toBe(1);
    });
  });

  describe('Error Boundary Testing', () => {
    test('should handle null/undefined inputs gracefully', async () => {
      const testCases = [null, undefined, {}, { id: null }, { id: undefined }];
      
      for (const testCase of testCases) {
        const result = await userService.getOrCreateDatabaseUser(testCase as any);
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
      }
    });

    test('should handle malformed user metadata', async () => {
      const malformedUser = {
        id: 'valid-id',
        email: 'test@example.com',
        user_metadata: 'not-an-object' // Should be object but is string
      };

      // Mock database lookup to fail initially
      mockSupabaseQuery.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({ count: 0 }) // Username available
        .mockResolvedValueOnce({ data: mockDbUser, error: null }); // Insert success

      const result = await userService.getOrCreateDatabaseUser(malformedUser as any);
      
      // Should handle gracefully and proceed with creation
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Performance Considerations', () => {
    test('should handle large batch operations', async () => {
      const largeUserIdList = Array.from({ length: 100 }, (_, i) => i + 1);
      mockSupabaseQuery.in.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const startTime = Date.now();
      await userService.getUsersByIds(largeUserIdList);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time (< 100ms for mock operations)
      expect(duration).toBeLessThan(100);
      expect(mockSupabaseQuery.in).toHaveBeenCalledWith('id', largeUserIdList);
    });

    test('should not block on concurrent operations', async () => {
      // Mock successful operations
      mockSupabaseQuery.single.mockResolvedValue({
        data: mockDbUser,
        error: null
      });

      const promises = Array.from({ length: 10 }, (_, i) => 
        userService.getOrCreateDatabaseUser({
          ...mockUser,
          id: `concurrent-${i}`
        } as any)
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // All should resolve
      expect(results).toHaveLength(10);
      
      // Should complete concurrently (much faster than sequential)
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Integration Boundaries', () => {
    test('should properly format database queries', async () => {
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: mockDbUser,
        error: null
      });

      await userService.getOrCreateDatabaseUser(mockUser as any);

      // Verify proper query structure
      expect(mockSupabase.from).toHaveBeenCalledWith('user');
      expect(mockSupabaseQuery.select).toHaveBeenCalledWith('id');
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('provider_id', mockUser.id);
      expect(mockSupabaseQuery.single).toHaveBeenCalled();
    });

    test('should handle profile updates with proper structure', async () => {
      const updates = { name: 'New Name', bio: 'New bio' };
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: { ...mockDbUser, ...updates },
        error: null
      });

      const result = await userService.updateUserProfile(1, updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('user');
      expect(mockSupabaseQuery.update).toHaveBeenCalled();
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('id', 1);
    });
  });
});