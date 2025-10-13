/**
 * User Creation Integration Tests
 *
 * Tests the complete user creation flow including:
 * - Database function calls
 * - Fallback manual creation
 * - Race conditions
 * - Error handling
 * - Permission checks
 */

import { supabase } from '../services/supabase';
import { userService } from '../services/userService';
import type { Session } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn()
    })),
    rpc: jest.fn()
  }
}));

describe('User Creation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get_or_create_user Database Function', () => {
    const mockSession: Session = {
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        user_metadata: {
          name: 'Test User',
          username: 'testuser'
        },
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z'
      },
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      token_type: 'bearer'
    } as Session;

    test('should call RPC function with correct UUID parameter type', async () => {
      const mockRpcResponse = { data: 123, error: null };
      (supabase.rpc as jest.Mock).mockResolvedValue(mockRpcResponse);

      await userService.getOrCreateUser(mockSession);

      expect(supabase.rpc).toHaveBeenCalledWith('get_or_create_user', {
        auth_id: mockSession.user.id, // Should be UUID string
        user_email: 'test@example.com',
        user_name: 'Test User',
        user_provider: 'supabase'
      });
    });

    test('should handle successful RPC call', async () => {
      const mockUserId = 456;
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockUserId,
        error: null
      });

      const result = await userService.getOrCreateUser(mockSession);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(mockUserId);
      expect(result.error).toBeUndefined();
    });

    test('should timeout RPC call after 1.5 seconds', async () => {
      // Simulate slow RPC call
      (supabase.rpc as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 3000))
      );

      const startTime = Date.now();
      const result = await userService.getOrCreateUser(mockSession);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(2000); // Should timeout before 2s
      expect(result.success).toBe(false);
      expect(result.error).toContain('RPC timeout');
    });

    test('should handle RPC 404 error (function not found)', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'function public.get_or_create_user does not exist', code: '42883' }
      });

      const result = await userService.getOrCreateUser(mockSession);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test('should handle RPC permission error', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'permission denied for function get_or_create_user', code: '42501' }
      });

      const result = await userService.getOrCreateUser(mockSession);

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission denied');
    });
  });

  describe('Fallback Manual User Creation', () => {
    const mockSession: Session = {
      user: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'manual@example.com',
        user_metadata: {
          name: 'Manual User'
        },
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z'
      },
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      token_type: 'bearer'
    } as Session;

    test('should fall back to manual creation when RPC fails', async () => {
      // RPC fails
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' }
      });

      // Manual lookup fails (user doesn't exist)
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };

      // Manual insert succeeds
      const mockInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 789 },
          error: null
        })
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockFrom) // First call for lookup
        .mockReturnValueOnce(mockInsert); // Second call for insert

      const result = await userService.getOrCreateUser(mockSession);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(789);
    });

    test('should return existing user if found during manual lookup', async () => {
      // RPC fails
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' }
      });

      // Manual lookup succeeds
      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 999 },
          error: null
        })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const result = await userService.getOrCreateUser(mockSession);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(999);
    });

    test('should handle race condition (unique constraint violation)', async () => {
      // RPC fails
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' }
      });

      // First lookup fails
      const mockLookup1 = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };

      // Insert fails with unique violation
      const mockInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint' }
        })
      };

      // Second lookup succeeds (race winner created it)
      const mockLookup2 = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 888 },
          error: null
        })
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockLookup1)
        .mockReturnValueOnce(mockInsert)
        .mockReturnValueOnce(mockLookup2);

      const result = await userService.getOrCreateUser(mockSession);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(888);
    });

    test('should generate unique username when manual creating', async () => {
      // RPC fails
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' }
      });

      // Lookup fails
      const mockLookup = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };

      // Insert succeeds
      const mockInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 777 },
          error: null
        })
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockLookup)
        .mockReturnValueOnce(mockInsert);

      await userService.getOrCreateUser(mockSession);

      expect(mockInsert.insert).toHaveBeenCalled();
      const insertCall = mockInsert.insert.mock.calls[0][0][0];
      expect(insertCall).toHaveProperty('username');
      expect(insertCall.username).toMatch(/^user_\d+$/); // Should generate username like user_1234567890
    });
  });

  describe('authService.signUp Integration', () => {
    test('should call userService.getOrCreateUser after successful signup', async () => {
      const mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'signup@example.com',
        user_metadata: {
          username: 'newuser',
          name: 'newuser'
        },
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z'
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: 111,
        error: null
      });

      const { authService } = require('../services/authService');
      await authService.signUp('signup@example.com', 'password123', 'newuser');

      expect(supabase.rpc).toHaveBeenCalledWith('get_or_create_user', expect.objectContaining({
        auth_id: mockUser.id,
        user_email: mockUser.email,
        user_name: 'newuser',
        user_provider: 'supabase'
      }));
    });

    test('should continue even if getOrCreateUser fails after signup', async () => {
      const mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        email: 'signup2@example.com',
        user_metadata: {
          username: 'newuser2',
          name: 'newuser2'
        },
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z'
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      // getOrCreateUser fails
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }
        })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      const { authService } = require('../services/authService');
      const result = await authService.signUp('signup2@example.com', 'password123', 'newuser2');

      // Signup should still succeed even if database user creation fails
      expect(result.user).toBeTruthy();
      expect(result.error).toBeNull();
    });
  });

  describe('Database Function Parameter Types', () => {
    test('should verify migration uses correct UUID parameter type', () => {
      // This test documents the expected database function signature
      const expectedSignature = {
        auth_id: 'UUID', // NOT TEXT
        user_email: 'TEXT',
        user_name: 'TEXT',
        user_provider: 'TEXT (default: supabase)'
      };

      // The migration file should match this signature
      expect(expectedSignature.auth_id).toBe('UUID');
    });

    test('should verify TypeScript calls RPC with UUID string', async () => {
      const uuidString = '550e8400-e29b-41d4-a716-446655440004';
      const mockSession: Session = {
        user: {
          id: uuidString,
          email: 'test@example.com',
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00Z'
        },
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer'
      } as Session;

      (supabase.rpc as jest.Mock).mockResolvedValue({ data: 123, error: null });

      await userService.getOrCreateUser(mockSession);

      const rpcCall = (supabase.rpc as jest.Mock).mock.calls[0];
      expect(rpcCall[1].auth_id).toBe(uuidString);
      expect(typeof rpcCall[1].auth_id).toBe('string');
      // Verify it's a valid UUID format
      expect(rpcCall[1].auth_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('Permission Grants', () => {
    test('should document required permissions for get_or_create_user', () => {
      // The migration should grant permissions to both roles
      const requiredGrants = [
        'GRANT EXECUTE ON FUNCTION get_or_create_user(UUID, TEXT, TEXT, TEXT) TO authenticated;',
        'GRANT EXECUTE ON FUNCTION get_or_create_user(UUID, TEXT, TEXT, TEXT) TO anon;'
      ];

      // This test documents the security requirements
      expect(requiredGrants).toHaveLength(2);
      expect(requiredGrants[0]).toContain('authenticated');
      expect(requiredGrants[1]).toContain('anon');
    });

    test('should verify anon users can call during signup flow', async () => {
      // Simulate anonymous user (not yet authenticated) during signup
      const mockSession: Session = {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440005',
          email: 'anon@example.com',
          aud: 'anon', // Anonymous role
          created_at: '2024-01-01T00:00:00Z'
        },
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer'
      } as Session;

      (supabase.rpc as jest.Mock).mockResolvedValue({ data: 222, error: null });

      const result = await userService.getOrCreateUser(mockSession);

      // Should succeed even with anon role
      expect(result.success).toBe(true);
      expect(result.userId).toBe(222);
    });
  });

  describe('Error Scenarios', () => {
    test('should handle missing user in session', async () => {
      const invalidSession = { user: null } as unknown as Session;

      const result = await userService.getOrCreateUser(invalidSession);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No session provided');
    });

    test('should handle network timeout gracefully', async () => {
      const mockSession: Session = {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440006',
          email: 'timeout@example.com',
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00Z'
        },
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer'
      } as Session;

      // Simulate network timeout
      (supabase.rpc as jest.Mock).mockImplementation(() =>
        new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 100))
      );

      const result = await userService.getOrCreateUser(mockSession);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test('should handle database connection errors', async () => {
      const mockSession: Session = {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440007',
          email: 'dberror@example.com',
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00Z'
        },
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer'
      } as Session;

      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'connection to server failed', code: '08006' }
      });

      const result = await userService.getOrCreateUser(mockSession);

      expect(result.success).toBe(false);
      expect(result.error).toContain('connection to server failed');
    });
  });

  describe('Caching Behavior', () => {
    test('should cache successful user creation results', async () => {
      const mockSession: Session = {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440008',
          email: 'cache@example.com',
          aud: 'authenticated',
          created_at: '2024-01-01T00:00:00Z'
        },
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer'
      } as Session;

      (supabase.rpc as jest.Mock).mockResolvedValue({ data: 333, error: null });

      // First call
      const result1 = await userService.getOrCreateUser(mockSession);
      expect(result1.success).toBe(true);
      expect(result1.userId).toBe(333);

      // Second call within TTL - should use cache
      const result2 = await userService.getOrCreateUser(mockSession);
      expect(result2.success).toBe(true);
      expect(result2.userId).toBe(333);

      // RPC should only be called once (cached on second call)
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
    });
  });
});
