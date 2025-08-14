// Authentication hook
import { useState, useEffect } from 'react';
import { authService, AuthUser } from '../services/authService';
import type { Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const session = await authService.getCurrentSession();
      setSession(session);
      if (session?.user) {
        // Convert Supabase user to our AuthUser format
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.user_metadata?.username || 'User',
          avatar: session.user.user_metadata?.avatar_url,
          created_at: session.user.created_at
        });
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.user_metadata?.username || 'User',
          avatar: session.user.user_metadata?.avatar_url,
          created_at: session.user.created_at
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    setLoading(false);
    return result;
  };

  const updateProfile = async (updates: { username?: string; avatar?: string }) => {
    const result = await authService.updateProfile(updates);
    if (!result.error && user) {
      setUser({ ...user, name: updates.username || user.name, avatar: updates.avatar || user.avatar });
    }
    return result;
  };

  const resetPassword = async (email: string) => {
    return await authService.resetPassword(email);
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
    }
    setLoading(false);
    return result;
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    signInWithProvider,
    getUserProfile,
    deleteAccount,
    isAuthenticated: !!user
  };
};
