import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the auth code from URL params
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(error);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Here you would typically:
        // 1. Send the code to your backend
        // 2. Exchange it for an access token
        // 3. Set up the user session
        
        // For now, simulate the process
        await new Promise(resolve => setTimeout(resolve, 2000));

        setStatus('success');
        setMessage('Authentication successful! Redirecting...');

        // Redirect to the intended page or home
        setTimeout(() => {
          const returnTo = sessionStorage.getItem('authReturnTo') || '/';
          sessionStorage.removeItem('authReturnTo');
          navigate(returnTo, { replace: true });
        }, 1500);

      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('Authentication failed. Please try again.');
        
        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        <div className="mb-6 flex justify-center">
          {getIcon()}
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4">
          {status === 'loading' && 'Authenticating...'}
          {status === 'success' && 'Welcome!'}
          {status === 'error' && 'Authentication Failed'}
        </h1>
        
        <p className="text-gray-300 mb-6">
          {message}
        </p>

        {status === 'loading' && (
          <div className="space-y-2">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full animate-pulse w-3/4"></div>
            </div>
            <p className="text-sm text-gray-400">Please wait...</p>
          </div>
        )}

        {status === 'error' && (
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Return to Login
          </button>
        )}
      </div>
    </div>
  );
};
