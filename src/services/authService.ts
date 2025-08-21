// Supabase Authentication Service
import { supabase } from './supabase';
import { userService } from './userService';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  created_at: string;
}

class AuthService {
  async signUp(email: string, password: string, username: string): Promise<{ user: User | null; error: any }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            name: username
          }
        }
      });

      if (error) return { user: null, error };

      // Create user profile in our database using userService
      if (data.user) {
        const result = await userService.getOrCreateDatabaseUser(data.user);
        if (!result.success) {
          console.error('Failed to create database user:', result.error);
        }
      }

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error };
    }
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; error: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      return { user: data.user, error };
    } catch (error) {
      return { user: null, error };
    }
  }

  async signOut(): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async getCurrentSession(): Promise<Session | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Get current session error:', error);
      return null;
    }
  }


  async resetPassword(email: string): Promise<{ error: any }> {
    try {
      // Use current origin for development and production
      // This will work correctly whether running on localhost:5173, localhost:8888, or production
      const redirectUrl = `${window.location.origin}/reset-password`;
        
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      return { error };
    } catch (error) {
      return { error };
    }
  }

  async updatePassword(newPassword: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      return { error };
    } catch (error) {
      return { error };
    }
  }

  async signInWithProvider(provider: 'google' | 'github' | 'discord'): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      return { error };
    } catch (error) {
      return { error };
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }


  // Get user profile from database
  async getUserProfile(userId: string): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('provider_id', userId)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Delete user account
  async deleteAccount(): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'No user found' };

      // Delete user profile from database first
      await supabase
        .from('user')
        .delete()
        .eq('provider_id', user.id);

      // Note: Supabase doesn't provide a direct way to delete auth users from client
      // You would need to implement this via an Edge Function or handle it server-side
      // For now, we'll just sign out the user
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  }
}

export const authService = new AuthService();
