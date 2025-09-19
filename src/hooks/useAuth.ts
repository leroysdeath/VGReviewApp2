// Enhanced Authentication Hook - Consolidates all auth functionality
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService, AuthUser } from '../services/authService';
import { userService } from '../services/userService';
import { getCurrentUserId } from '../services/reviewService';
import { useAuthModal } from '../context/AuthModalContext';
import { supabase } from '../services/supabase';
import type { Session } from '@supabase/supabase-js';

/**
 * Enhanced useAuth Hook
 * Consolidates functionality from:
 * - useAuth (core authentication)
 * - useCurrentUserId (database user ID mapping)
 * - useAuthGuard (route protection and permission checks)
 * - useAuthenticatedAction (action protection with modal)
 * 
 * Follows VGReviewApp2 Design Philosophy:
 * - Convention Over Configuration
 * - Pragmatic Monolith with Feature-Based Modularity
 * - Single source of truth for authentication
 */

interface AuthResult {
  user?: AuthUser;
  error?: any;
}

interface UseAuthReturn {
  // Core authentication state
  user: AuthUser | null;
  session: Session | null;
  dbUserId: number | null;
  isAuthenticated: boolean;
  loading: boolean;
  dbUserIdLoading: boolean;
  
  // User ID utilities
  getCurrentUserId: () => Promise<number | null>;
  refreshDbUserId: () => Promise<void>;
  
  // Auth guards and permission checks
  requireAuth: (action: () => void | Promise<void>, options?: RequireAuthOptions) => Promise<void>;
  checkAuthGuard: (options?: AuthGuardOptions) => boolean;
  hasPermission: (resourceOwnerId?: string | number) => boolean;
  isOwner: (resourceOwnerId?: string | number) => boolean;
  
  // Protected action execution
  executeAction: <T extends any[], R>(
    action: (...args: T) => R | Promise<R>,
    options?: ExecuteActionOptions
  ) => (...args: T) => Promise<R | undefined>;
  guardAction: <T extends any[], R>(
    action: (...args: T) => R,
    options?: GuardActionOptions
  ) => (...args: T) => R | undefined;
  
  // Authentication actions
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, username: string) => Promise<AuthResult>;
  signOut: () => Promise<{ error?: any }>;
  updateProfile: (updates: { username?: string; avatar?: string }) => Promise<{ error?: any }>;
  resetPassword: (email: string) => Promise<{ error?: any }>;
  updatePassword: (newPassword: string) => Promise<{ error?: any }>;
  signInWithProvider: (provider: 'google' | 'github' | 'discord') => Promise<{ error?: any }>;
  deleteAccount: () => Promise<{ error?: any }>;
  
  // Auth modal control
  openAuthModal: (mode?: 'login' | 'signup' | 'reset') => void;
  requestAuth: (mode?: 'login' | 'signup' | 'reset') => boolean;
}

interface RequireAuthOptions {
  showModal?: boolean;
  modalMode?: 'login' | 'signup' | 'reset';
  redirectTo?: string;
  onUnauthenticated?: () => void;
}

interface AuthGuardOptions {
  redirectTo?: string;
  showModal?: boolean;
  requireAuth?: boolean;
}

interface ExecuteActionOptions {
  onUnauthenticated?: () => void;
  showModal?: boolean;
  modalMode?: 'login' | 'signup' | 'reset';
}

interface GuardActionOptions {
  showModalOnFail?: boolean;
  onAuthRequired?: () => void;
}

export const useAuth = (): UseAuthReturn => {
  // Core state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [dbUserId, setDbUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbUserIdLoading, setDbUserIdLoading] = useState(false);
  
  // Hooks for enhanced functionality
  const navigate = useNavigate();
  const location = useLocation();
  const { openModal: openAuthModalFromContext } = useAuthModal();

  // Initialize authentication
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const session = await authService.getCurrentSession();
        setSession(session);
        if (session?.user) {
          const authUser = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.user_metadata?.username || 'User',
            avatar: session.user.user_metadata?.avatar_url, // Will be overridden by database avatar if exists
            created_at: session.user.created_at
          };
          setUser(authUser);
          
          // Get or create database user ID and fetch avatar (non-blocking with separate loading state)
          setDbUserIdLoading(true);
          getOrCreateDbUserId(session).finally(() => {
            setDbUserIdLoading(false);
          });
        } else {
          setUser(null);
          setDbUserId(null);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        setUser(null);
        setSession(null);
        setDbUserId(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      try {
        setSession(session);
        if (session?.user) {
          const authUser = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.user_metadata?.username || 'User',
            avatar: session.user.user_metadata?.avatar_url, // Will be overridden by database avatar if exists
            created_at: session.user.created_at
          };
          setUser(authUser);
          
          // Get or create database user ID and fetch avatar (non-blocking with separate loading state)
          setDbUserIdLoading(true);
          getOrCreateDbUserId(session).finally(() => {
            setDbUserIdLoading(false);
          });
        } else {
          setUser(null);
          setDbUserId(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
        setDbUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Helper function to get or create database user ID and fetch profile data
  const getOrCreateDbUserId = async (session: Session) => {
    try {
      const timeoutPromise = new Promise<{ success: false, error: string }>((resolve) => {
        setTimeout(() => resolve({ success: false, error: 'Database operation timeout' }), 5000);
      });
      
      const result = await Promise.race([
        userService.getOrCreateDatabaseUser(session.user),
        timeoutPromise
      ]);
      
      if (result.success && result.userId) {
        setDbUserId(result.userId);
      } else {
        console.error('Failed to get/create database user:', result.error);
        setDbUserId(null);
      }
    } catch (error) {
      console.error('Error in user creation:', error);
      setDbUserId(null);
    }
  };

  // User ID utilities (from useCurrentUserId)
  const getCurrentUserIdAsync = useCallback(async (): Promise<number | null> => {
    if (!user) {
      return null;
    }
    
    // If we already have the dbUserId cached, return it
    if (dbUserId !== null) {
      return dbUserId;
    }
    
    // Otherwise fetch it from the service
    try {
      const id = await getCurrentUserId();
      if (id !== null) {
        setDbUserId(id);
      }
      return id;
    } catch (error) {
      console.error('Error fetching user database ID:', error);
      return null;
    }
  }, [user, dbUserId]);

  const refreshDbUserId = useCallback(async () => {
    if (!session) return;
    
    setDbUserIdLoading(true);
    await getOrCreateDbUserId(session);
    setDbUserIdLoading(false);
  }, [session]);

  // Auth guards and permission checks (from useAuthGuard)
  const checkAuthGuard = useCallback((options: AuthGuardOptions = {}): boolean => {
    const { requireAuth = true } = options;
    const isAuthenticated = !!user;
    
    if (!loading && requireAuth && !isAuthenticated) {
      if (options.showModal) {
        openAuthModalFromContext();
      } else if (options.redirectTo) {
        navigate(options.redirectTo, { 
          state: { from: location.pathname + location.search } 
        });
      }
      return false;
    }
    
    return !!user;
  }, [loading, user, navigate, location, openAuthModalFromContext]);

  const hasPermission = useCallback((resourceOwnerId?: string | number): boolean => {
    if (!user) return false;
    if (!resourceOwnerId) return true; // No owner specified, just check auth
    return String(user.id) === String(resourceOwnerId);
  }, [user]);

  const isOwner = useCallback((resourceOwnerId?: string | number): boolean => {
    if (!user || !dbUserId || !resourceOwnerId) return false;
    return String(dbUserId) === String(resourceOwnerId);
  }, [user, dbUserId]);

  // Protected action execution (from useAuthenticatedAction)
  const executeAction = useCallback(<T extends any[], R>(
    action: (...args: T) => R | Promise<R>,
    options: ExecuteActionOptions = {}
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      if (!user) {
        if (options.onUnauthenticated) {
          options.onUnauthenticated();
        }
        
        if (options.showModal !== false) {
          openAuthModalFromContext(options.modalMode || 'login');
        }
        
        return undefined;
      }

      try {
        const result = await action(...args);
        return result;
      } catch (error) {
        console.error('Error executing authenticated action:', error);
        throw error;
      }
    };
  }, [user, openAuthModalFromContext]);

  const guardAction = useCallback(<T extends any[], R>(
    action: (...args: T) => R,
    options: GuardActionOptions = {}
  ) => {
    return (...args: T): R | undefined => {
      if (!user) {
        options?.onAuthRequired?.();
        
        if (options?.showModalOnFail !== false) {
          openAuthModalFromContext();
        }
        return undefined;
      }
      return action(...args);
    };
  }, [user, openAuthModalFromContext]);

  // Require auth helper
  const requireAuth = useCallback(async (
    action: () => void | Promise<void>,
    options: RequireAuthOptions = {}
  ) => {
    if (!user) {
      if (options.onUnauthenticated) {
        options.onUnauthenticated();
      }
      
      if (options.showModal !== false) {
        openAuthModalFromContext(options.modalMode || 'login');
      } else if (options.redirectTo) {
        navigate(options.redirectTo, {
          state: { from: location.pathname + location.search }
        });
      }
      return;
    }
    
    await action();
  }, [user, openAuthModalFromContext, navigate, location]);

  // Auth modal control
  const openAuthModal = useCallback((mode?: 'login' | 'signup' | 'reset') => {
    openAuthModalFromContext(mode);
  }, [openAuthModalFromContext]);

  const requestAuth = useCallback((mode?: 'login' | 'signup' | 'reset'): boolean => {
    if (!user) {
      openAuthModalFromContext(mode || 'login');
      return false;
    }
    return true;
  }, [user, openAuthModalFromContext]);

  // Authentication actions
  const signUp = async (email: string, password: string, username: string) => {
    setLoading(true);
    const result = await authService.signUp(email, password, username);
    setLoading(false);
    return result;
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const result = await authService.signIn(email, password);
    setLoading(false);
    return result;
  };

  const signOut = async () => {
    setLoading(true);
    const result = await authService.signOut();
    setUser(null);
    setSession(null);
    setDbUserId(null);
    setLoading(false);
    return result;
  };

  const updateProfile = async (updates: { username?: string; avatar?: string }) => {
    try {
      // First update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          username: updates.username,
          avatar_url: updates.avatar,
          name: updates.username
        }
      });

      if (authError) return { error: authError };

      // Then update database profile using userService
      if (dbUserId && session?.user) {
        const dbUpdates = {
          name: updates.username || user?.name || '',
          username: updates.username || undefined, // Also update username column
          avatar_url: updates.avatar
        };
        
        const result = await userService.updateUserProfile(dbUserId, dbUpdates);
        if (!result.success) {
          return { error: result.error };
        }

        // Re-fetch the updated profile from database to ensure state sync
        const { data: updatedUser, error: fetchError } = await supabase
          .from('user')
          .select('avatar_url, username, name')
          .eq('id', dbUserId)
          .single();
        
        if (!fetchError && updatedUser) {
          // Update local state with fresh database values
          setUser(prevUser => {
            if (prevUser) {
              return { 
                ...prevUser, 
                name: updatedUser.username || updatedUser.name || prevUser.name,
                avatar: updatedUser.avatar_url || prevUser.avatar
              };
            }
            return prevUser;
          });
        } else {
          // Fallback to optimistic update if fetch fails
          if (user) {
            setUser({ ...user, name: updates.username || user.name, avatar: updates.avatar || user.avatar });
          }
        }
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (email: string, customRedirectUrl?: string) => {
    return await authService.resetPassword(email, customRedirectUrl);
  };

  const updatePassword = async (newPassword: string) => {
    return await authService.updatePassword(newPassword);
  };

  const signInWithProvider = async (provider: 'google' | 'github' | 'discord') => {
    return await authService.signInWithProvider(provider);
  };

  const getUserProfile = async (userId: string) => {
    return await authService.getUserProfile(userId);
  };

  const deleteAccount = async () => {
    setLoading(true);
    const result = await authService.deleteAccount();
    if (!result.error) {
      setUser(null);
      setSession(null);
      setDbUserId(null);
    }
    setLoading(false);
    return result;
  };

  return {
    // Core authentication state
    user,
    session,
    dbUserId,
    isAuthenticated: !!user,
    loading,
    dbUserIdLoading,
    
    // User ID utilities
    getCurrentUserId: getCurrentUserIdAsync,
    refreshDbUserId,
    
    // Auth guards and permission checks
    requireAuth,
    checkAuthGuard,
    hasPermission,
    isOwner,
    
    // Protected action execution
    executeAction,
    guardAction,
    
    // Authentication actions
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    signInWithProvider,
    deleteAccount,
    
    // Auth modal control
    openAuthModal,
    requestAuth
  };
};

// Export for backwards compatibility during migration
export default useAuth;