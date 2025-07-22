import React, { createContext, useContext, useState } from 'react';
import { AuthModal } from '../components/auth/AuthModal';

interface AuthModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  openModalWithAction: (action: string) => void;
  pendingAction: string | null;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export const AuthModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setPendingAction(null);
  };

  const openModalWithAction = (action: string) => {
    setPendingAction(action);
    setIsOpen(true);
  };

  const handleAuthSuccess = () => {
    setIsOpen(false);
    
    // Execute pending action if there was one
    if (pendingAction) {
      console.log('Executing pending action after auth:', pendingAction);
      // You can emit a custom event or use a callback system here
      // For now, we'll just clear the pending action
      setPendingAction(null);
    }
  };

  return (
    <AuthModalContext.Provider value={{
      isOpen,
      openModal,
      closeModal,
      openModalWithAction,
      pendingAction
    }}>
      {children}
      
      {/* Global Auth Modal */}
      <AuthModal
        isOpen={isOpen}
        onClose={closeModal}
        onLoginSuccess={handleAuthSuccess}
        onSignupSuccess={handleAuthSuccess}
      />
    </AuthModalContext.Provider>
  );
};

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
};

// Enhanced version with action execution
export const useAuthModalWithActions = () => {
  const { openModalWithAction, pendingAction, ...rest } = useAuthModal();
  
  const requireAuth = (action: string, callback?: () => void) => {
    const { isAuthenticated } = useAuth();
    
    if (!isAuthenticated) {
      openModalWithAction(action);
      return false;
    }
    
    // User is authenticated, execute callback immediately
    callback?.();
    return true;
  };

  return {
    ...rest,
    requireAuth,
    pendingAction,
    openModalWithAction
  };
};

// Import useAuth at the bottom to avoid circular dependency
import { useAuth } from '../hooks/useAuth';
