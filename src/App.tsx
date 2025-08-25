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
import { SEOHead } from './components/SEOHead';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import UserSettingsPage from './pages/UserSettingsPage';
import { DebugAuthPage } from './pages/DebugAuthPage';
import ProfilePage from './pages/ProfilePage';


// Lazy load legal pages for better performance
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

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

// Component that needs to be inside Router context
const AppContent: React.FC = () => {
  // Debug navigation
  console.log('🌐 App.tsx: Rendering routes for path:', window.location.pathname);

  return (
    <>
      <NavigationDebugger />
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <SEOHead />
        <ResponsiveNavbar />
        <main className="flex-grow">
          <Routes>
                    <Route path="/" element={<ResponsiveLandingPage />} />
                    <Route path="/game/:id" element={<GamePage />} />
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
                          <UserSettingsPage />
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
