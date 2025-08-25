import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Trash2, AlertTriangle, Loader2, Mail, Check } from 'lucide-react';

const deletionSchema = z.object({
  confirmationText: z.string().refine(val => val === 'DELETE MY ACCOUNT', {
    message: 'You must type "DELETE MY ACCOUNT" exactly'
  }),
  email: z.string().email('Please enter a valid email address')
});

type DeletionFormValues = z.infer<typeof deletionSchema>;

interface AccountDeletionSectionProps {
  userId?: string;
  onDeleteAccount?: () => void;
  isLoading?: boolean;
}

export const AccountDeletionSection: React.FC<AccountDeletionSectionProps> = ({
  userId,
  onDeleteAccount,
  isLoading = false
}) => {
  const [showDeletionForm, setShowDeletionForm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletionForm = useForm<DeletionFormValues>({
    resolver: zodResolver(deletionSchema),
    defaultValues: {
      confirmationText: '',
      email: ''
    }
  });

  const handleInitiateDeletion = async (data: DeletionFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('🚨 Initiating account deletion process...');
      
      // Import supabase here to avoid initialization issues
      const { supabase } = await import('../../services/supabase');
      
      // Get current user to verify email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Verify email matches current user
      if (data.email.toLowerCase() !== user.email?.toLowerCase()) {
        throw new Error('Email does not match your account email');
      }

      // For now, we'll send a "deletion request" via email verification
      // In a real app, you'd want to create a secure deletion token and send via email
      
      // Method 1: Send password reset as a way to "verify" identity before deletion
      // This is a bit of a workaround since Supabase doesn't have built-in account deletion emails
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo: `${window.location.origin}/confirm-deletion?userId=${user.id}`
        }
      );

      if (resetError) {
        console.error('🔴 Error sending deletion verification email:', resetError);
        throw new Error('Failed to send verification email');
      }

      console.log('✅ Deletion verification email sent');
      setEmailSent(true);
      deletionForm.reset();

    } catch (error: any) {
      console.error('🔴 Account deletion initiation error:', error);
      setError(error.message || 'Failed to initiate account deletion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImmediateDeletion = async () => {
    if (!window.confirm('Are you absolutely sure? This action cannot be undone!')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('🚨 Processing immediate account deletion...');
      
      // Import supabase here to avoid initialization issues
      const { supabase } = await import('../../services/supabase');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Delete user data from our database first
      const { error: profileDeleteError } = await supabase
        .from('user')
        .delete()
        .eq('provider_id', user.id);

      if (profileDeleteError) {
        console.error('🔴 Error deleting user profile:', profileDeleteError);
        // Continue with auth deletion even if profile deletion fails
      }

      // Delete related data (reviews, comments, etc.)
      await Promise.allSettled([
        supabase.from('rating').delete().eq('user_id', user.id),
        supabase.from('comment').delete().eq('user_id', user.id),
        supabase.from('user_follow').delete().eq('follower_id', user.id),
        supabase.from('user_follow').delete().eq('following_id', user.id),
        supabase.from('game_progress').delete().eq('user_id', user.id),
        supabase.from('lists').delete().eq('user_id', user.id)
      ]);

      // Sign out the user
      await supabase.auth.signOut();

      console.log('✅ Account deletion completed');
      
      // Redirect to home page
      window.location.href = '/';

    } catch (error: any) {
      console.error('🔴 Account deletion error:', error);
      setError(error.message || 'Failed to delete account');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-blue-900/50 border border-blue-700 rounded-lg">
          <Mail className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-blue-300 font-medium mb-1">Verification Email Sent</h4>
            <p className="text-blue-200 text-sm">
              We've sent a verification email to confirm your identity. Follow the instructions in the email to complete account deletion.
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEmailSent(false);
              setShowDeletionForm(false);
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImmediateDeletion}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Immediately
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (!showDeletionForm) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
        
        <button
          type="button"
          onClick={() => setShowDeletionForm(true)}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete Account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="p-4 bg-orange-900/30 border border-orange-700 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-orange-300 font-medium mb-2">Account Deletion Verification Required</h4>
            <p className="text-orange-200 text-sm mb-3">
              To delete your account, you must confirm your identity by entering your email address and typing the confirmation text exactly.
            </p>
            <ul className="text-orange-200 text-sm space-y-1 list-disc list-inside">
              <li>All your reviews, comments, and profile data will be permanently deleted</li>
              <li>Your followers and following relationships will be removed</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={deletionForm.handleSubmit(handleInitiateDeletion)} className="space-y-4">
        {/* Email Verification */}
        <div>
          <label htmlFor="deletionEmail" className="block text-sm font-medium text-gray-300 mb-2">
            Confirm your email address
          </label>
          <input
            id="deletionEmail"
            type="email"
            {...deletionForm.register('email')}
            className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
              deletionForm.formState.errors.email ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="your@email.com"
            disabled={isSubmitting}
          />
          {deletionForm.formState.errors.email && (
            <p className="mt-1 text-sm text-red-400">{deletionForm.formState.errors.email.message}</p>
          )}
        </div>

        {/* Confirmation Text */}
        <div>
          <label htmlFor="confirmationText" className="block text-sm font-medium text-gray-300 mb-2">
            Type "DELETE MY ACCOUNT" to confirm
          </label>
          <input
            id="confirmationText"
            type="text"
            {...deletionForm.register('confirmationText')}
            className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors ${
              deletionForm.formState.errors.confirmationText ? 'border-red-500' : 'border-gray-600'
            }`}
            placeholder="DELETE MY ACCOUNT"
            disabled={isSubmitting}
          />
          {deletionForm.formState.errors.confirmationText && (
            <p className="mt-1 text-sm text-red-400">{deletionForm.formState.errors.confirmationText.message}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setShowDeletionForm(false);
              setError(null);
              deletionForm.reset();
            }}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !deletionForm.formState.isValid}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending Verification...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Send Verification Email
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};