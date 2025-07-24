import React, { useState, useEffect } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'reset';
  onLoginSuccess?: () => void;
  onSignupSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onLoginSuccess,
  onSignupSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  
  // Add useEffect to sync mode with initialMode prop
  useEffect(() => {
    if (isOpen && initialMode) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);
  
  // Add the rest of your modal implementation here
  // This is a placeholder for the rest of the component logic
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        {/* Add your modal content here based on the mode */}
        <h2 className="text-2xl font-bold text-white mb-4">
          {mode === 'login' && 'Login'}
          {mode === 'signup' && 'Sign Up'}
          {mode === 'reset' && 'Reset Password'}
        </h2>
        
        {/* Add form content here */}
        
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  );
};
