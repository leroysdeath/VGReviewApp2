import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;