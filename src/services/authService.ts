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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'No user found' };

      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          username: updates.username,
          avatar_url: updates.avatar,
          name: updates.username || user.user_metadata?.username
        }
      });

      if (authError) return { error: authError };

      // Update user profile in database
      const { error: profileError } = await supabase
        .from('user')
        .update({
          name: updates.username || user.user_metadata?.username,
          picurl: updates.avatar,
          updated_at: new Date().toISOString()
        })
        .eq('provider_id', user.id);

      return { error: profileError };
    } catch (error) {
      return { error };
    }
  }

  async resetPassword(email: string, customRedirectUrl?: string): Promise<{ error: any }> {
    try {
      // Determine the appropriate redirect URL based on environment
      let redirectUrl: string;
      
      if (customRedirectUrl) {
        redirectUrl = customRedirectUrl;
      } else {
        // Auto-detect based on current environment
        const currentOrigin = window.location.origin;
        
        // For all environments, use the current origin unless specifically overridden
        redirectUrl = `${currentOrigin}/reset-password`;
        
        // Log for debugging
        console.log('Password reset redirect URL:', redirectUrl);
        console.log('Current origin:', currentOrigin);
      }
        
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      
      if (error) {
        console.error('Password reset email error:', error);
      } else {
        console.log('Password reset email sent successfully');
      }
      
      return { error };
    } catch (error) {
      console.error('Password reset error:', error);
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

  // Create user profile in database after successful signup
  private async createUserProfile(user: User, username: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user')
        .insert({
          provider: 'supabase',
          provider_id: user.id,
          email: user.email || '',
          name: username,
          picurl: user.user_metadata?.avatar_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating user profile:', error);
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
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
