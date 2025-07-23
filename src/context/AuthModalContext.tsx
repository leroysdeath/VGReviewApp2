// src/context/AuthModalContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthModalContextType {
  isLoginModalOpen: boolean;
  isSignupModalOpen: boolean;
  openLoginModal: () => void;
  openSignupModal: () => void;
  closeModal: () => void;
  switchToLogin: () => void;
  switchToSignup: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

interface AuthModalProviderProps {
  children: ReactNode;
}

export const AuthModalProvider: React.FC<AuthModalProviderProps> = ({ children }) => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  const openLoginModal = () => {
    setIsSignupModalOpen(false);
    setIsLoginModalOpen(true);
  };

  const openSignupModal = () => {
    setIsLoginModalOpen(false);
    setIsSignupModalOpen(true);
  };

  const closeModal = () => {
    setIsLoginModalOpen(false);
    setIsSignupModalOpen(false);
  };

  const switchToLogin = () => {
    setIsSignupModalOpen(false);
    setIsLoginModalOpen(true);
  };

  const switchToSignup = () => {
    setIsLoginModalOpen(false);
    setIsSignupModalOpen(true);
  };

  const value: AuthModalContextType = {
    isLoginModalOpen,
    isSignupModalOpen,
    openLoginModal,
    openSignupModal,
    closeModal,
    switchToLogin,
    switchToSignup,
  };

  return (
    <AuthModalContext.Provider value={value}>
      {children}
    </AuthModalContext.Provider>
  );
};

export const useAuthModal = (): AuthModalContextType => {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
};
