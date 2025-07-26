import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from './auth/AuthModal';
import { useAuthModal } from '../context/AuthModalContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectTo = '/login',
  requireAuth = true 
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { openModal } = useAuthModal();

  useEffect(() => {
    // If user is not authenticated and auth is required, open the modal
    if (!loading && !user && requireAuth) {
      openModal('login');
    }
  }, [loading, user, requireAuth, openModal]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && requireAuth) {
    // Show the modal instead of redirecting
    return (
      <>
        <Navigate to="/" state={{ from: location }} replace />
        <AuthModal 
          onLoginSuccess={() => {
            // The modal will close automatically and the user will be redirected
          }}
          onSignupSuccess={() => {
            // The modal will close automatically
          }}
        />
      </>
    );
  }

  return <>{children}</>;
};
