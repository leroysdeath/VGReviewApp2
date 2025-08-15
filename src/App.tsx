import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ResponsiveNavbar } from './components/ResponsiveNavbar';
import { ResponsiveLandingPage } from './components/ResponsiveLandingPage';
import { Footer } from './components/Footer';
import { ReviewProvider } from './context/ReviewContext';
import { AuthModalProvider } from './context/AuthModalContext';
import { AuthModal } from './components/auth/AuthModal';
import { GamePage } from './pages/GamePage';
import { UnifiedSearchPage } from './pages/UnifiedSearchPage';
import { UserPage } from './pages/UserPage';
import { ReviewFormPage } from './pages/ReviewFormPage';
import { ReviewPage } from './pages/ReviewPage';
import ProfilePage from './pages/ProfilePage'; // Changed to default import
import { IGDBTestPage } from './pages/IGDBTestPage';
import { SEOHead } from './components/SEOHead';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load legal pages for better performance
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

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
          <Router>
            <div className="min-h-screen bg-gray-900 flex flex-col">
              <SEOHead />
              <ResponsiveNavbar />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<ResponsiveLandingPage />} />
                  <Route path="/game/:id" element={
                    <ReviewProvider currentUserId={user?.id ? parseInt(user.id) : 1}>
                      <GamePage />
                    </ReviewProvider>
                  } />
                    <Route path="/search" element={<UnifiedSearchPage />} />
                    <Route path="/search-results" element={<UnifiedSearchPage />} />
                    <Route path="/user/:id" element={<UserPage />} />
                    <Route path="/users" element={<UnifiedSearchPage />} />
                    <Route 
                      path="/review/:gameId?" 
                      element={
                        <ProtectedRoute showModal={true}>
                          <ReviewProvider currentUserId={user?.id ? parseInt(user.id) : 1}>
                            <ReviewFormPage />
                          </ReviewProvider>
                        </ProtectedRoute>
                      } 
                    />
                    <Route path="/review/:userId/:gameId" element={
                      <ReviewProvider currentUserId={user?.id ? parseInt(user.id) : 1}>
                        <ReviewPage />
                      </ReviewProvider>
                    } />
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
                      element={<Navigate to="/profile" replace />}
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
