// Authentication hook
import { useState, useEffect } from 'react';
import { authService, AuthUser } from '../services/authService';
import { userService } from '../services/userService';
import { supabase } from '../services/supabase';
import type { Session } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [dbUserId, setDbUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbUserIdLoading, setDbUserIdLoading] = useState(false);

  useEffect(() => {
    // Get initial session and database user ID
    const getInitialSession = async () => {
      try {
        const session = await authService.getCurrentSession();
        setSession(session);
        if (session?.user) {
          // Convert Supabase user to our AuthUser format
          const authUser = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.user_metadata?.username || 'User',
            avatar: session.user.user_metadata?.avatar_url,
            created_at: session.user.created_at
          };
          setUser(authUser);
          
          // Get or create database user ID (non-blocking with separate loading state)
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
            avatar: session.user.user_metadata?.avatar_url,
            created_at: session.user.created_at
          };
          setUser(authUser);
          
          // Get or create database user ID (non-blocking with separate loading state)
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

  // Helper function to get or create database user ID using modular user service
  const getOrCreateDbUserId = async (session: Session) => {
    try {
      // Add timeout to prevent infinite hanging
      const timeoutPromise = new Promise<{ success: false, error: string }>((resolve) => {
        setTimeout(() => resolve({ success: false, error: 'Database operation timeout' }), 5000);
      });
      
      const result = await Promise.race([
        userService.getOrCreateDatabaseUser(session.user),
        timeoutPromise
      ]);
      
      if (result.success && result.userId) {
        setDbUserId(result.userId);
        console.log('✅ Database user ID set:', result.userId);
      } else {
        console.error('Failed to get/create database user:', result.error);
        setDbUserId(null);
      }
    } catch (error) {
      console.error('Error in user creation:', error);
      setDbUserId(null);
    }
  };

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
          avatar_url: updates.avatar
        };
        
        const result = await userService.updateUserProfile(dbUserId, dbUpdates);
        if (!result.success) {
          return { error: result.error };
        }

        // Update local state
        if (user) {
          setUser({ ...user, name: updates.username || user.name, avatar: updates.avatar || user.avatar });
        }
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
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
      setDbUserId(null);
    }
    setLoading(false);
    return result;
  };

  return {
    user,
    session,
    dbUserId,
    loading,
    dbUserIdLoading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    signInWithProvider,
    getUserProfile,
    deleteAccount
  };
};
