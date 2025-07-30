import { supabase } from './supabase';

export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
  canChange: boolean;
  changesRemaining: number;
}

export interface UsernameChangeResult {
  success: boolean;
  error?: string;
}

class UsernameService {
  /**
   * Check if a username is available and user can change it
   */
  async validateUsername(newUsername: string, currentUserId: number): Promise<UsernameValidationResult> {
    try {
      // Basic validation
      if (!newUsername || newUsername.trim().length < 3) {
        return {
          isValid: false,
          error: 'Username must be at least 3 characters',
          canChange: false,
          changesRemaining: 0
        };
      }

      if (newUsername.length > 30) {
        return {
          isValid: false,
          error: 'Username must be less than 30 characters',
          canChange: false,
          changesRemaining: 0
        };
      }

      if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
        return {
          isValid: false,
          error: 'Username can only contain letters, numbers, and underscores',
          canChange: false,
          changesRemaining: 0
        };
      }

      // Check if username already exists
      const { data: existingUser, error: existingError } = await supabase
        .from('user')
        .select('id, username')
        .eq('username', newUsername)
        .single();

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError;
      }

      if (existingUser && existingUser.id !== currentUserId) {
        return {
          isValid: false,
          error: 'Username is already taken',
          canChange: false,
          changesRemaining: 0
        };
      }

      // Check if user can change username (not exceeding 3 changes per day)
      const { data: canChangeResult, error: limitError } = await supabase
        .rpc('check_username_change_limit', { p_user_id: currentUserId });

      if (limitError) {
        throw limitError;
      }

      if (!canChangeResult) {
        // Get remaining changes count
        const { data: changes, error: changesError } = await supabase
          .from('username_changes')
          .select('id')
          .eq('user_id', currentUserId)
          .gte('changed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (changesError) {
          throw changesError;
        }

        const changesUsed = changes?.length || 0;
        const changesRemaining = Math.max(0, 3 - changesUsed);

        return {
          isValid: false,
          error: `You can only change your username 3 times per day. You have ${changesRemaining} changes remaining.`,
          canChange: false,
          changesRemaining
        };
      }

      // Get remaining changes count
      const { data: changes, error: changesError } = await supabase
        .from('username_changes')
        .select('id')
        .eq('user_id', currentUserId)
        .gte('changed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (changesError) {
        throw changesError;
      }

      const changesUsed = changes?.length || 0;
      const changesRemaining = Math.max(0, 3 - changesUsed);

      return {
        isValid: true,
        canChange: true,
        changesRemaining
      };

    } catch (error) {
      console.error('Username validation error:', error);
      return {
        isValid: false,
        error: 'Failed to validate username. Please try again.',
        canChange: false,
        changesRemaining: 0
      };
    }
  }

  /**
   * Change username with validation and logging
   */
  async changeUsername(
    userId: number, 
    oldUsername: string, 
    newUsername: string
  ): Promise<UsernameChangeResult> {
    try {
      // Validate the new username first
      const validation = await this.validateUsername(newUsername, userId);
      if (!validation.isValid || !validation.canChange) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Update the username in the user table
      const { error: updateError } = await supabase
        .from('user')
        .update({ 
          username: newUsername,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      // Log the username change
      const { error: logError } = await supabase
        .rpc('log_username_change', {
          p_user_id: userId,
          p_old_username: oldUsername,
          p_new_username: newUsername
        });

      if (logError) {
        console.error('Error logging username change:', logError);
        // Don't fail the operation if logging fails
      }

      return {
        success: true
      };

    } catch (error) {
      console.error('Username change error:', error);
      
      // Handle specific database errors
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Username is already taken'
        };
      }

      return {
        success: false,
        error: 'Failed to change username. Please try again.'
      };
    }
  }

  /**
   * Get user's username change history
   */
  async getUsernameHistory(userId: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('username_changes')
        .select('old_username, new_username, changed_at')
        .eq('user_id', userId)
        .order('changed_at', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching username history:', error);
      return [];
    }
  }

  /**
   * Get remaining username changes for today
   */
  async getRemainingChanges(userId: number): Promise<number> {
    try {
      const { data: changes, error } = await supabase
        .from('username_changes')
        .select('id')
        .eq('user_id', userId)
        .gte('changed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        throw error;
      }

      const changesUsed = changes?.length || 0;
      return Math.max(0, 3 - changesUsed);
    } catch (error) {
      console.error('Error getting remaining changes:', error);
      return 0;
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('username', username)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }
  }
}

export const usernameService = new UsernameService();