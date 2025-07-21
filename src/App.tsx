import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Get the intended redirect URL or default to dashboard/profile
        const redirectTo = searchParams.get('redirectTo') || '/profile';
        const returnTo = sessionStorage.getItem('authReturnUrl') || redirectTo;
        
        // Clear the stored return URL
        sessionStorage.removeItem('authReturnUrl');
        
        // Redirect to the intended page
        navigate(returnTo, { replace: true });
      } else {
        // If no user after callback, there was an authentication error
        const error = searchParams.get('error') || 'authentication_failed';
        navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true });
      }
    }
  }, [user, loading, navigate, searchParams]);

  // Show loading state while processing authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Completing Authentication</h2>
          <p className="text-gray-400">Please wait while we sign you in...</p>
        </div>
      </div>
    );
  }

  // Show error state if something went wrong
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center max-w-md mx-auto p-6">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Authentication Error</h2>
        <p className="text-gray-400 mb-6">
          There was a problem completing your authentication. Please try again.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
};
