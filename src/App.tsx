import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ResponsiveNavbar } from './components/ResponsiveNavbar';
import { ResponsiveLandingPage } from './components/ResponsiveLandingPage';
import { ReviewProvider } from './context/ReviewContext';
import { AuthModalProvider } from './context/AuthModalContext'; // NEW IMPORT
import { ProtectedRoute } from './components/ProtectedRoute';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { AuthCallbackPage } from './components/AuthCallbackPage';
import { GamePage } from './pages/GamePage';
import { GameSearchPage } from './pages/GameSearchPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { UserPage } from './pages/UserPage';
import { UserSearchPage } from './pages/UserSearchPage';
import { LoginPage } from './pages/LoginPage';
import { ReviewFormPage } from './pages/ReviewFormPage';
import { ProfilePage } from './pages/ProfilePage';
import { IGDBTestPage } from './pages/IGDBTestPage';
import { SEOHead } from './components/SEOHead';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user } = useAuth();

  return (
    <HelmetProvider>
      <ErrorBoundary>
        {/* Wrap the entire app with AuthModalProvider */}
        <AuthModalProvider>
          <ReviewProvider currentUserId={user?.id ? parseInt(user.id) : null}>
            <Router>
              <div className="min-h-screen bg-gray-900">
                <SEOHead />
                <ResponsiveNavbar />
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<ResponsiveLandingPage />} />
                  <Route path="/game/:id" element={<GamePage />} />
                  
                  {/* Search routes */}
                  <Route path="/search" element={<SearchResultsPage />} />
                  <Route path="/search-results" element={<SearchResultsPage />} />
                  
                  {/* Public user pages */}
                  <Route path="/user/:id" element={<UserPage />} />
                  <Route path="/users" element={<UserSearchPage />} />
                  
                  {/* Authentication Routes */}
                  <Route 
                    path="/login" 
                    element={
                      <ProtectedRoute requireAuth={false}>
                        <LoginPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Password Reset Route */}
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  
                  {/* Auth Callback Route for Social Login */}
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  
                  {/* Protected Routes - Require Authentication */}
                  <Route 
                    path="/review/:gameId?" 
                    element={
                      <ProtectedRoute>
                        <ReviewFormPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Development Routes */}
                  {import.meta.env.DEV && (
                    <Route 
                      path="/igdb-test" 
                      element={
                        <ProtectedRoute>
                          <IGDBTestPage />
                        </ProtectedRoute>
                      } 
                    />
                  )}
                </Routes>
              </div>
            </Router>
          </ReviewProvider>
        </AuthModalProvider>
        {/* End AuthModalProvider wrap */}
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
