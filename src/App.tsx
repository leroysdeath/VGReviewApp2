import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ResponsiveNavbar } from './components/ResponsiveNavbar';
import { ResponsiveLandingPage } from './components/ResponsiveLandingPage';
import { Footer } from './components/Footer';
import { AuthModalProvider } from './context/AuthModalContext';
import { AuthModal } from './components/auth/AuthModal';
import { AdminProvider } from './context/AdminContext';
import { SEOHead } from './components/SEOHead';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PrivacyConsentBanner } from './components/privacy/PrivacyConsentBanner';
import { ScrollToTop } from './components/ScrollToTop';
import { RouteLoader } from './components/RouteLoader';
import { PerformanceOptimizer } from './components/PerformanceOptimizer';

// Lazy load all route components for better performance
import * as LazyRoutes from './LazyRoutes';

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
      <PerformanceOptimizer />
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <SEOHead />
        <ResponsiveNavbar />
        <main className="flex-grow">
          <Routes>
                    <Route path="/" element={<ResponsiveLandingPage />} />
                    <Route path="/game/:identifier" element={
                      <Suspense fallback={<RouteLoader />}>
                        <LazyRoutes.GamePage />
                      </Suspense>
                    } />
                    <Route path="/search" element={
                      <Suspense fallback={<RouteLoader />}>
                        <LazyRoutes.SearchResultsPage />
                      </Suspense>
                    } />
                    <Route path="/search-results" element={
                      <Suspense fallback={<RouteLoader />}>
                        <LazyRoutes.SearchResultsPage />
                      </Suspense>
                    } />
                    <Route path="/explore" element={
                      <Suspense fallback={<RouteLoader />}>
                        <LazyRoutes.ExplorePage />
                      </Suspense>
                    } />
                    <Route path="/user/:id" element={
                      <Suspense fallback={<RouteLoader />}>
                        <LazyRoutes.UserPage />
                      </Suspense>
                    } />

                    <Route path="/users" element={
                      <Suspense fallback={<RouteLoader />}>
                        <LazyRoutes.UserSearchPage />
                      </Suspense>
                    } />
                    <Route path="/debug-auth" element={
                      <Suspense fallback={<RouteLoader />}>
                        <LazyRoutes.DebugAuthPage />
                      </Suspense>
                    } />
                    <Route path="/reset-password" element={
                      <Suspense fallback={<RouteLoader />}>
                        <LazyRoutes.ResetPasswordPage />
                      </Suspense>
                    } />
                    <Route path="/admin/sales" element={
                      <Suspense fallback={<RouteLoader />}>
                        <LazyRoutes.AdminDashboard />
                      </Suspense>
                    } />
                    <Route path="/signup/:code" element={
                      <Suspense fallback={<RouteLoader />}>
                        <LazyRoutes.SignupPage />
                      </Suspense>
                    } />
                    <Route path="/auth/callback" element={
                      <Suspense fallback={<RouteLoader />}>
                        <LazyRoutes.AuthCallbackPage />
                      </Suspense>
                    } />
                    <Route
                      path="/enhanced-search-test"
                      element={
                        <Suspense fallback={<RouteLoader />}>
                          <LazyRoutes.EnhancedSearchTestPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/admin/diagnostic"
                      element={
                        <Suspense fallback={<RouteLoader />}>
                          <LazyRoutes.DiagnosticPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/search-performance"
                      element={
                        <Suspense fallback={<RouteLoader />}>
                          <LazyRoutes.SearchPerformanceDashboard />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/admin/analytics"
                      element={
                        <Suspense fallback={<RouteLoader />}>
                          <LazyRoutes.AnalyticsPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/review/:gameId?"
                      element={
                        <ProtectedRoute showModal={true}>
                          <Suspense fallback={<RouteLoader />}>
                            <LazyRoutes.ReviewFormPage />
                          </Suspense>
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/review/:userId/:gameId" element={
                      <Suspense fallback={<RouteLoader />}>
                        <LazyRoutes.ReviewPage />
                      </Suspense>
                    } />
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
                      element={
                        <Suspense fallback={<RouteLoader />}>
                          <LazyRoutes.FAQ />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/terms"
                      element={
                        <Suspense fallback={<RouteLoader />}>
                          <LazyRoutes.TermsPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/privacy"
                      element={
                        <Suspense fallback={<RouteLoader />}>
                          <LazyRoutes.PrivacyPage />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/privacy-settings"
                      element={
                        <ProtectedRoute showModal={true}>
                          <Suspense fallback={<RouteLoader />}>
                            <LazyRoutes.PrivacySettingsPage />
                          </Suspense>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/privacy-settings/:userId"
                      element={
                        <ProtectedRoute showModal={true}>
                          <Suspense fallback={<RouteLoader />}>
                            <LazyRoutes.PrivacySettingsPage />
                          </Suspense>
                        </ProtectedRoute>
                      }
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
