// Supabase Authentication Service
import { supabase } from './supabase';
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

  async updateProfile(updates: { username?: string; avatar?: string }): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.updateUser({
        data: updates
      });

      if (!error && updates.username) {
        // Update user profile in our database
        const user = await this.getCurrentUser();
        if (user) {
          await supabase
            .from('user')
            .update({ name: updates.username })
            .eq('provider_id', user.id);
        }
      }

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

  private async createUserProfile(user: User, username: string): Promise<void> {
    try {
      await supabase
        .from('user')
        .insert({
          provider: 'supabase',
          provider_id: user.id,
          email: user.email || '',
          name: username,
          picurl: user.user_metadata?.avatar_url || null
        });
    } catch (error) {
      console.error('Failed to create user profile:', error);
    }
  }

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();
