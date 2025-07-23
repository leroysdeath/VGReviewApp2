// Authentication hook
import { useState, useEffect } from 'react';
import { authService, AuthUser } from '../services/authService';
import type { Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        setError(null);
        const session = await authService.getCurrentSession();
        setSession(session);
        
        if (session?.user) {
          // Convert Supabase user to our AuthUser format with null checks
          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || 
                  session.user.user_metadata?.username || 
                  session.user.email?.split('@')[0] || 
                  'User',
            avatar: session.user.user_metadata?.avatar_url || undefined,
            created_at: session.user.created_at
          };
          setUser(authUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error getting initial session:', err);
        setError('Failed to load user session');
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      setSession(session);
      
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || 
                session.user.user_metadata?.username || 
                session.user.email?.split('@')[0] || 
                'User',
          avatar: session.user.user_metadata?.avatar_url || undefined,
          created_at: session.user.created_at
        };
        setUser(authUser);
        setError(null);
      } else {
        setUser(null);
      }
      
      // Set loading to false when auth state changes
      if (loading) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.signUp(email, password, username);
      if (result.error) {
        setError(result.error.message || 'Failed to sign up');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return { user: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.signIn(email, password);
      if (result.error) {
        setError(result.error.message || 'Failed to sign in');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return { user: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.signOut();
      if (!result.error) {
        setUser(null);
        setSession(null);
      } else {
        setError(result.error.message || 'Failed to sign out');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: { username?: string; avatar?: string }) => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }
    
    setError(null);
    try {
      const result = await authService.updateProfile(updates);
      if (!result.error && user) {
        // Update local user state
        setUser({ 
          ...user, 
          name: updates.username || user.name,
          avatar: updates.avatar || user.avatar
        });
      } else if (result.error) {
        setError(result.error.message || 'Failed to update profile');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return { error: err };
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      const result = await authService.resetPassword(email);
      if (result.error) {
        setError(result.error.message || 'Failed to send reset email');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return { error: err };
    }
  };

  return {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
    isAuthenticated: !!user && !!session
  };
};
