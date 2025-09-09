import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export const AuthCallbackPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Extract the access_token and refresh_token from URL parameters
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const tokenType = searchParams.get('token_type');
        const expiresIn = searchParams.get('expires_in');
        const error = searchParams.get('error');
        const errorCode = searchParams.get('error_code');
        const errorDescription = searchParams.get('error_description');

        console.log('🔗 Auth callback params:', {
          accessToken: !!accessToken,
          refreshToken: !!refreshToken,
          tokenType,
          expiresIn,
          error,
          errorCode,
          errorDescription
        });

        // Check for errors first
        if (error) {
          let errorMessage = 'Authentication failed';
          
          if (errorCode === 'otp_expired') {
            errorMessage = 'Email verification link has expired. Please request a new one.';
          } else if (errorDescription) {
            errorMessage = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
          }
          
          setError(errorMessage);
          setLoading(false);
          return;
        }

        // If we have tokens, set the session
        if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            setError(sessionError.message);
          } else {
            console.log('✅ Session established successfully', data);
            setSuccess(true);
            
            // Clear any pending verification email from session storage
            sessionStorage.removeItem('pendingVerificationEmail');
            
            // Redirect to home page after a brief success message
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 2000);
          }
        } else {
          // No tokens present, might be a different type of callback
          setError('No authentication tokens received');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('An unexpected error occurred during authentication');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Verifying your email...</h2>
          <p className="text-gray-400">Please wait while we confirm your account.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Email Verification Failed</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          
          {error.includes('expired') && (
            <div className="bg-gray-800 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-300 mb-2">
                Your verification link has expired. Please:
              </p>
              <ul className="text-sm text-gray-400 text-left space-y-1">
                <li>• Go back to the signup page</li>
                <li>• Use the "Resend verification email" option</li>
                <li>• Check your email for a new verification link</li>
              </ul>
            </div>
          )}
          
          <button
            onClick={() => navigate('/', { replace: true })}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Email Verified Successfully!</h2>
          <p className="text-gray-400 mb-4">Welcome to GameVault! Redirecting you to the homepage...</p>
          <div className="flex items-center justify-center space-x-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Redirecting...</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};