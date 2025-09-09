import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthModal } from './AuthModal';
import { useAuth } from '../../hooks/useAuth';
import { useAuthModal } from '../../context/AuthModalContext';
import { supabase } from '../../services/supabase';

// Mock the hooks and services
jest.mock('../../hooks/useAuth');
jest.mock('../../context/AuthModalContext');
jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      resend: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    }
  }
}));

// Mock the LegalModal component
jest.mock('../LegalModal', () => ({
  LegalModal: ({ isOpen, onClose, type }: any) => 
    isOpen ? <div data-testid="legal-modal">{type} modal</div> : null
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseAuthModal = useAuthModal as jest.MockedFunction<typeof useAuthModal>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('AuthModal - Signup Flow', () => {
  const mockSignUp = jest.fn();
  const mockSignIn = jest.fn();
  const mockResetPassword = jest.fn();
  const mockCloseModal = jest.fn();
  const mockSetMode = jest.fn();

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Clear sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    // Mock useAuth
    mockUseAuth.mockReturnValue({
      signUp: mockSignUp,
      signIn: mockSignIn,
      resetPassword: mockResetPassword,
      user: null,
      loading: false,
      signOut: jest.fn(),
      updateProfile: jest.fn()
    });

    // Mock useAuthModal
    mockUseAuthModal.mockReturnValue({
      isOpen: true,
      mode: 'signup',
      closeModal: mockCloseModal,
      setMode: mockSetMode,
      openModal: jest.fn()
    });
  });

  describe('Email Verification Success Screen', () => {
    it('should show email verification screen after successful signup', async () => {
      const user = userEvent.setup();
      
      // Mock successful signup
      mockSignUp.mockResolvedValue({ user: { id: '123', email: 'test@example.com' }, error: null });

      render(<AuthModal />);

      // Fill out signup form
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /agree to the terms/i }));

      // Submit form
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Wait for verification screen
      await waitFor(() => {
        expect(screen.getByText('Check Your Email!')).toBeInTheDocument();
      });

      // Check that email is personalized
      expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    });

    it('should store email in sessionStorage during signup', async () => {
      const user = userEvent.setup();
      
      mockSignUp.mockResolvedValue({ user: { id: '123', email: 'test@example.com' }, error: null });

      render(<AuthModal />);

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /agree to the terms/i }));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
          'pendingVerificationEmail', 
          'test@example.com'
        );
      });
    });

    it('should remove sessionStorage email on signup error', async () => {
      const user = userEvent.setup();
      
      mockSignUp.mockResolvedValue({ 
        user: null, 
        error: { message: 'Email already exists' } 
      });

      render(<AuthModal />);

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /agree to the terms/i }));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('pendingVerificationEmail');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during account creation', async () => {
      const user = userEvent.setup();
      
      // Mock signup that takes time
      let resolveSignup: (value: any) => void;
      const signupPromise = new Promise(resolve => {
        resolveSignup = resolve;
      });
      mockSignUp.mockReturnValue(signupPromise);

      render(<AuthModal />);

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /agree to the terms/i }));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Check loading state
      expect(screen.getByText('Creating Account...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();

      // Resolve the signup
      resolveSignup!({ user: { id: '123' }, error: null });
    });

    it('should disable form fields during loading', async () => {
      const user = userEvent.setup();
      
      let resolveSignup: (value: any) => void;
      const signupPromise = new Promise(resolve => {
        resolveSignup = resolve;
      });
      mockSignUp.mockReturnValue(signupPromise);

      render(<AuthModal />);

      // Fill form first
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /agree to the terms/i }));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Check that fields are disabled
      expect(screen.getByLabelText(/username/i)).toBeDisabled();
      expect(screen.getByLabelText(/email address/i)).toBeDisabled();

      resolveSignup!({ user: { id: '123' }, error: null });
    });
  });

  describe('Resend Functionality', () => {
    it('should show resend button in verification screen', async () => {
      const user = userEvent.setup();
      
      mockSignUp.mockResolvedValue({ user: { id: '123' }, error: null });

      render(<AuthModal />);

      // Complete signup flow
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /agree to the terms/i }));
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Resend verification email')).toBeInTheDocument();
      });
    });

    it('should call resend API when resend button is clicked', async () => {
      const user = userEvent.setup();
      
      mockSignUp.mockResolvedValue({ user: { id: '123' }, error: null });
      mockSupabase.auth.resend.mockResolvedValue({ error: null });

      render(<AuthModal />);

      // Complete signup flow
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /agree to the terms/i }));
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Resend verification email')).toBeInTheDocument();
      });

      // Click resend
      await user.click(screen.getByText('Resend verification email'));

      await waitFor(() => {
        expect(mockSupabase.auth.resend).toHaveBeenCalledWith({
          type: 'signup',
          email: 'test@example.com'
        });
      });
    });

    it('should show loading state during resend', async () => {
      const user = userEvent.setup();
      
      mockSignUp.mockResolvedValue({ user: { id: '123' }, error: null });
      
      // Mock resend that takes time
      let resolveResend: (value: any) => void;
      const resendPromise = new Promise(resolve => {
        resolveResend = resolve;
      });
      mockSupabase.auth.resend.mockReturnValue(resendPromise);

      render(<AuthModal />);

      // Complete signup flow
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /agree to the terms/i }));
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Resend verification email')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Resend verification email'));

      expect(screen.getByText('Resending...')).toBeInTheDocument();

      resolveResend!({ error: null });
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      const user = userEvent.setup();

      render(<AuthModal />);

      // Try to submit empty form
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate password requirements', async () => {
      const user = userEvent.setup();

      render(<AuthModal />);

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'weak');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate password confirmation', async () => {
      const user = userEvent.setup();

      render(<AuthModal />);

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPassword123!');

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });
  });

  describe('Modal Control', () => {
    it('should close modal when "Got it!" button is clicked', async () => {
      const user = userEvent.setup();
      
      mockSignUp.mockResolvedValue({ user: { id: '123' }, error: null });

      render(<AuthModal />);

      // Complete signup flow
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /agree to the terms/i }));
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Got it!')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Got it!'));

      expect(mockCloseModal).toHaveBeenCalled();
    });

    it('should not show forms when in email verification mode', async () => {
      const user = userEvent.setup();
      
      mockSignUp.mockResolvedValue({ user: { id: '123' }, error: null });

      render(<AuthModal />);

      // Complete signup
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /agree to the terms/i }));
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Check Your Email!')).toBeInTheDocument();
      });

      // Form fields should not be visible
      expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display signup errors', async () => {
      const user = userEvent.setup();
      
      mockSignUp.mockResolvedValue({ 
        user: null, 
        error: { message: 'Email already registered' } 
      });

      render(<AuthModal />);

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /agree to the terms/i }));

      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument();
      });
    });

    it('should display resend errors', async () => {
      const user = userEvent.setup();
      
      mockSignUp.mockResolvedValue({ user: { id: '123' }, error: null });
      mockSupabase.auth.resend.mockResolvedValue({ 
        error: { message: 'Rate limit exceeded' } 
      });

      render(<AuthModal />);

      // Complete signup
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'Password123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
      await user.click(screen.getByRole('checkbox', { name: /agree to the terms/i }));
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Resend verification email')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Resend verification email'));

      await waitFor(() => {
        expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
      });
    });
  });
});