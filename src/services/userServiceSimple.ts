import { supabase } from './supabase';

export interface UserProfile {
  id: number;
  provider_id: string;
  email?: string;
  name?: string;
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  website?: string;
  platform?: string;
  created_at: string;
  updated_at: string;
  follower_count?: number;
  following_count?: number;
}

export interface UserUpdate {
  name?: string;
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  website?: string;
  platform?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Simplified user service - direct Supabase operations without caching
 */
export const userServiceSimple = {
  /**
   * Get user by database ID
   */
  async getUser(userId: string | number): Promise<ServiceResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error fetching user:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Get user by provider ID (auth UUID)
   */
  async getUserByProviderId(providerId: string): Promise<ServiceResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('provider_id', providerId)
        .single();
      
      if (error) {
        console.error('Error fetching user by provider ID:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error fetching user by provider ID:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Update user profile
   */
  async updateUser(userId: string | number, updates: UserUpdate): Promise<ServiceResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('*')
        .single();
      
      if (error) {
        console.error('Error updating user:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error updating user:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Get current authenticated user from auth and database
   */
  async getCurrentUser(): Promise<ServiceResponse<UserProfile>> {
    try {
      // Get auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        return { success: false, error: `Authentication error: ${authError.message}` };
      }
      
      if (!authUser) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get database user by provider ID
      return await this.getUserByProviderId(authUser.id);
    } catch (error) {
      console.error('Unexpected error getting current user:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
};