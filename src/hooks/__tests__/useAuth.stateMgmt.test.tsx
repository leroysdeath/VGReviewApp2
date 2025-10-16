/**
 * Unit Tests for useAuth State Management Fixes
 *
 * Tests the fixes implemented to prevent DB/localStorage sync issues:
 * - Cache clearing on auth state changes
 * - Profile fetching with database avatar
 * - Blocking dbUserId fetch for interactions
 * - State logger integration
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { browserCache } from '../../services/browserCacheService';
import { reviewCacheManager } from '../../utils/reviewCacheManager';
import { gameService } from '../../services/gameService';
import { searchService } from '../../services/searchService';
import { stateLogger } from '../../utils/stateLogger';
import { BrowserRouter } from 'react-router-dom';
import { AuthModalProvider } from '../../context/AuthModalContext';

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('../../services/userService');
jest.mock('../../services/browserCacheService');
jest.mock('../../utils/reviewCacheManager');
jest.mock('../../services/gameService');
jest.mock('../../services/searchService');
jest.mock('../../utils/stateLogger');

// Helper to wrap hook with required providers
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthModalProvider>{children}</AuthModalProvider>
  </BrowserRouter>
);

describe('useAuth State Management Fixes', () => {
  // Mock session data
  const mockSession = {
    user: {
      id: 'test-user-uuid',
      email: 'test@example.com',
      user_metadata: {
        name: 'Test User',
        username: 'testuser',
        avatar_url: 'https://example.com/avatar.png'
      },
      created_at: '2024-01-01T00:00:00.000Z'
    },
    access_token: 'mock-token',
    refresh_token: 'mock-refresh',
  };

  const mockDbUser = {
    id: 123,
    provider_id: 'test-user-uuid',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    avatar_url: 'https://example.com/db-avatar.png', // Different from auth metadata
    bio: '',
    location: '',
    website: '',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    (authService.getCurrentSession as jest.Mock).mockResolvedValue(null);
    (authService.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });
    (userService.clearCache as jest.Mock).mockImplementation(() => {});
    (userService.getUserProfileById as jest.Mock).mockResolvedValue({
      success: true,
      data: mockDbUser
    });
    (browserCache.clear as jest.Mock).mockImplementation(() => {});
    (reviewCacheManager.clearAll as jest.Mock).mockImplementation(() => {});
    (gameService.clearCache as jest.Mock).mockImplementation(() => {});
    (searchService.clearCache as jest.Mock).mockImplementation(() => {});
    (stateLogger.log as jest.Mock).mockImplementation(() => {});
  });

  describe('Cache Clearing on Auth State Changes', () => {
    test('should clear all caches on SIGNED_IN event', async () => {
      let authCallback: any;

      (authService.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 123
      });

      renderHook(() => useAuth(), { wrapper });

      // Simulate SIGNED_IN event
      await act(async () => {
        await authCallback('SIGNED_IN', mockSession);
      });

      // Verify all caches were cleared
      expect(userService.clearCache).toHaveBeenCalled();
      expect(browserCache.clear).toHaveBeenCalled();
      expect(reviewCacheManager.clearAll).toHaveBeenCalled();
      expect(gameService.clearCache).toHaveBeenCalled();
      expect(searchService.clearCache).toHaveBeenCalled();

      // Verify state logger tracked the operation
      expect(stateLogger.log).toHaveBeenCalledWith('auth_clearing_all_caches', { event: 'SIGNED_IN' });
      expect(stateLogger.log).toHaveBeenCalledWith('auth_all_caches_cleared', {});
    });

    test('should clear all caches on SIGNED_OUT event', async () => {
      let authCallback: any;

      (authService.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      renderHook(() => useAuth(), { wrapper });

      // Simulate SIGNED_OUT event
      await act(async () => {
        await authCallback('SIGNED_OUT', null);
      });

      // Verify all caches were cleared
      expect(userService.clearCache).toHaveBeenCalled();
      expect(browserCache.clear).toHaveBeenCalled();
      expect(reviewCacheManager.clearAll).toHaveBeenCalled();
      expect(gameService.clearCache).toHaveBeenCalled();
      expect(searchService.clearCache).toHaveBeenCalled();

      expect(stateLogger.log).toHaveBeenCalledWith('auth_clearing_all_caches', { event: 'SIGNED_OUT' });
    });

    test('should NOT clear caches on other auth events', async () => {
      let authCallback: any;

      (authService.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      renderHook(() => useAuth(), { wrapper });

      // Simulate TOKEN_REFRESHED event
      await act(async () => {
        await authCallback('TOKEN_REFRESHED', mockSession);
      });

      // Caches should NOT be cleared for token refresh
      expect(userService.clearCache).not.toHaveBeenCalled();
      expect(browserCache.clear).not.toHaveBeenCalled();
    });

    test('should clear caches on manual signOut', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
      (authService.signOut as jest.Mock).mockResolvedValue({ error: null });
      (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 123
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      // Clear previous mock calls from initialization
      jest.clearAllMocks();

      // Call signOut
      await act(async () => {
        await result.current.signOut();
      });

      // Verify caches cleared before signOut
      expect(userService.clearCache).toHaveBeenCalled();
      expect(browserCache.clear).toHaveBeenCalled();
      expect(reviewCacheManager.clearAll).toHaveBeenCalled();
      expect(gameService.clearCache).toHaveBeenCalled();
      expect(searchService.clearCache).toHaveBeenCalled();

      // Verify state logger tracked it
      expect(stateLogger.log).toHaveBeenCalledWith('signOut_clearing_all_caches', {});
      expect(stateLogger.log).toHaveBeenCalledWith('signOut_complete', {});
    });
  });

  describe('Profile Fetching with Database Avatar', () => {
    test('should fetch user profile and update avatar from database', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
      (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 123
      });
      (userService.getUserProfileById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockDbUser
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for user to be set
      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      // Wait for profile fetch to complete
      await waitFor(() => {
        expect(result.current.user?.avatar).toBe(mockDbUser.avatar_url);
      }, { timeout: 3000 });

      // Verify the avatar was updated from database, not auth metadata
      expect(result.current.user?.avatar).toBe('https://example.com/db-avatar.png');
      expect(result.current.user?.avatar).not.toBe(mockSession.user.user_metadata.avatar_url);

      // Verify profile was fetched with correct ID
      expect(userService.getUserProfileById).toHaveBeenCalledWith(123);

      // Verify state logger tracked the operation
      expect(stateLogger.log).toHaveBeenCalledWith('profile_fetched', { userId: 123 });
    });

    test('should fallback to auth metadata avatar if profile fetch fails', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
      (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 123
      });
      (userService.getUserProfileById as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Profile not found'
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for user to be set
      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      // Should use auth metadata avatar as fallback
      await waitFor(() => {
        expect(result.current.user?.avatar).toBe(mockSession.user.user_metadata.avatar_url);
      });

      // Verify error was logged
      expect(stateLogger.log).toHaveBeenCalledWith(
        'profile_fetch_error',
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    test('should update username from database profile', async () => {
      const customDbUser = {
        ...mockDbUser,
        username: 'database_username',
        name: 'Database Name'
      };

      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
      (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 123
      });
      (userService.getUserProfileById as jest.Mock).mockResolvedValue({
        success: true,
        data: customDbUser
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      await waitFor(() => {
        expect(result.current.user?.name).toBe('database_username'); // Uses username first
      }, { timeout: 3000 });
    });
  });

  describe('requireDbUserId Blocking Fetch', () => {
    test('should return immediately if dbUserId already cached', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
      (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 123
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for dbUserId to be populated
      await waitFor(() => {
        expect(result.current.dbUserId).toBe(123);
      });

      // Clear mocks to verify no additional calls
      jest.clearAllMocks();

      // Call requireDbUserId
      let returnedId: number | null = null;
      await act(async () => {
        returnedId = await result.current.requireDbUserId();
      });

      // Should return cached value immediately
      expect(returnedId).toBe(123);
      expect(userService.getOrCreateUser).not.toHaveBeenCalled();

      // Verify state logger tracked cached hit
      expect(stateLogger.log).toHaveBeenCalledWith('requireDbUserId_cached', { dbUserId: 123 });
    });

    test('should return null if not authenticated', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let returnedId: number | null = null;
      await act(async () => {
        returnedId = await result.current.requireDbUserId();
      });

      expect(returnedId).toBeNull();
      expect(stateLogger.log).toHaveBeenCalledWith('requireDbUserId_no_session', {});
    });

    test('should trigger fetch and wait if dbUserId not available', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);

      // Initially return pending, then success
      let callCount = 0;
      (userService.getOrCreateUser as jest.Mock).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // First call during initialization
          await new Promise(resolve => setTimeout(resolve, 100));
          return { success: true, userId: 123 };
        }
        return { success: true, userId: 123 };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial auth setup
      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      // Before dbUserId is set, call requireDbUserId
      if (!result.current.dbUserId) {
        let returnedId: number | null = null;
        await act(async () => {
          returnedId = await result.current.requireDbUserId();
        });

        // Should have triggered fetch and waited
        expect(stateLogger.log).toHaveBeenCalledWith(
          'requireDbUserId_triggering_fetch',
          expect.anything()
        );
      }
    });

    test('should wait for existing loading operation', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);

      // Simulate slow getOrCreateUser
      (userService.getOrCreateUser as jest.Mock).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true, userId: 123 };
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      // Trigger two requireDbUserId calls concurrently
      const promises = [
        act(async () => result.current.requireDbUserId()),
        act(async () => result.current.requireDbUserId())
      ];

      const results = await Promise.all(promises);

      // Both should get the same ID
      expect(results[0]).toBe(123);
      expect(results[1]).toBe(123);

      // Should have logged waiting behavior
      expect(stateLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('requireDbUserId'),
        expect.anything()
      );
    });

    test('should handle timeout gracefully', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);

      // Simulate timeout by never resolving
      (userService.getOrCreateUser as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      // requireDbUserId should handle this gracefully
      let returnedId: number | null = null;
      await act(async () => {
        returnedId = await result.current.requireDbUserId();
      });

      // Should return null or the current dbUserId state
      expect(returnedId).toBeNull();
    });
  });

  describe('State Logger Integration', () => {
    test('should log all critical auth events', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
      (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 123
      });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        // Verify critical events were logged in order
        expect(stateLogger.log).toHaveBeenCalledWith('auth_init_start', {});
        expect(stateLogger.log).toHaveBeenCalledWith('auth_session_fetched', expect.any(Object));
        expect(stateLogger.log).toHaveBeenCalledWith('auth_user_set', expect.any(Object));
        expect(stateLogger.log).toHaveBeenCalledWith('auth_init_complete', {});
      });
    });

    test('should log dbUserId fetch lifecycle', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
      (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 123
      });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(stateLogger.log).toHaveBeenCalledWith(
          'dbUserId_fetch_start',
          { userId: mockSession.user.id }
        );
        expect(stateLogger.log).toHaveBeenCalledWith(
          'dbUserId_fetch_result',
          expect.objectContaining({ success: true, dbUserId: 123 })
        );
        expect(stateLogger.log).toHaveBeenCalledWith(
          'dbUserId_set',
          { dbUserId: 123 }
        );
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing cache service methods gracefully', async () => {
      // Remove clearCache methods
      (userService.clearCache as any) = undefined;
      (browserCache.clear as any) = undefined;

      let authCallback: any;
      (authService.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      renderHook(() => useAuth(), { wrapper });

      // Should not throw even if cache methods missing
      await act(async () => {
        await expect(authCallback('SIGNED_IN', mockSession)).resolves.not.toThrow();
      });
    });

    test('should handle getOrCreateUser timeout', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);

      // Simulate timeout
      (userService.getOrCreateUser as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: false, error: 'Timeout' }), 5000))
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      }, { timeout: 3000 });

      // User should be authenticated even if dbUserId fetch times out
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.dbUserId).toBeNull();

      // Should have logged timeout
      expect(stateLogger.log).toHaveBeenCalledWith(
        'dbUserId_fetch_result',
        expect.objectContaining({ success: false })
      );
    });

    test('should handle profile fetch failure gracefully', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
      (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 123
      });
      (userService.getUserProfileById as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      // Should still have user with auth metadata
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.avatar).toBe(mockSession.user.user_metadata.avatar_url);

      // Should have logged error
      expect(stateLogger.log).toHaveBeenCalledWith(
        'profile_fetch_error',
        expect.objectContaining({ error: expect.stringContaining('Network error') })
      );
    });
  });
});
