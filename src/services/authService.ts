// src/services/authService.ts
import { supabase } from '../utils/supabaseClient';
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

      // Create user profile in our database
      if (data.user) {
        await this.createUserProfile(data.user, username);
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

  async resetPassword(email: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
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

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  async updateProfile(updates: { username?: string; avatar?: string }): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          username: updates.username,
          avatar_url: updates.avatar
        }
      });

      if (authError) return { error: authError };

      // Update user profile in database
      const { error: dbError } = await supabase
        .from('user')
        .update({
          username: updates.username,
          picurl: updates.avatar,
          updated_at: new Date().toISOString()
        })
        .eq('provider_id', user.id);

      return { error: dbError };
    } catch (error) {
      return { error };
    }
  }

  async createUserProfile(user: User, username: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('user')
        .insert({
          provider_id: user.id,
          email: user.email || '',
          name: username,
          username: username,
          picurl: user.user_metadata?.avatar_url,
          email_verified: user.email_confirmed_at ? true : false
        });

      // Also create user preferences
      if (!error) {
        await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id
          });
      }

      return { error };
    } catch (error) {
      return { error };
    }
  }

  async getUserProfile(userId: string) {
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
}

export const authService = new AuthService();
