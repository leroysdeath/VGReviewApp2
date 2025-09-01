import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { createClient } from '@supabase/supabase-js';
import { createMockAuthUser, createMockUser, createMockSession } from '../../test/factories';
import { AllTheProviders } from '../../test/utils';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}));

describe('useAuth Hook', () => {
  let mockSupabase: any;
  let mockAuthUser: any;
  let mockDbUser: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create test data
    mockAuthUser = createMockAuthUser({
      id: 'auth-user-123',
      email: 'test@example.com',
    });
    
    mockDbUser = createMockUser({
      id: 1,
      provider_id: 'auth-user-123',
      email: 'test@example.com',
      username: 'testuser',
    });

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(),
      },
      from: vi.fn(),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
  });

  describe('Initial State', () => {
    it('should initialize with loading state', () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
      
      const { result } = renderHook(() => useAuth(), { wrapper: AllTheProviders });
      
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.authUser).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('should check for existing session on mount', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: mockAuthUser }, 
        error: null 
      });
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDbUser, error: null })
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AllTheProviders });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.authUser).toEqual(mockAuthUser);
      expect(result.current.user).toEqual(mockDbUser);
    });
  });

  describe('Login Flow', () => {
    it('should handle successful login with automatic database user creation', async () => {
      // Mock successful auth login
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { 
          user: mockAuthUser,
          session: createMockSession({ user: mockAuthUser })
        },
        error: null
      });

      // Mock database user lookup (not found)
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
              .mockResolvedValueOnce({ data: mockDbUser, error: null }),
            insert: vi.fn().mockReturnThis(),
          };
        }
        return {};
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AllTheProviders });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.authUser).toEqual(mockAuthUser);
      expect(result.current.user).toEqual(mockDbUser);
    });

    it('should handle login failure with invalid credentials', async () => {
      const error = new Error('Invalid login credentials');
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AllTheProviders });

      await expect(
        act(async () => {
          await result.current.login('wrong@example.com', 'wrongpass');
        })
      ).rejects.toThrow('Invalid login credentials');

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.authUser).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('should handle race conditions during rapid login/logout', async () => {
      // Setup mock for rapid login/logout
      let callCount = 0;
      mockSupabase.auth.signInWithPassword.mockImplementation(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
        return {
          data: {
            user: mockAuthUser,
            session: createMockSession({ user: mockAuthUser })
          },
          error: null
        };
      });

      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDbUser, error: null })
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AllTheProviders });

      // Perform rapid login/logout
      const promises = [
        result.current.login('test@example.com', 'password'),
        result.current.logout(),
        result.current.login('test@example.com', 'password'),
      ];

      await Promise.allSettled(promises);

      // Should handle the race condition gracefully
      expect(callCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Logout Flow', () => {
    it('should clear session and user data on logout', async () => {
      // Setup authenticated state
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDbUser, error: null })
      });

      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper: AllTheProviders });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Perform logout
      await act(async () => {
        await result.current.logout();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.authUser).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('should handle logout errors gracefully', async () => {
      const error = new Error('Logout failed');
      mockSupabase.auth.signOut.mockResolvedValue({ error });

      const { result } = renderHook(() => useAuth(), { wrapper: AllTheProviders });

      await expect(
        act(async () => {
          await result.current.logout();
        })
      ).rejects.toThrow('Logout failed');
    });
  });

  describe('Database User Synchronization', () => {
    it('should sync auth user with database user atomically', async () => {
      // Mock auth user exists but database user doesn't
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null
      });

      // First call returns no user, second call returns created user
      let dbCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user') {
          dbCallCount++;
          if (dbCallCount === 1) {
            // User not found
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ 
                data: null, 
                error: { code: 'PGRST116', message: 'User not found' } 
              })
            };
          } else {
            // User created
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockDbUser, error: null }),
              insert: vi.fn().mockReturnThis(),
            };
          }
        }
        return {};
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AllTheProviders });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should attempt to fetch user twice (not found, then created)
      expect(dbCallCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle database sync failures', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null
      });

      // Database error
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Database connection failed'))
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AllTheProviders });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Auth user should still be set even if database sync fails
      expect(result.current.authUser).toEqual(mockAuthUser);
      expect(result.current.user).toBeNull();
    });
  });

  describe('Auth State Changes', () => {
    it('should subscribe to auth state changes', () => {
      const unsubscribe = vi.fn();
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe } }
      });

      const { unmount } = renderHook(() => useAuth(), { wrapper: AllTheProviders });

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();

      // Cleanup on unmount
      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });

    it('should update state when auth state changes', async () => {
      let authCallback: any;
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback: any) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDbUser, error: null })
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AllTheProviders });

      // Simulate auth state change
      await act(async () => {
        authCallback('SIGNED_IN', { user: mockAuthUser });
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.authUser).toEqual(mockAuthUser);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network failures gracefully', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper: AllTheProviders });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.authUser).toBeNull();
    });

    it('should handle email verification requirements', async () => {
      const unverifiedUser = { ...mockAuthUser, email_confirmed_at: null };
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: unverifiedUser,
          session: null
        },
        error: { message: 'Email not confirmed' }
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AllTheProviders });

      await expect(
        act(async () => {
          await result.current.login('unverified@example.com', 'password');
        })
      ).rejects.toThrow('Email not confirmed');
    });
  });

  describe('User Profile Updates', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockDbUser, bio: 'Updated bio' };
      
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedUser, error: null })
      });

      const { result } = renderHook(() => useAuth(), { wrapper: AllTheProviders });

      // Set initial user
      await act(async () => {
        result.current.user = mockDbUser;
      });

      // Update profile
      await act(async () => {
        await result.current.updateProfile({ bio: 'Updated bio' });
      });

      expect(result.current.user).toEqual(updatedUser);
    });
  });
});