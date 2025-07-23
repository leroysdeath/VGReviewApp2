import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import { LoginPage } from './pages/LoginPage';
import { ReviewFormPage } from './pages/ReviewFormPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { IGDBTestPage } from './pages/IGDBTestPage';
import { SEOHead } from './components/SEOHead';

function App() {
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
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                
                {/* Auth routes */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* Review routes */}
                <Route path="/review/:gameId?" element={<ReviewFormPage />} />
                
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
