// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { authService, AuthUser } from '../services/authService';
import { avatarService } from '../services/avatarService';
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
        await updateUserFromSession(session);
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        await updateUserFromSession(session);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update user from session data
  const updateUserFromSession = async (session: Session) => {
    try {
      // Get additional user data from database
      const { user: dbUser } = await authService.getUserProfile(session.user.id);
      
      const userData: AuthUser = {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.name || 
              session.user.user_metadata?.username || 
              dbUser?.name || 
              'User',
        avatar: session.user.user_metadata?.avatar_url || 
                dbUser?.picurl || 
                avatarService.generateInitialsAvatar(session.user.user_metadata?.name || 'User'),
        created_at: session.user.created_at
      };

      setUser(userData);
    } catch (error) {
      console.error('Error updating user from session:', error);
      // Fallback to basic user data
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.name || 'User',
        avatar: avatarService.generateInitialsAvatar(session.user.user_metadata?.name || 'User'),
        created_at: session.user.created_at
      });
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
    setLoading(false);
    return result;
  };

  const updateProfile = async (updates: { username?: string; avatar?: string }) => {
    const result = await authService.updateProfile(updates);
    
    if (!result.error && user) {
      // Update local user state immediately for better UX
      setUser(prev => prev ? {
        ...prev,
        name: updates.username || prev.name,
        avatar: updates.avatar || prev.avatar
      } : null);
      
      // Refresh user data from server
      if (session) {
        await updateUserFromSession(session);
      }
    }
    
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
    isAuthenticated: !!user
  };
};
