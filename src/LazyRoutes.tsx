/**
 * Lazy-loaded route components for code splitting
 * This reduces initial bundle size and improves performance
 */

import { lazy } from 'react';

// Lazy load all page components for code splitting
// Each route will be loaded as a separate chunk only when needed

// Main pages - loaded on demand
export const GamePage = lazy(() =>
  import('./pages/GamePage').then(module => ({ default: module.GamePage }))
);

export const SearchResultsPage = lazy(() =>
  import('./pages/SearchResultsPage').then(module => ({ default: module.SearchResultsPage }))
);

export const ExplorePage = lazy(() =>
  import('./pages/ExplorePage').then(module => ({ default: module.ExplorePage }))
);

export const UserPage = lazy(() =>
  import('./pages/UserPage').then(module => ({ default: module.UserPage }))
);

export const UserSearchPage = lazy(() =>
  import('./pages/UserSearchPage').then(module => ({ default: module.UserSearchPage }))
);

export const ReviewFormPage = lazy(() =>
  import('./pages/ReviewFormPage').then(module => ({ default: module.ReviewFormPage }))
);

export const ReviewPage = lazy(() =>
  import('./pages/ReviewPage').then(module => ({ default: module.ReviewPage }))
);

// Auth pages
export const SignupPage = lazy(() =>
  import('./pages/SignupPage').then(module => ({ default: module.SignupPage }))
);

export const ResetPasswordPage = lazy(() =>
  import('./components/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage }))
);

export const AuthCallbackPage = lazy(() =>
  import('./pages/AuthCallbackPage').then(module => ({ default: module.AuthCallbackPage }))
);

export const DebugAuthPage = lazy(() =>
  import('./pages/DebugAuthPage').then(module => ({ default: module.DebugAuthPage }))
);

// Legal and privacy pages - low priority
export const TermsPage = lazy(() =>
  import('./pages/TermsPage')
);

export const PrivacyPage = lazy(() =>
  import('./pages/PrivacyPage')
);

export const PrivacySettingsPage = lazy(() =>
  import('./pages/PrivacySettingsPage').then(module => ({ default: module.PrivacySettingsPage }))
);

// Development/testing pages - lowest priority
export const EnhancedSearchTestPage = lazy(() =>
  import('./pages/EnhancedSearchTestPage')
);

export const DiagnosticPage = lazy(() =>
  import('./pages/DiagnosticPage')
);

// Admin pages
export const AdminDashboard = lazy(() =>
  import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard }))
);

// FAQ component
export const FAQ = lazy(() =>
  import('./components/FAQ').then(module => ({ default: module.FAQ }))
);

// Search Performance Dashboard
export const SearchPerformanceDashboard = lazy(() =>
  import('./components/SearchPerformanceDashboard').then(module => ({ default: module.SearchPerformanceDashboard }))
);

// Analytics Page
export const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then(module => ({ default: module.AnalyticsPage }))
);

// Heavy modals that can be lazy loaded
export const GamesModal = lazy(() =>
  import('./components/GamesModal').then(module => ({ default: module.GamesModal }))
);

export const ReviewsModal = lazy(() =>
  import('./components/ReviewsModal').then(module => ({ default: module.ReviewsModal }))
);

export const FollowersFollowingModal = lazy(() =>
  import('./components/FollowersFollowingModal').then(module => ({ default: module.FollowersFollowingModal }))
);