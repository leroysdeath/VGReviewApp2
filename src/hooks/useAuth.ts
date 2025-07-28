// Authentication hook with enhanced profile data fetching
import { useState, useEffect } from 'react';
import { authService, AuthUser } from '../services/authService';
import type { Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session and fetch complete user profile
    const getInitialSession = async () => {
      try {
        const session = await authService.getCurrentSession();
        setSession(session);
        
        if (session?.user) {
          // First set basic user data
          const basicUser: AuthUser = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.user_metadata?.username || 'User',
            avatar: session.user.user_metadata?.avatar_url,
            created_at: session.user.created_at
          };
          setUser(basicUser);

          // Then fetch complete profile data from database
          const { data: profile } = await authService.getUserProfile(session.user.id);
          if (profile) {
            setUser({
              ...basicUser,
              name: profile.name || basicUser.name,
              avatar: profile.picurl || basicUser.avatar,
              // Add any additional profile fields
            });
          }
        }
      } catch (error) {
        console.error('Error loading user session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      if (session?.user) {
        const basicUser: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.user_metadata?.username || 'User',
          avatar: session.user.user_metadata?.avatar_url,
          created_at: session.user.created_at
        };
        setUser(basicUser);

        // Fetch complete profile data
        const { data: profile } = await authService.getUserProfile(session.user.id);
        if (profile) {
          setUser({
            ...basicUser,
            name: profile.name || basicUser.name,
            avatar: profile.picurl || basicUser.avatar,
          });
        }
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
    
    // After successful sign in, fetch the complete profile
    if (!result.error && result.user) {
      const { data: profile } = await authService.getUserProfile(result.user.id);
      if (profile) {
        setUser({
          id: result.user.id,
          email: result.user.email || '',
          name: profile.name || result.user.user_metadata?.username || 'User',
          avatar: profile.picurl || result.user.user_metadata?.avatar_url,
          created_at: result.user.created_at
        });
      }
    }
    
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
      setUser({ 
        ...user, 
        name: updates.username || user.name, 
        avatar: updates.avatar || user.avatar 
      });
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
