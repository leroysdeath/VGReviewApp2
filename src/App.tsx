import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ResponsiveNavbar } from './components/ResponsiveNavbar';
import { ResponsiveLandingPage } from './components/ResponsiveLandingPage';
import { Footer } from './components/Footer';
import { AuthModalProvider } from './context/AuthModalContext';
import { AuthModal } from './components/auth/AuthModal';
import { AdminProvider } from './context/AdminContext';
// Import heavy page components directly (not lazy-loaded for now due to build issues)
import { GamePage } from './pages/GamePage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { ExplorePage } from './pages/ExplorePage';
import { UserPage } from './pages/UserPage';
import { UserSearchPage } from './pages/UserSearchPage';
import { ReviewFormPage } from './pages/ReviewFormPage';
import { ReviewPage } from './pages/ReviewPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { SEOHead } from './components/SEOHead';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DebugAuthPage } from './pages/DebugAuthPage';
import { FAQ } from './components/FAQ';
import { Navigate } from 'react-router-dom';
import { PrivacyConsentBanner } from './components/privacy/PrivacyConsentBanner';
import { ScrollToTop } from './components/ScrollToTop';


// Import non-critical pages directly to avoid build issues
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import EnhancedSearchTestPage from './pages/EnhancedSearchTestPage';
import DiagnosticPage from './pages/DiagnosticPage';
import { SearchPerformanceDashboard } from './components/SearchPerformanceDashboard';

// Navigation debugging component
const NavigationDebugger: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Navigation tracking removed for production
  }, [location, isAuthenticated]);
  
  return null;
};

// Profile redirect component
const ProfileRedirect: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-400">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  // We need to get the database user ID to redirect properly
  // For now, redirect to users page where they can find their profile
  return <Navigate to="/users" replace />;
};

// Component that needs to be inside Router context
const AppContent: React.FC = () => {
  // Debug navigation

  // Game preloading service disabled to eliminate console spam
  // Search functionality remains independent and unaffected  
  // Preloading can be enabled manually if needed via gamePreloadService.startPreloading()

  return (
    <>
      <NavigationDebugger />
      <ScrollToTop />
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <SEOHead />
        <ResponsiveNavbar />
        <main className="flex-grow">
          <Routes>
                    <Route path="/" element={<ResponsiveLandingPage />} />
                    <Route path="/game/:identifier" element={<GamePage />} />
                    <Route path="/search" element={<SearchResultsPage />} />
                    <Route path="/search-results" element={<SearchResultsPage />} />
                    <Route path="/explore" element={<ExplorePage />} />
                    <Route path="/user/:id" element={
                      <>
                        <UserPage />
                      </>
                    } />

                    <Route path="/users" element={<UserSearchPage />} />
                    <Route path="/debug-auth" element={<DebugAuthPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/auth/callback" element={<AuthCallbackPage />} />
                    <Route
                      path="/enhanced-search-test"
                      element={<EnhancedSearchTestPage />}
                    />
                    <Route
                      path="/admin/diagnostic"
                      element={<DiagnosticPage />}
                    />
                    <Route
                      path="/search-performance"
                      element={<SearchPerformanceDashboard />}
                    />
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
                          <ProfileRedirect />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/settings" 
                      element={
                        <ProtectedRoute showModal={true}>
                          <ProfileRedirect />
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
                      element={<FAQ />} 
                    />
                    <Route
                      path="/terms"
                      element={<TermsPage />}
                    />
                    <Route
                      path="/privacy"
                      element={<PrivacyPage />}
                    />
                    {/* Catch-all route for debugging */}
                    <Route path="*" element={
                      <>
                        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                          <div className="text-white text-center">
                            <h1 className="text-3xl font-bold mb-4">Page Not Found</h1>
                            <p>Path: {window.location.pathname}</p>
                          </div>
                        </div>
                      </>
                    } />
                  </Routes>
        </main>
        <Footer />
        <AuthModal />
        <PrivacyConsentBanner />
      </div>
    </>
  );
};

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthModalProvider>
          <AdminProvider>
            <Router>
              <AppContent />
            </Router>
          </AdminProvider>
        </AuthModalProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
