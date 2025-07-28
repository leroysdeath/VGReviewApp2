import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
    // Don't navigate away - just show a placeholder while the modal is open
    // The modal will handle the authentication flow
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400">Please sign in to continue</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
