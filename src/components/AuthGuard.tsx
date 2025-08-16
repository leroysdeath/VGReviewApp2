import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../context/AuthModalContext';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  requireAuth?: boolean;
  requireOwnership?: boolean;
  ownerId?: string | number;
  showModalOnFail?: boolean;
  showMessageOnFail?: boolean;
}

/**
 * Component to conditionally render content based on authentication status
 * More flexible than ProtectedRoute for inline auth checks
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback = null,
  loadingComponent,
  requireAuth = true,
  requireOwnership = false,
  ownerId,
  showModalOnFail = false,
  showMessageOnFail = true
}) => {
  const { user, isAuthenticated, loading } = useAuth();
  const { openAuthModal } = useAuthModal();

  // Show loading state
  if (loading) {
    return (
      <>
        {loadingComponent || (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        )}
      </>
    );
  }

  // Check authentication
  if (requireAuth && !isAuthenticated) {
    if (showModalOnFail) {
      openAuthModal();
    }

    if (showMessageOnFail) {
      return (
        <div className="text-center p-4">
          <p className="text-gray-400 mb-4">Please sign in to continue</p>
          <button
            onClick={() => openAuthModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      );
    }

    return <>{fallback}</>;
  }

  // Check ownership if required
  if (requireOwnership && ownerId) {
    const isOwner = user && String(user.id) === String(ownerId);
    if (!isOwner) {
      return (
        <>
          {fallback || (
            <div className="text-center p-4">
              <p className="text-gray-400">You don't have permission to access this content</p>
            </div>
          )}
        </>
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
};

/**
 * Component to show content only to authenticated users
 */
export const AuthOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : null;
};

/**
 * Component to show content only to guests (non-authenticated users)
 */
export const GuestOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? <>{children}</> : null;
};

/**
 * Component to show content only to the owner of a resource
 */
export const OwnerOnly: React.FC<{
  children: React.ReactNode;
  ownerId?: string | number;
  fallback?: React.ReactNode;
}> = ({ children, ownerId, fallback = null }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !user || !ownerId) {
    return <>{fallback}</>;
  }

  const isOwner = String(user.id) === String(ownerId);
  return isOwner ? <>{children}</> : <>{fallback}</>;
};