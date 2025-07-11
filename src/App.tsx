import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ModernHeader } from './components/ModernHeader';
import { ResponsiveLandingPage } from './components/ResponsiveLandingPage';
import { GamePage } from './pages/GamePage';
import { GameSearchPage } from './pages/GameSearchPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { GameDiscoveryPage } from './pages/GameDiscoveryPage';
import { UserPage } from './pages/UserPage';
import { UserSearchPage } from './pages/UserSearchPage';
import { SocialFeaturesPage } from './pages/SocialFeaturesPage';
import { ActivityFeedPage } from './pages/ActivityFeedPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { NotificationSettingsPage } from './pages/NotificationSettingsPage';
import { LoginPage } from './pages/LoginPage';
import { GamificationPage } from './pages/GamificationPage';
import { ReviewFormPage } from './pages/ReviewFormPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResponsiveDummyGamePage } from './pages/ResponsiveDummyGamePage';
import { ResponsiveDummyUserPage } from './pages/ResponsiveDummyUserPage';
import { IGDBTestPage } from './pages/IGDBTestPage';
import { SEOHead } from './components/SEOHead';

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <Router>
          <div className="min-h-screen bg-gray-900">
            <SEOHead />
            <ModernHeader onAuthClick={() => console.log('Auth clicked')} />
            <div className="pt-16">
            <Routes>
              <Route path="/" element={<ResponsiveLandingPage />} />
              <Route path="/game/:id" element={<GamePage />} />
              <Route path="/search" element={<GameSearchPage />} />
              <Route path="/discover" element={<GameDiscoveryPage />} />
              <Route path="/search-results" element={<SearchResultsPage />} />
              <Route path="/user/:id" element={<UserPage />} />
              <Route path="/community" element={<SocialFeaturesPage />} />
              <Route path="/activity" element={<ActivityFeedPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
              <Route path="/achievements" element={<GamificationPage />} />
              <Route path="/users" element={<UserSearchPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/review/:gameId?" element={<ReviewFormPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/dummy-game" element={<ResponsiveDummyGamePage />} />
              <Route path="/dummy-user" element={<ResponsiveDummyUserPage />} />
              {import.meta.env.DEV && <Route path="/igdb-test" element={<IGDBTestPage />} />}
            </Routes>
            </div>
          </div>
        </Router>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;