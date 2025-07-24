// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ResponsiveNavbar } from './components/ResponsiveNavbar';
import { ResponsiveLandingPage } from './components/ResponsiveLandingPage';
import { ReviewProvider } from './context/ReviewContext';
import { GamePage } from './pages/GamePage';
import { GameSearchPage } from './pages/GameSearchPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { UserPage } from './pages/UserPage';
import { UserSearchPage } from './pages/UserSearchPage';
import { ReviewFormPage } from './pages/ReviewFormPage';
import { ProfilePage } from './pages/ProfilePage';
import { IGDBTestPage } from './pages/IGDBTestPage';
import { SEOHead } from './components/SEOHead';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <ReviewProvider currentUserId={1}> {/* Using a dummy user ID for demo purposes */}
          <Router>
            <div className="min-h-screen bg-gray-900">
              <SEOHead />
              <ResponsiveNavbar />
              <Routes>
                <Route path="/" element={<ResponsiveLandingPage />} />
                <Route path="/game/:id" element={<GamePage />} />
                
                {/* Search routes */}
                <Route path="/search" element={<SearchResultsPage />} />
                <Route path="/search-results" element={<SearchResultsPage />} />
                
                {/* User routes */}
                <Route path="/user/:id" element={<UserPage />} />
                <Route path="/users" element={<UserSearchPage />} />
                
                {/* Protected routes */}
                <Route path="/review/:gameId?" element={
                  isAuthenticated ? <ReviewFormPage /> : <Navigate to="/" state={{ requireAuth: true }} />
                } />
                <Route path="/profile" element={
                  isAuthenticated ? <ProfilePage /> : <Navigate to="/" state={{ requireAuth: true }} />
                } />
                
                {/* Redirect old login route to home with auth modal trigger */}
                <Route path="/login" element={<Navigate to="/" state={{ showAuth: true }} />} />
                
                {/* Development routes */}
                {import.meta.env.DEV && <Route path="/igdb-test" element={<IGDBTestPage />} />}
              </Routes>
            </div>
          </Router>
        </ReviewProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
