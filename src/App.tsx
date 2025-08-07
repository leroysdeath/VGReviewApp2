import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ResponsiveNavbar } from './components/ResponsiveNavbar';
import { ResponsiveLandingPage } from './components/ResponsiveLandingPage';
import { Footer } from './components/Footer';
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
import { ReviewPage } from './pages/ReviewPage';
import ProfilePage from './pages/ProfilePage'; // Changed to default import
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
        <AuthModalProvider>
          <ReviewProvider currentUserId={user?.id ? parseInt(user.id) : 1}>
            <Router>
              <div className="min-h-screen bg-gray-900 flex flex-col">
                <SEOHead />
                <ResponsiveNavbar />
                <main className="flex-grow">
                  <Routes>
                    <Route path="/" element={<ResponsiveLandingPage />} />
                    <Route path="/game/:id" element={<GamePage />} />
                    <Route path="/search" element={<SearchResultsPage />} />
                    <Route path="/search-results" element={<SearchResultsPage />} />
                    <Route path="/user/:id" element={<UserPage />} />
                    <Route path="/users" element={<UserSearchPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/review/:gameId?" element={<ReviewFormPage />} />
                    <Route path="/review/:userId/:gameId" element={<ReviewPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    {import.meta.env.DEV && <Route path="/igdb-test" element={<IGDBTestPage />} />}
                  </Routes>
                </main>
                <Footer />
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
