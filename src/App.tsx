import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ResponsiveNavbar } from './components/ResponsiveNavbar';
import { ResponsiveLandingPage } from './components/ResponsiveLandingPage';
import { GamePage } from './pages/GamePage';
import { GameSearchPage } from './pages/GameSearchPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { UserPage } from './pages/UserPage';
import { UserSearchPage } from './pages/UserSearchPage';
import { LoginPage } from './pages/LoginPage';
import { ReviewFormPage } from './pages/ReviewFormPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResponsiveDummyGamePage } from './pages/ResponsiveDummyGamePage';
import { ResponsiveDummyUserPage } from './pages/ResponsiveDummyUserPage';
import { ModernNavbarDemoPage } from './pages/ModernNavbarDemoPage';
import { GameHeroDemoPage } from './pages/GameHeroDemoPage';
import { GameCardDemoPage } from './pages/GameCardDemoPage';
import { StatsDemoPage } from './pages/StatsDemoPage';
import { IGDBTestPage } from './pages/IGDBTestPage';
import { ReviewDemoPage } from './pages/ReviewDemoPage';
import { AdvancedSearchDemo } from './pages/AdvancedSearchDemo';
import { SEOHead } from './components/SEOHead';

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <Router>
          <div className="min-h-screen bg-gray-900">
            <SEOHead />
            <ResponsiveNavbar />
            <Routes>
              <Route path="/" element={<ResponsiveLandingPage />} />
              <Route path="/game/:id" element={<GamePage />} />
              <Route path="/search" element={<GameSearchPage />} />
              <Route path="/search-results" element={<SearchResultsPage />} />
              <Route path="/user/:id" element={<UserPage />} />
              <Route path="/users" element={<UserSearchPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/review/:gameId?" element={<ReviewFormPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/dummy-game" element={<ResponsiveDummyGamePage />} />
              <Route path="/dummy-user" element={<ResponsiveDummyUserPage />} />
              <Route path="/modern-navbar" element={<ModernNavbarDemoPage />} />
              <Route path="/hero-demo" element={<GameHeroDemoPage />} />
              <Route path="/game-cards" element={<GameCardDemoPage />} />
              <Route path="/stats-demo" element={<StatsDemoPage />} />
              <Route path="/review-cards" element={<ReviewDemoPage />} />
              <Route path="/advanced-search" element={<AdvancedSearchDemo />} />
              {import.meta.env.DEV && <Route path="/igdb-test" element={<IGDBTestPage />} />}
            </Routes>
          </div>
        </Router>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;