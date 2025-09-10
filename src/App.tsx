import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { SEOHead } from './components/SEOHead';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DebugAuthPage } from './pages/DebugAuthPage';
import { FAQ } from './components/FAQ';
import { Navigate } from 'react-router-dom';


// Lazy load legal pages for better performance
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const EnhancedSearchTestPage = lazy(() => import('./pages/EnhancedSearchTestPage'));

// Navigation debugging component
const NavigationDebugger: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    console.log('🧭 NavigationDebugger: Route changed', {
      pathname: location.pathname,
      search: location.search,
      isAuthenticated,
      timestamp: new Date().toISOString()
    });
    
    // Specifically track user page navigation
    if (location.pathname.startsWith('/user/')) {
      console.log('👤 NavigationDebugger: User page navigation detected', {
        path: location.pathname,
        userId: location.pathname.split('/')[2],
        isAuthenticated
      });
    }
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
  console.log('🌐 App.tsx: Rendering routes for path:', window.location.pathname);

  // Game preloading service disabled to eliminate console spam
  // Search functionality remains independent and unaffected  
  // Preloading can be enabled manually if needed via gamePreloadService.startPreloading()

  return (
    <>
      <NavigationDebugger />
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <SEOHead />
        <ResponsiveNavbar />
        <main className="flex-grow">
          <Routes>
                    <Route path="/" element={<ResponsiveLandingPage />} />
                    <Route path="/game/:identifier" element={<GamePage />} />
                    <Route path="/search" element={<SearchResultsPage />} />
                    <Route path="/search-results" element={<SearchResultsPage />} />
                    <Route path="/user/:id" element={
                      <>
                        {console.log('🚨 App.tsx: UserPage route matched for path:', window.location.pathname, 'useParams would be:', window.location.pathname.split('/')[2])}
                        <UserPage />
                      </>
                    } />
                    <Route path="/users" element={<UserSearchPage />} />
                    <Route path="/debug-auth" element={<DebugAuthPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/auth/callback" element={<AuthCallbackPage />} />
                    <Route 
                      path="/enhanced-search-test" 
                      element={
                        <Suspense fallback={
                          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                            <div className="text-white">Loading Enhanced Search Test...</div>
                          </div>
                        }>
                          <EnhancedSearchTestPage />
                        </Suspense>
                      } 
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
                    {/* Catch-all route for debugging */}
                    <Route path="*" element={
                      <>
                        {console.log('🔍 App.tsx: Catch-all route hit for path:', window.location.pathname)}
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
      </div>
    </>
  );
};

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthModalProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthModalProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
