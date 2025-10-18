// Supabase Authentication Service
import { supabase } from './supabase';
import { userService } from './userService';
import { authLogger } from './authLogger';
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
    authLogger.logAuthAttempt('signup', email);

    try {
      // Determine redirect URL based on environment
      const getEmailRedirectTo = () => {
        const currentOrigin = window.location.origin;

        // If we're on localhost/development, redirect to local
        if (currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1')) {
          return `${currentOrigin}/auth/callback`;
        }

        // For production, use the current origin
        return `${currentOrigin}/auth/callback`;
      };

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            name: username
          },
          emailRedirectTo: getEmailRedirectTo()
        }
      });

      if (error) {
        authLogger.logAuthFailure({
          operation: 'signup',
          errorCode: error.code,
          errorMessage: error.message,
          email,
          metadata: { username }
        }, error);
        return { user: null, error };
      }

      // Create user profile in our database using userService
      if (data.user) {
        const { user } = data;
        const session = { user } as any; // Minimal session object for compatibility
        const result = await userService.getOrCreateUser(session);
        if (!result.success) {
          authLogger.error('signup_db_user_creation_failed', 'Failed to create database user', result.error, {
            userId: user.id,
            username
          });
          console.error('Failed to create database user:', result.error);
        } else {
          authLogger.logDbUserIdOperation('create', true, result.userId);
        }
      }

      authLogger.logAuthSuccess('signup', data.user?.id, email);
      return { user: data.user, error: null };
    } catch (error) {
      authLogger.logAuthFailure({
        operation: 'signup',
        email,
        metadata: { username }
      }, error);
      return { user: null, error };
    }
  }

  async signIn(emailOrUsername: string, password: string): Promise<{ user: User | null; error: any }> {
    const isEmail = emailOrUsername.includes('@');
    authLogger.logAuthAttempt('login', isEmail ? emailOrUsername : undefined);

    try {
      let email = emailOrUsername;

      // Check if input is a username (not email format)
      // Email must contain @ and a domain
      if (!isEmail) {
        // Input is a username - lookup the associated email
        const { data: user, error: lookupError } = await supabase
          .from('user')
          .select('email')
          .eq('username', emailOrUsername.toLowerCase())
          .single();

        if (lookupError || !user?.email) {
          // Username not found or no email associated
          authLogger.logAuthFailure({
            operation: 'login',
            errorMessage: 'Invalid login credentials - username not found',
            metadata: { usernameProvided: true }
          });
          return {
            user: null,
            error: { message: 'Invalid login credentials' }
          };
        }

        email = user.email;
      }

      // Now sign in with email (whether original or looked up)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        authLogger.logAuthFailure({
          operation: 'login',
          errorCode: error.code,
          errorMessage: error.message,
          email,
          metadata: { providedUsername: !isEmail }
        }, error);
        return { user: data.user, error };
      }

      authLogger.logAuthSuccess('login', data.user?.id, email);
      return { user: data.user, error };
    } catch (error) {
      authLogger.logAuthFailure({
        operation: 'login',
        metadata: { providedUsername: !isEmail }
      }, error);
      return { user: null, error };
    }
  }

  async signOut(): Promise<{ error: any }> {
    authLogger.logAuthAttempt('logout');

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        authLogger.logAuthFailure({
          operation: 'logout',
          errorCode: error.code,
          errorMessage: error.message
        }, error);
        return { error };
      }

      authLogger.logAuthSuccess('logout');
      return { error };
    } catch (error) {
      authLogger.logAuthFailure({
        operation: 'logout'
      }, error);
      return { error };
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      authLogger.error('get_user_error', 'Failed to get current user', error);
      console.error('Get current user error:', error);
      return null;
    }
  }

  async getCurrentSession(): Promise<Session | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      authLogger.error('get_session_error', 'Failed to get current session', error);
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
          avatar_url: updates.avatar,
          updated_at: new Date().toISOString()
        })
        .eq('provider_id', user.id);

      return { error: profileError };
    } catch (error) {
      return { error };
    }
  }

  async resetPassword(email: string, customRedirectUrl?: string): Promise<{ error: any }> {
    authLogger.logAuthAttempt('reset_password', email);

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
        authLogger.debug('reset_password_redirect_url', 'Determined password reset redirect URL', {
          redirectUrl,
          origin: currentOrigin
        });
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      if (error) {
        authLogger.logAuthFailure({
          operation: 'reset_password',
          errorCode: error.code,
          errorMessage: error.message,
          email
        }, error);
        return { error };
      }

      authLogger.logAuthSuccess('reset_password', undefined, email);
      return { error };
    } catch (error) {
      authLogger.logAuthFailure({
        operation: 'reset_password',
        email
      }, error);
      return { error };
    }
  }

  async updatePassword(newPassword: string): Promise<{ error: any }> {
    authLogger.logAuthAttempt('update_password');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        authLogger.logAuthFailure({
          operation: 'update_password',
          errorCode: error.code,
          errorMessage: error.message
        }, error);
        return { error };
      }

      authLogger.logAuthSuccess('update_password');
      return { error };
    } catch (error) {
      authLogger.logAuthFailure({
        operation: 'update_password'
      }, error);
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
          avatar_url: user.user_metadata?.avatar_url,
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

  async checkUsernameAvailability(username: string): Promise<{ available: boolean; error?: any }> {
    try {
      if (!username || username.length < 3) {
        return { available: false };
      }

      const { count, error } = await supabase
        .from('user')
        .select('id', { count: 'exact', head: true })
        .eq('username', username.toLowerCase());

      if (error) {
        console.error('Username availability check error:', error);
        return { available: false, error };
      }

      return { available: count === 0 };
    } catch (error) {
      console.error('Username availability check error:', error);
      return { available: false, error };
    }
  }
}

export const authService = new AuthService();
