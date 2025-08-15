import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useAuthModal } from '../context/AuthModalContext';

interface UseAuthGuardOptions {
  redirectTo?: string;
  showModal?: boolean;
  requireAuth?: boolean;
  onAuthSuccess?: () => void;
  onAuthFail?: () => void;
}

/**
 * Hook to guard components and pages that require authentication
 * Provides flexible authentication checking with modal or redirect options
 */
export const useAuthGuard = (options: UseAuthGuardOptions = {}) => {
  const {
    redirectTo = '/',
    showModal = true,
    requireAuth = true,
    onAuthSuccess,
    onAuthFail
  } = options;

  const { isAuthenticated, loading, user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && requireAuth && !isAuthenticated) {
      onAuthFail?.();
      
      if (showModal) {
        openAuthModal();
      } else {
        // Store current location for redirect after login
        navigate(redirectTo, { 
          state: { from: location.pathname + location.search } 
        });
      }
    } else if (!loading && isAuthenticated && requireAuth) {
      onAuthSuccess?.();
    }
  }, [
    loading, 
    isAuthenticated, 
    requireAuth, 
    showModal, 
    redirectTo, 
    navigate, 
    location, 
    openAuthModal,
    onAuthSuccess,
    onAuthFail
  ]);

  /**
   * Check if user has permission to access a resource
   */
  const hasPermission = (resourceOwnerId?: string | number): boolean => {
    if (!isAuthenticated || !user) return false;
    if (!resourceOwnerId) return true; // No owner specified, just check auth
    return String(user.id) === String(resourceOwnerId);
  };

  /**
   * Guard a function call - only execute if authenticated
   */
  const guardAction = <T extends any[], R>(
    action: (...args: T) => R,
    options?: {
      showModalOnFail?: boolean;
      onAuthRequired?: () => void;
    }
  ) => {
    return (...args: T): R | undefined => {
      if (!isAuthenticated) {
        options?.onAuthRequired?.();
        
        if (options?.showModalOnFail !== false) {
          openAuthModal();
        }
        return undefined;
      }
      return action(...args);
    };
  };

  /**
   * Check authentication and execute callback
   */
  const checkAuth = (
    onAuthenticated: () => void,
    onUnauthenticated?: () => void
  ) => {
    if (isAuthenticated) {
      onAuthenticated();
    } else {
      onUnauthenticated?.();
      if (showModal) {
        openAuthModal();
      }
    }
  };

  return {
    isAuthenticated,
    loading,
    user,
    hasPermission,
    guardAction,
    checkAuth,
    openAuthModal
  };
};

/**
 * Hook for components that need to check ownership
 */
export const useOwnershipGuard = (resourceOwnerId?: string | number) => {
  const { user, isAuthenticated } = useAuth();
  
  const isOwner = isAuthenticated && user && resourceOwnerId
    ? String(user.id) === String(resourceOwnerId)
    : false;

  const canEdit = isOwner;
  const canDelete = isOwner;
  const canView = true; // Most resources are publicly viewable

  return {
    isOwner,
    canEdit,
    canDelete,
    canView,
    userId: user?.id
  };
};