import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ResponsiveNavbar } from './components/ResponsiveNavbar';
import { ResponsiveLandingPage } from './components/ResponsiveLandingPage';
import { ReviewProvider } from './context/ReviewContext';
import { AuthModalProvider } from './context/AuthModalContext'; // Add this import
import { AuthModal } from './components/auth/AuthModal'; // Add this import
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
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthModalProvider> {/* Wrap with AuthModalProvider */}
          <ReviewProvider currentUserId={user?.id ? parseInt(user.id) : 1}>
            <Router>
              <div className="min-h-screen bg-gray-900">
                <SEOHead />
                <ResponsiveNavbar />
                <Routes>
                  <Route path="/" element={<ResponsiveLandingPage />} />
                  <Route path="/game/:id" element={<GamePage />} />

                  {/* UPDATED: Both search routes now point to SearchResultsPage */}
                  <Route path="/search" element={<SearchResultsPage />} />
                  <Route path="/search-results" element={<SearchResultsPage />} />

                  {/* Keep your other existing routes */}
                  <Route path="/user/:id" element={<UserPage />} />
                  <Route path="/users" element={<UserSearchPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/review/:gameId?" element={<ReviewFormPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  {import.meta.env.DEV && <Route path="/igdb-test" element={<IGDBTestPage />} />}
                </Routes>
                
                {/* Add the AuthModal component */}
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
