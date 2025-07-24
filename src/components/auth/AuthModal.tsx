// Update for src/components/auth/AuthModal.tsx
// Add this to the interface definition:

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'reset';
  onLoginSuccess?: () => void;
  onSignupSuccess?: () => void;
}

// Update the component to use initialMode:
export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onLoginSuccess,
  onSignupSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  // ... rest of the component remains the same
  
  // Add useEffect to sync mode with initialMode prop
  useEffect(() => {
    if (isOpen && initialMode) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);
  
  // ... rest of the component code
}
