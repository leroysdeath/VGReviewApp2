import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

// Mock external dependencies to avoid API calls
jest.mock('../services/authService');
jest.mock('../services/userService');
jest.mock('../services/reviewService');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockUserService = userService as jest.Mocked<typeof userService>;

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/test', search: '' })
}));

// Mock the auth modal context
const mockOpenModal = jest.fn();
jest.mock('../context/AuthModalContext', () => ({
  useAuthModal: () => ({
    openModal: mockOpenModal
  }),
  AuthModalProvider: ({ children }: { children: React.ReactNode }) => children
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenModal.mockClear();
    mockNavigate.mockClear();
    
    // Default mock implementations
    mockAuthService.getCurrentSession.mockResolvedValue(null);
    mockAuthService.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn()
        }
      }
    });
    mockUserService.getOrCreateDatabaseUser.mockResolvedValue({
      success: false,
      error: 'Mocked response'
    });
  });

  describe('Hook Interface', () => {
    test('should provide all expected methods and properties', () => {
      const { result } = renderHook(() => useAuth());

      // Core state properties should exist
      expect('user' in result.current).toBe(true);
      expect('session' in result.current).toBe(true);
      expect('dbUserId' in result.current).toBe(true);
      expect('isAuthenticated' in result.current).toBe(true);
      expect('loading' in result.current).toBe(true);
      expect('dbUserIdLoading' in result.current).toBe(true);

      // Core methods should be functions
      expect(typeof result.current.getCurrentUserId).toBe('function');
      expect(typeof result.current.refreshDbUserId).toBe('function');
      expect(typeof result.current.requireAuth).toBe('function');
      expect(typeof result.current.checkAuthGuard).toBe('function');
      expect(typeof result.current.hasPermission).toBe('function');
      expect(typeof result.current.isOwner).toBe('function');
      expect(typeof result.current.executeAction).toBe('function');
      expect(typeof result.current.guardAction).toBe('function');
      expect(typeof result.current.signIn).toBe('function');
      expect(typeof result.current.signUp).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.openAuthModal).toBe('function');
      expect(typeof result.current.requestAuth).toBe('function');
    });

    test('should initialize with null user state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.dbUserId).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Authentication Actions', () => {
    test('signIn should call authService.signIn with correct parameters', async () => {
      mockAuthService.signIn.mockResolvedValue({ user: { id: 'user-123' } as any });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockAuthService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    test('signUp should call authService.signUp with email, password, and username', async () => {
      mockAuthService.signUp.mockResolvedValue({ user: { id: 'user-123' } as any });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123', 'testuser');
      });

      expect(mockAuthService.signUp).toHaveBeenCalledWith('test@example.com', 'password123', 'testuser');
    });

    test('signOut should call authService.signOut', async () => {
      mockAuthService.signOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockAuthService.signOut).toHaveBeenCalled();
    });

    test('resetPassword should call authService.resetPassword', async () => {
      mockAuthService.resetPassword.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.resetPassword('test@example.com');
      });

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith('test@example.com', undefined);
    });

    test('updatePassword should call authService.updatePassword', async () => {
      mockAuthService.updatePassword.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.updatePassword('newpassword123');
      });

      expect(mockAuthService.updatePassword).toHaveBeenCalledWith('newpassword123');
    });

    test('signInWithProvider should call authService.signInWithProvider', async () => {
      mockAuthService.signInWithProvider.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signInWithProvider('google');
      });

      expect(mockAuthService.signInWithProvider).toHaveBeenCalledWith('google');
    });

    test('deleteAccount should call authService.deleteAccount', async () => {
      mockAuthService.deleteAccount.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.deleteAccount();
      });

      expect(mockAuthService.deleteAccount).toHaveBeenCalled();
    });
  });

  describe('Auth Modal Integration', () => {
    test('openAuthModal should call context openModal', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.openAuthModal('login');
      });

      expect(mockOpenModal).toHaveBeenCalledWith('login');
    });

    test('requestAuth should return false and open modal when not authenticated', () => {
      const { result } = renderHook(() => useAuth());

      // When user is null (not authenticated)
      const authResult = result.current.requestAuth('signup');
      
      expect(authResult).toBe(false);
      expect(mockOpenModal).toHaveBeenCalledWith('signup');
    });
  });

  describe('Permission Utilities', () => {
    test('hasPermission should return false when user is null', () => {
      const { result } = renderHook(() => useAuth());

      const hasPermission = result.current.hasPermission('some-resource');
      expect(hasPermission).toBe(false);
    });

    test('isOwner should return false when user or dbUserId is null', () => {
      const { result } = renderHook(() => useAuth());

      const isOwner = result.current.isOwner(123);
      expect(isOwner).toBe(false);
    });
  });

  describe('Protected Actions', () => {
    test('executeAction should return wrapper function', () => {
      const { result } = renderHook(() => useAuth());
      
      const mockAction = jest.fn();
      const wrappedAction = result.current.executeAction(mockAction);
      
      expect(typeof wrappedAction).toBe('function');
    });

    test('guardAction should return wrapper function', () => {
      const { result } = renderHook(() => useAuth());
      
      const mockAction = jest.fn();
      const guardedAction = result.current.guardAction(mockAction);
      
      expect(typeof guardedAction).toBe('function');
    });

    test('executeAction should return undefined and open modal when user is null', async () => {
      const { result } = renderHook(() => useAuth());
      
      const mockAction = jest.fn().mockResolvedValue('success');
      const wrappedAction = result.current.executeAction(mockAction);
      
      const actionResult = await wrappedAction();
      
      expect(actionResult).toBeUndefined();
      expect(mockAction).not.toHaveBeenCalled();
      expect(mockOpenModal).toHaveBeenCalledWith('login');
    });

    test('guardAction should return undefined and open modal when user is null', () => {
      const { result } = renderHook(() => useAuth());
      
      const mockAction = jest.fn().mockReturnValue('success');
      const guardedAction = result.current.guardAction(mockAction);
      
      const actionResult = guardedAction();
      
      expect(actionResult).toBeUndefined();
      expect(mockAction).not.toHaveBeenCalled();
      expect(mockOpenModal).toHaveBeenCalled();
    });
  });

  describe('Auth Guards', () => {
    test('checkAuthGuard should return false when loading is complete and user is null', async () => {
      const { result } = renderHook(() => useAuth());

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const isAuthorized = result.current.checkAuthGuard();
      expect(isAuthorized).toBe(false);
    });

    test('requireAuth should open modal when user is null', async () => {
      const { result } = renderHook(() => useAuth());
      
      const mockAction = jest.fn();

      await act(async () => {
        await result.current.requireAuth(mockAction, { modalMode: 'signup' });
      });

      expect(mockAction).not.toHaveBeenCalled();
      expect(mockOpenModal).toHaveBeenCalledWith('signup');
    });

    test('requireAuth should handle redirect option', async () => {
      const { result } = renderHook(() => useAuth());
      
      const mockAction = jest.fn();

      await act(async () => {
        await result.current.requireAuth(mockAction, { 
          showModal: false, 
          redirectTo: '/login' 
        });
      });

      expect(mockAction).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { from: '/test' }
      });
    });
  });

  describe('User ID Management', () => {
    test('getCurrentUserId should return null when user is not authenticated', async () => {
      const { result } = renderHook(() => useAuth());

      const userId = await result.current.getCurrentUserId();
      expect(userId).toBeNull();
    });

    test('refreshDbUserId should not error when called without session', async () => {
      const { result } = renderHook(() => useAuth());

      await expect(async () => {
        await result.current.refreshDbUserId();
      }).not.toThrow();
    });
  });

  describe('Session Management', () => {
    test('should call getCurrentSession on initialization', async () => {
      renderHook(() => useAuth());

      await waitFor(() => {
        expect(mockAuthService.getCurrentSession).toHaveBeenCalled();
      });
    });

    test('should set up auth state change listener', () => {
      renderHook(() => useAuth());

      expect(mockAuthService.onAuthStateChange).toHaveBeenCalled();
    });

    test('should handle session initialization with successful response', async () => {
      const mockSession = {
        user: {
          id: 'auth-user-123',
          email: 'test@example.com',
          user_metadata: {
            name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg'
          },
          created_at: '2024-01-01T00:00:00Z'
        }
      };

      mockAuthService.getCurrentSession.mockResolvedValue(mockSession as any);
      mockUserService.getOrCreateDatabaseUser.mockResolvedValue({
        success: true,
        userId: 456
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).not.toBeNull();
      expect(result.current.isAuthenticated).toBe(true);
    });

    test('should handle session initialization errors gracefully', async () => {
      mockAuthService.getCurrentSession.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle auth service errors gracefully', async () => {
      mockAuthService.signIn.mockRejectedValue(new Error('Auth error'));

      const { result } = renderHook(() => useAuth());

      await expect(async () => {
        await result.current.signIn('test@example.com', 'password');
      }).rejects.toThrow('Auth error');
    });

    test('should handle user service timeout gracefully', async () => {
      mockUserService.getOrCreateDatabaseUser.mockImplementation(
        () => new Promise((resolve) => 
          setTimeout(() => resolve({ success: false, error: 'timeout' }), 6000)
        )
      );

      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { name: 'Test User' },
          created_at: '2024-01-01T00:00:00Z'
        }
      };

      mockAuthService.getCurrentSession.mockResolvedValue(mockSession as any);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 6000 });

      // Should have user from auth but no database user ID due to timeout
      expect(result.current.user).not.toBeNull();
      expect(result.current.dbUserId).toBeNull();
    });
  });
});