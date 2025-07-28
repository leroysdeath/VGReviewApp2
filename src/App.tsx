import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ResponsiveNavbar } from './components/ResponsiveNavbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ResponsiveLandingPage } from './components/ResponsiveLandingPage';
import { ReviewProvider } from './context/ReviewContext';
import { AuthModalProvider } from './context/AuthModalContext';
import { AuthModal } from './components/auth/AuthModal';
import { GamePage } from './pages/GamePage';
import { GameSearchPage } from './pages/GameSearchPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { UserPage } from './pages/UserPage';
import { UserSearchPage } from './pages/UserSearchPage';
import { LoginPage } from './pages/LoginPage';
import { ReviewFormPage } from './pages/ReviewFormPage';
import ProfilePage from './pages/ProfilePage';
import { IGDBTestPage } from './pages/IGDBTestPage';
import { SEOHead } from './components/SEOHead';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading } = useAuth();
  const [initialLoad, setInitialLoad] = useState(true);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout - proceeding without auth');
        setInitialLoad(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, [loading]);

  // Update initial load state when auth finishes
  useEffect(() => {
    if (!loading) {
      setInitialLoad(false);
    }
  }, [loading]);

  // Only show loading screen during initial load
  if (initialLoad && loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthModalProvider>
          <ReviewProvider currentUserId={user?.id ? parseInt(user.id) : 1}>
            <Router>
              <div className="min-h-screen bg-gray-900">
                <SEOHead />
                <ResponsiveNavbar />
                <Routes>
                  <Route path="/" element={<ResponsiveLandingPage />} />
                  <Route path="/game/:id" element={<GamePage />} />
                  <Route path="/search" element={<SearchResultsPage />} />
                  <Route path="/search-results" element={<SearchResultsPage />} />
                  <Route path="/user/:id" element={<UserPage />} />
                  <Route path="/users" element={<UserSearchPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/review/:gameId?" element={<ReviewFormPage />} />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } />
                  {/* Settings route removed - now handled via modal */}
                  {import.meta.env.DEV && <Route path="/igdb-test" element={<IGDBTestPage />} />}
                </Routes>
                <AuthModal />
              </div>
            </Router>
          </ReviewProvider>
        </AuthModalProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
