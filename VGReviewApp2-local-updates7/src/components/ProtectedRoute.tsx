import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from './auth/AuthModal';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  showModal?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  redirectTo = '/login',
  showModal = false
}) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    if (showModal) {
      // Show modal instead of redirecting
      return (
        <>
          {children}
          <AuthModal
            isOpen={true}
            onClose={() => setShowAuthModal(false)}
            onLoginSuccess={() => setShowAuthModal(false)}
            onSignupSuccess={() => setShowAuthModal(false)}
          />
        </>
      );
    } else {
      // Redirect to login page with return URL
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
  }

  // If user is authenticated but trying to access auth pages (login/signup)
  if (!requireAuth && isAuthenticated) {
    // Redirect authenticated users away from auth pages
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};

// Higher-order component for easy use
export const withProtectedRoute = <P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) => {
  return (props: P) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

// Hook for programmatic authentication checks
export const useRequireAuth = () => {
  const { isAuthenticated, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const requireAuth = (callback?: () => void) => {
    if (!isAuthenticated && !loading) {
      setShowAuthModal(true);
      return false;
    }
    callback?.();
    return true;
  };

  return {
    requireAuth,
    showAuthModal,
    setShowAuthModal,
    isAuthenticated,
    loading
  };
};
