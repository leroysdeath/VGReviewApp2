import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ResponsiveNavbar } from './components/ResponsiveNavbar';
import { ResponsiveLandingPage } from './components/ResponsiveLandingPage';
import { Footer } from './components/Footer';
import { AuthModalProvider } from './context/AuthModalContext';
import { AuthModal } from './components/auth/AuthModal';
import { GamePage } from './pages/GamePage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { UserPage } from './pages/UserPage';
import { UserSearchPage } from './pages/UserSearchPage';
import { ReviewFormPage } from './pages/ReviewFormPage';
import { ReviewPage } from './pages/ReviewPage';
import ProfilePage from './pages/ProfilePage'; // Changed to default import
import { IGDBTestPage } from './pages/IGDBTestPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { SEOHead } from './components/SEOHead';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load legal pages for better performance
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

function App() {
  const { loading } = useAuth();

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
                    <Route 
                      path="/review/:gameId?" 
                      element={
                        <ProtectedRoute showModal={true}>
                          <ReviewFormPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route path="/review/:userId/:gameId" element={<ReviewPage />} />
                    <Route 
                      path="/profile" 
                      element={
                        <ProtectedRoute showModal={true}>
                          <ProfilePage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/settings" 
                      element={
                        <ProtectedRoute showModal={true}>
                          <ProfilePage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/contact" 
                      element={
                        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                          <div className="text-white text-center">
                            <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
                            <p>Contact page coming soon</p>
                          </div>
                        </div>
                      } 
                    />
                    <Route 
                      path="/faq" 
                      element={
                        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                          <div className="text-white text-center">
                            <h1 className="text-3xl font-bold mb-4">FAQ</h1>
                            <p>FAQ page coming soon</p>
                          </div>
                        </div>
                      } 
                    />
                    <Route 
                      path="/terms" 
                      element={
                        <Suspense fallback={
                          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                            <div className="text-white">Loading Terms of Service...</div>
                          </div>
                        }>
                          <TermsPage />
                        </Suspense>
                      } 
                    />
                    <Route 
                      path="/privacy" 
                      element={
                        <Suspense fallback={
                          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                            <div className="text-white">Loading Privacy Policy...</div>
                          </div>
                        }>
                          <PrivacyPage />
                        </Suspense>
                      } 
                    />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    {import.meta.env.DEV && <Route path="/igdb-test" element={<IGDBTestPage />} />}
                  </Routes>
                </main>
                <Footer />
                <AuthModal />
              </div>
            </Router>
        </AuthModalProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
