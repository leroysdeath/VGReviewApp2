import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { GamePage } from './pages/GamePage';
import { GameSearchPage } from './pages/GameSearchPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { UserPage } from './pages/UserPage';
import { UserSearchPage } from './pages/UserSearchPage';
import { LoginPage } from './pages/LoginPage';
import { ReviewFormPage } from './pages/ReviewFormPage';
import { ProfilePage } from './pages/ProfilePage';
import { DummyGamePage } from './pages/DummyGamePage';
import { DummyUserPage } from './pages/DummyUserPage';
import { MobilePreviewPage } from './pages/MobilePreviewPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/game/:id" element={<GamePage />} />
          <Route path="/search" element={<GameSearchPage />} />
          <Route path="/search-results" element={<SearchResultsPage />} />
          <Route path="/user/:id" element={<UserPage />} />
          <Route path="/users" element={<UserSearchPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/review/:gameId?" element={<ReviewFormPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/dummy-game" element={<DummyGamePage />} />
          <Route path="/dummy-user" element={<DummyUserPage />} />
          <Route path="/mobile-preview" element={<MobilePreviewPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;