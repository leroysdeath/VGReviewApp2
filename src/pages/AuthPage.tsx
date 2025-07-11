import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginModal } from '../components/LoginModal';
import { useAuth } from '../components/AuthProvider';
import { Gamepad2 } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the return URL from location state or default to home
  const from = location.state?.from?.pathname || '/';
  
  // If already authenticated, redirect to the return URL
  if (isAuthenticated && !isLoading) {
    navigate(from, { replace: true });
    return null;
  }
  
  // Handle login success
  const handleLoginSuccess = () => {
    navigate(from, { replace: true });
  };
  
  // Handle modal close
  const handleModalClose = () => {
    setIsLoginModalOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Sign In | GameVault</title>
        <meta name="description" content="Sign in to your GameVault account" />
      </Helmet>
      
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-2 mb-6">
          <Gamepad2 className="h-12 w-12 text-purple-400" />
          <span className="text-3xl font-bold text-white">GameVault</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Welcome to GameVault</h1>
        <p className="text-gray-400 max-w-md mx-auto">
          The ultimate platform for gamers to discover, review, and track their gaming experiences
        </p>
      </div>
      
      <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Join Our Gaming Community</h2>
            <p className="text-gray-400">
              Sign in to access your profile, track your games, and connect with other gamers
            </p>
          </div>
          
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
            >
              Sign In / Create Account
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="w-full flex justify-center py-3 px-4 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-white bg-transparent hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Continue as Guest
            </button>
          </div>
          
          <div className="text-center text-sm text-gray-400">
            <p>
              By signing in, you agree to our{' '}
              <a href="/terms" className="text-purple-400 hover:text-purple-300">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-purple-400 hover:text-purple-300">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
      
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={handleModalClose}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};