import { supabase } from '../utils/supabaseClient';

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  needsVerification?: boolean;
}

export interface EmailChangeResult {
  success: boolean;
  error?: string;
  needsVerification?: boolean;
}

class EmailService {
  /**
   * Validates if an email address is unique in the database
   */
  async validateEmailUniqueness(email: string, currentUserId: number): Promise<EmailValidationResult> {
    try {
      // Check if email already exists for a different user
      const { data: existingUser, error } = await supabase
        .from('user')
        .select('id')
        .eq('email', email.toLowerCase())
        .neq('id', currentUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is what we want
        throw error;
      }

      if (existingUser) {
        return {
          isValid: false,
          error: 'This email address is already in use by another account'
        };
      }

      return {
        isValid: true
      };
    } catch (error) {
      console.error('Error validating email uniqueness:', error);
      return {
        isValid: false,
        error: 'Error validating email address'
      };
    }
  }

  /**
   * Validates email format and database constraints
   */
  async validateEmail(email: string, currentUserId: number): Promise<EmailValidationResult> {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        error: 'Please enter a valid email address'
      };
    }

    // Check database uniqueness
    return this.validateEmailUniqueness(email, currentUserId);
  }

  /**
   * Changes user's email address with verification
   */
  async changeEmail(userId: number, newEmail: string): Promise<EmailChangeResult> {
    try {
      // First validate the new email
      const validation = await this.validateEmail(newEmail, userId);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Get the current user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return {
          success: false,
          error: 'Authentication error'
        };
      }

      // Update email through Supabase Auth (this will send verification email)
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail.toLowerCase()
      });

      if (updateError) {
        return {
          success: false,
          error: updateError.message
        };
      }

      // Update the email in our user table (this will be confirmed after verification)
      const { error: dbError } = await supabase
        .from('user')
        .update({ 
          email: newEmail.toLowerCase(),
          email_verified: false, // Mark as unverified until confirmed
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (dbError) {
        console.error('Error updating user email in database:', dbError);
        return {
          success: false,
          error: 'Failed to update email in database'
        };
      }

      return {
        success: true,
        needsVerification: true
      };
    } catch (error) {
      console.error('Error changing email:', error);
      return {
        success: false,
        error: 'Failed to change email address'
      };
    }
  }

  /**
   * Resends email verification
   */
  async resendEmailVerification(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: '', // Will use the current user's email
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error resending verification email:', error);
      return {
        success: false,
        error: 'Failed to resend verification email'
      };
    }
  }

  /**
   * Gets current user's email verification status
   */
  async getEmailVerificationStatus(userId: number): Promise<{
    isVerified: boolean;
    email: string;
    error?: string;
  }> {
    try {
      const { data: userData, error } = await supabase
        .from('user')
        .select('email, email_verified')
        .eq('id', userId)
        .single();

      if (error) {
        return {
          isVerified: false,
          email: '',
          error: 'Failed to get email verification status'
        };
      }

      return {
        isVerified: userData.email_verified || false,
        email: userData.email || ''
      };
    } catch (error) {
      console.error('Error getting email verification status:', error);
      return {
        isVerified: false,
        email: '',
        error: 'Failed to get email verification status'
      };
    }
  }
}

export const emailService = new EmailService();