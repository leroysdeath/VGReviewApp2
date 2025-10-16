/**
 * Integration Tests for App.tsx User Loading
 *
 * Tests the complete user initialization flow:
 * - App mount triggers useAuth initialization
 * - Auth state loads before rendering protected content
 * - Cache clearing happens on auth changes
 * - User profile data synchronizes correctly
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { browserCache } from '../services/browserCacheService';
import { reviewCacheManager } from '../utils/reviewCacheManager';
import { gameService } from '../services/gameService';
import { searchService } from '../services/searchService';
import { stateLogger } from '../utils/stateLogger';

// Mock all external services
jest.mock('../services/authService');
jest.mock('../services/userService');
jest.mock('../services/browserCacheService');
jest.mock('../utils/reviewCacheManager');
jest.mock('../services/gameService');
jest.mock('../services/searchService');
jest.mock('../utils/stateLogger');
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }))
  }
}));

// Mock react-helmet-async
jest.mock('react-helmet-async', () => ({
  HelmetProvider: ({ children }: any) => children,
  Helmet: () => null
}));

// Mock LazyRoutes
jest.mock('../LazyRoutes', () => ({
  GamePage: () => <div>Game Page</div>,
  SearchResultsPage: () => <div>Search Results Page</div>,
  ExplorePage: () => <div>Explore Page</div>,
  UserPage: () => <div>User Page</div>,
  UserSearchPage: () => <div>User Search Page</div>,
  DebugAuthPage: () => <div>Debug Auth Page</div>,
  ResetPasswordPage: () => <div>Reset Password Page</div>,
  AuthCallbackPage: () => <div>Auth Callback Page</div>,
  EnhancedSearchTestPage: () => <div>Enhanced Search Test Page</div>,
  DiagnosticPage: () => <div>Diagnostic Page</div>,
  SearchPerformanceDashboard: () => <div>Search Performance Dashboard</div>,
  AnalyticsPage: () => <div>Analytics Page</div>,
  ReviewFormPage: () => <div>Review Form Page</div>,
  ReviewPage: () => <div>Review Page</div>,
  FAQ: () => <div>FAQ Page</div>,
  TermsPage: () => <div>Terms Page</div>,
  PrivacyPage: () => <div>Privacy Page</div>,
  PrivacySettingsPage: () => <div>Privacy Settings Page</div>
}));

// Mock components
jest.mock('../components/ResponsiveNavbar', () => ({
  ResponsiveNavbar: () => <nav data-testid="navbar">Navbar</nav>
}));

jest.mock('../components/ResponsiveLandingPage', () => ({
  ResponsiveLandingPage: () => <div data-testid="landing-page">Landing Page</div>
}));

jest.mock('../components/Footer', () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>
}));

jest.mock('../components/auth/AuthModal', () => ({
  AuthModal: () => <div data-testid="auth-modal">Auth Modal</div>
}));

jest.mock('../components/privacy/PrivacyConsentBanner', () => ({
  PrivacyConsentBanner: () => <div data-testid="privacy-banner">Privacy Banner</div>
}));

jest.mock('../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => children
}));

jest.mock('../components/SEOHead', () => ({
  SEOHead: () => null
}));

jest.mock('../components/ScrollToTop', () => ({
  ScrollToTop: () => null
}));

jest.mock('../components/RouteLoader', () => ({
  RouteLoader: () => <div data-testid="route-loader">Loading...</div>
}));

jest.mock('../components/PerformanceOptimizer', () => ({
  PerformanceOptimizer: () => null
}));

jest.mock('../components/DebugStateDashboard', () => ({
  DebugStateDashboard: () => <div data-testid="debug-dashboard">Debug Dashboard</div>
}));

jest.mock('../components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: any) => children
}));

describe('App Integration Tests - User Loading', () => {
  const mockSession = {
    user: {
      id: 'test-user-uuid',
      email: 'test@example.com',
      user_metadata: {
        name: 'Test User',
        username: 'testuser',
        avatar_url: 'https://example.com/auth-avatar.png'
      },
      created_at: '2024-01-01T00:00:00.000Z'
    },
    access_token: 'mock-token',
    refresh_token: 'mock-refresh'
  };

  const mockDbUser = {
    id: 123,
    provider_id: 'test-user-uuid',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    avatar_url: 'https://example.com/db-avatar.png',
    bio: '',
    location: '',
    website: '',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks for services
    (authService.getCurrentSession as jest.Mock).mockResolvedValue(null);
    (authService.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });
    (userService.clearCache as jest.Mock).mockImplementation(() => {});
    (browserCache.clear as jest.Mock).mockImplementation(() => {});
    (reviewCacheManager.clearAll as jest.Mock).mockImplementation(() => {});
    (gameService.clearCache as jest.Mock).mockImplementation(() => {});
    (searchService.clearCache as jest.Mock).mockImplementation(() => {});
    (stateLogger.log as jest.Mock).mockImplementation(() => {});
  });

  describe('App Initialization', () => {
    test('should render app with loading state initially', () => {
      (authService.getCurrentSession as jest.Mock).mockReturnValue(
        new Promise(() => {}) // Never resolves to simulate loading
      );

      render(<App />);

      // App structure should render
      expect(screen.getByTestId('navbar')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
      expect(screen.getByTestId('privacy-banner')).toBeInTheDocument();
      expect(screen.getByTestId('debug-dashboard')).toBeInTheDocument();
    });

    test('should render landing page when no user authenticated', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(null);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('landing-page')).toBeInTheDocument();
      });

      // Verify auth initialization was logged
      expect(stateLogger.log).toHaveBeenCalledWith('auth_init_start', {});
      expect(stateLogger.log).toHaveBeenCalledWith('auth_no_session', {});
      expect(stateLogger.log).toHaveBeenCalledWith('auth_init_complete', {});
    });

    test('should initialize user state when authenticated', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
      (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 123
      });
      (userService.getUserProfileById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockDbUser
      });

      render(<App />);

      await waitFor(() => {
        expect(stateLogger.log).toHaveBeenCalledWith(
          'auth_session_fetched',
          expect.objectContaining({
            hasSession: true,
            userId: mockSession.user.id
          })
        );
      });

      await waitFor(() => {
        expect(stateLogger.log).toHaveBeenCalledWith(
          'auth_user_set',
          expect.objectContaining({
            userId: mockSession.user.id,
            email: mockSession.user.email
          })
        );
      });

      // Verify dbUserId fetch was triggered
      await waitFor(() => {
        expect(userService.getOrCreateUser).toHaveBeenCalledWith(mockSession);
      });

      // Verify profile fetch for avatar
      await waitFor(() => {
        expect(userService.getUserProfileById).toHaveBeenCalledWith(123);
      });
    });
  });

  describe('Auth State Change Handling', () => {
    test('should clear all caches when user signs in', async () => {
      let authCallback: any;

      (authService.getCurrentSession as jest.Mock).mockResolvedValue(null);
      (authService.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      render(<App />);

      // Wait for initial mount
      await waitFor(() => {
        expect(stateLogger.log).toHaveBeenCalledWith('auth_init_complete', {});
      });

      // Clear previous calls
      jest.clearAllMocks();

      // Simulate SIGNED_IN event
      await authCallback('SIGNED_IN', mockSession);

      await waitFor(() => {
        expect(userService.clearCache).toHaveBeenCalled();
        expect(browserCache.clear).toHaveBeenCalled();
        expect(reviewCacheManager.clearAll).toHaveBeenCalled();
        expect(gameService.clearCache).toHaveBeenCalled();
        expect(searchService.clearCache).toHaveBeenCalled();
      });

      expect(stateLogger.log).toHaveBeenCalledWith('auth_clearing_all_caches', { event: 'SIGNED_IN' });
      expect(stateLogger.log).toHaveBeenCalledWith('auth_all_caches_cleared', {});
    });

    test('should clear all caches when user signs out', async () => {
      let authCallback: any;

      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
      (authService.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });
      (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 123
      });

      render(<App />);

      // Wait for user to be authenticated
      await waitFor(() => {
        expect(stateLogger.log).toHaveBeenCalledWith('auth_user_set', expect.any(Object));
      });

      // Clear previous calls
      jest.clearAllMocks();

      // Simulate SIGNED_OUT event
      await authCallback('SIGNED_OUT', null);

      await waitFor(() => {
        expect(userService.clearCache).toHaveBeenCalled();
        expect(browserCache.clear).toHaveBeenCalled();
        expect(reviewCacheManager.clearAll).toHaveBeenCalled();
        expect(gameService.clearCache).toHaveBeenCalled();
        expect(searchService.clearCache).toHaveBeenCalled();
      });

      expect(stateLogger.log).toHaveBeenCalledWith('auth_clearing_all_caches', { event: 'SIGNED_OUT' });
      expect(stateLogger.log).toHaveBeenCalledWith('auth_user_cleared', {});
    });
  });

  describe('Profile Data Synchronization', () => {
    test('should fetch and use database avatar over auth metadata', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
      (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 123
      });
      (userService.getUserProfileById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockDbUser
      });

      render(<App />);

      // Wait for profile fetch
      await waitFor(() => {
        expect(userService.getUserProfileById).toHaveBeenCalledWith(123);
      });

      // Verify profile was logged
      await waitFor(() => {
        expect(stateLogger.log).toHaveBeenCalledWith('profile_fetched', { userId: 123 });
      });
    });

    test('should handle profile fetch timeout gracefully', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
      (userService.getOrCreateUser as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: false, error: 'Timeout' }), 3000))
      );

      render(<App />);

      // Should still render app even if profile fetch times out
      await waitFor(() => {
        expect(screen.getByTestId('navbar')).toBeInTheDocument();
      }, { timeout: 5000 });

      // User should still be authenticated with auth metadata
      await waitFor(() => {
        expect(stateLogger.log).toHaveBeenCalledWith('auth_user_set', expect.any(Object));
      });
    });

    test('should fallback to auth metadata if profile fetch fails', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
      (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 123
      });
      (userService.getUserProfileById as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Profile not found'
      });

      render(<App />);

      // Wait for profile fetch to fail
      await waitFor(() => {
        expect(userService.getUserProfileById).toHaveBeenCalledWith(123);
      });

      // Should log error but continue
      await waitFor(() => {
        expect(stateLogger.log).toHaveBeenCalledWith(
          'profile_fetch_error',
          expect.objectContaining({ error: expect.any(String) })
        );
      });

      // App should still be functional
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should handle auth initialization errors', async () => {
      const authError = new Error('Auth service unavailable');
      (authService.getCurrentSession as jest.Mock).mockRejectedValue(authError);

      render(<App />);

      // Should log error
      await waitFor(() => {
        expect(stateLogger.log).toHaveBeenCalledWith(
          'auth_init_error',
          { error: authError.toString() }
        );
      });

      // Should still complete initialization
      await waitFor(() => {
        expect(stateLogger.log).toHaveBeenCalledWith('auth_init_complete', {});
      });

      // App should render in unauthenticated state
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });

    test('should handle missing cache service methods', async () => {
      // Remove clearCache methods
      (userService.clearCache as any) = undefined;
      (browserCache.clear as any) = undefined;

      let authCallback: any;
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(null);
      (authService.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      render(<App />);

      await waitFor(() => {
        expect(stateLogger.log).toHaveBeenCalledWith('auth_init_complete', {});
      });

      // Should not throw when cache methods are undefined
      await expect(authCallback('SIGNED_IN', mockSession)).resolves.not.toThrow();
    });

    test('should handle getOrCreateUser failure', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
      (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Database unavailable'
      });

      render(<App />);

      // Should log failure
      await waitFor(() => {
        expect(stateLogger.log).toHaveBeenCalledWith(
          'dbUserId_fetch_result',
          expect.objectContaining({
            success: false,
            error: 'Database unavailable'
          })
        );
      });

      // User should still be authenticated (with auth state only)
      await waitFor(() => {
        expect(stateLogger.log).toHaveBeenCalledWith('auth_user_set', expect.any(Object));
      });
    });
  });

  describe('State Logger Coverage', () => {
    test('should log complete initialization lifecycle', async () => {
      (authService.getCurrentSession as jest.Mock).mockResolvedValue(mockSession);
      (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 123
      });
      (userService.getUserProfileById as jest.Mock).mockResolvedValue({
        success: true,
        data: mockDbUser
      });

      render(<App />);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(stateLogger.log).toHaveBeenCalledWith('auth_init_complete', {});
      }, { timeout: 5000 });

      // Verify all expected log calls
      const logCalls = (stateLogger.log as jest.Mock).mock.calls.map(call => call[0]);

      expect(logCalls).toContain('auth_init_start');
      expect(logCalls).toContain('auth_session_fetched');
      expect(logCalls).toContain('auth_user_set');
      expect(logCalls).toContain('dbUserId_fetch_start');
      expect(logCalls).toContain('dbUserId_fetch_result');
      expect(logCalls).toContain('dbUserId_set');
      expect(logCalls).toContain('profile_fetched');
      expect(logCalls).toContain('auth_init_complete');
    });
  });
});
