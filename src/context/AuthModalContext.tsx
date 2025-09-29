// src/context/AuthModalContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthModalContextType {
  isOpen: boolean;
  mode: 'login' | 'signup' | 'reset';
  openModal: (mode?: 'login' | 'signup' | 'reset') => void;
  openAuthModal: (mode?: 'login' | 'signup' | 'reset') => void; // Alias for consistency
  closeModal: () => void;
  setMode: (mode: 'login' | 'signup' | 'reset') => void;
  initialReferralCode?: string;
  setInitialReferralCode?: (code: string) => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

interface AuthModalProviderProps {
  children: ReactNode;
}

export const AuthModalProvider: React.FC<AuthModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [initialReferralCode, setInitialReferralCode] = useState<string | undefined>();

  const openModal = (initialMode: 'login' | 'signup' | 'reset' = 'login') => {
    setMode(initialMode);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    // Clear referral code when modal closes
    setInitialReferralCode(undefined);
  };

  const value = {
    isOpen,
    mode,
    openModal,
    openAuthModal: openModal, // Alias for consistency
    closeModal,
    setMode,
    initialReferralCode,
    setInitialReferralCode
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
