/**
 * Lazy-loaded route components for code splitting
 * This reduces initial bundle size and improves performance
 *
 * Uses lazyWithRetry to handle chunk loading failures gracefully
 */

import { lazyWithRetry } from './utils/lazyWithRetry';

// Lazy load all page components for code splitting
// Each route will be loaded as a separate chunk only when needed
// Automatically retries on failure (fixes cache mismatch after deployments)

// Main pages - loaded on demand
export const GamePage = lazyWithRetry(() =>
  import('./pages/GamePage').then(module => ({ default: module.GamePage }))
);

export const SearchResultsPage = lazyWithRetry(() =>
  import('./pages/SearchResultsPage').then(module => ({ default: module.SearchResultsPage }))
);

export const ExplorePage = lazyWithRetry(() =>
  import('./pages/ExplorePage').then(module => ({ default: module.ExplorePage }))
);

export const UserPage = lazyWithRetry(() =>
  import('./pages/UserPage').then(module => ({ default: module.UserPage }))
);

export const UserSearchPage = lazyWithRetry(() =>
  import('./pages/UserSearchPage').then(module => ({ default: module.UserSearchPage }))
);

export const ReviewFormPage = lazyWithRetry(() =>
  import('./pages/ReviewFormPage').then(module => ({ default: module.ReviewFormPage }))
);

export const ReviewPage = lazyWithRetry(() =>
  import('./pages/ReviewPage').then(module => ({ default: module.ReviewPage }))
);

// Auth pages
export const ResetPasswordPage = lazyWithRetry(() =>
  import('./components/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage }))
);

export const AuthCallbackPage = lazyWithRetry(() =>
  import('./pages/AuthCallbackPage').then(module => ({ default: module.AuthCallbackPage }))
);

export const DebugAuthPage = lazyWithRetry(() =>
  import('./pages/DebugAuthPage').then(module => ({ default: module.DebugAuthPage }))
);

// Legal and privacy pages - low priority
export const TermsPage = lazyWithRetry(() =>
  import('./pages/TermsPage')
);

export const PrivacyPage = lazyWithRetry(() =>
  import('./pages/PrivacyPage')
);

export const PrivacySettingsPage = lazyWithRetry(() =>
  import('./pages/PrivacySettingsPage').then(module => ({ default: module.PrivacySettingsPage }))
);

// Development/testing pages - lowest priority
export const EnhancedSearchTestPage = lazyWithRetry(() =>
  import('./pages/EnhancedSearchTestPage')
);

export const DiagnosticPage = lazyWithRetry(() =>
  import('./pages/DiagnosticPage')
);

// FAQ component
export const FAQ = lazyWithRetry(() =>
  import('./components/FAQ').then(module => ({ default: module.FAQ }))
);

// Search Performance Dashboard
export const SearchPerformanceDashboard = lazyWithRetry(() =>
  import('./components/SearchPerformanceDashboard').then(module => ({ default: module.SearchPerformanceDashboard }))
);

// Analytics Page
export const AnalyticsPage = lazyWithRetry(() =>
  import('./pages/AnalyticsPage').then(module => ({ default: module.AnalyticsPage }))
);

// Heavy modals that can be lazy loaded
export const GamesModal = lazyWithRetry(() =>
  import('./components/GamesModal').then(module => ({ default: module.GamesModal }))
);

export const ReviewsModal = lazyWithRetry(() =>
  import('./components/ReviewsModal').then(module => ({ default: module.ReviewsModal }))
);

export const FollowersFollowingModal = lazyWithRetry(() =>
  import('./components/FollowersFollowingModal').then(module => ({ default: module.FollowersFollowingModal }))
);