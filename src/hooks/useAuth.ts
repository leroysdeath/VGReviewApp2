// Authentication hook - Fixed version
import { useState, useEffect } from 'react';
import { authService, AuthUser } from '../services/authService';
import type { Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const createUserFromSession = (session: Session | null): AuthUser | null => {
    if (!session?.user) return null;
    
    // Safely access user metadata with null checks
    const userMetadata = session.user.user_metadata || {};
    
    return {
      id: session.user.id,
      email: session.user.email || '',
      name: userMetadata.name || userMetadata.username || session.user.email?.split('@')[0] || 'User',
      avatar: userMetadata.avatar_url || null, // Explicitly set to null if undefined
      created_at: session.user.created_at
    };
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const session = await authService.getCurrentSession();
        setSession(session);
        const userData = createUserFromSession(session);
        setUser(userData);
      } catch (error) {
        console.error('Error getting initial session:', error);
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      setSession(session);
      const userData = createUserFromSession(session);
      setUser(userData);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    setLoading(true);
    try {
      const result = await authService.signUp(email, password, username);
      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authService.signIn(email, password);
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const result = await authService.signOut();
      setUser(null);
      setSession(null);
      return result;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: { username?: string; avatar?: string }) => {
    try {
      const result = await authService.updateProfile(updates);
      if (!result.error && user) {
        // Safely update user with new data
        setUser(prevUser => prevUser ? { ...prevUser, ...updates } : null);
      }
      return result;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    isAuthenticated: !!user
  };
};
