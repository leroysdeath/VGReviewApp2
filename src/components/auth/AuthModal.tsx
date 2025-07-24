import React, { useState } from 'react';
import { X, Eye, EyeOff, Mail, Key, User, AlertCircle, Check, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../hooks/useAuth';

// Form validation schemas
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional()
});

const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the terms and conditions' })
  })
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

const resetSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;
type ResetFormValues = z.infer<typeof resetSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  onSignupSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onSignupSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Use the actual auth hook
  const { signUp, signIn } = useAuth();

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  // Signup form
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false
    }
  });

  // Reset password form
  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: ''
    }
  });

  // Handle login submission
  const handleLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const result = await signIn(data.email, data.password);
      
      if (result.error) {
        setAuthError(result.error.message || 'Invalid email or password. Please try again.');
      } else {
        // Success
        onLoginSuccess?.();
        onClose();
      }
    } catch (error) {
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle signup submission
  const handleSignup = async (data: SignupFormValues) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const result = await signUp(data.email, data.password, data.username);
      
      if (result.error) {
        setAuthError(result.error.message || 'An error occurred during signup. Please try again.');
      } else {
        // Success
        onSignupSuccess?.();
        onClose();
      }
    } catch (error) {
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset
  const handleReset = async (data: ResetFormValues) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      // You'll need to add resetPassword to your authService
      // const result = await authService.resetPassword(data.email);
      
      // For now, simulate the reset (replace with actual implementation)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Reset password for:', data.email);
      
      // Show success message
      setResetEmailSent(true);
    } catch (error) {
      setAuthError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: 'None', color: 'bg-gray-600' };
    
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['bg-red-600', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'];
    
    return {
      strength,
      label: labels[strength - 1] || 'None',
      color: colors[strength - 1] || 'bg-gray-600'
    };
  };

  // Social login handlers
  const handleSocialLogin = (provider: string) => {
    console.log(`Login with ${provider}`);
    // Implement social login logic here
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-gray-800 rounded-xl shadow-2xl border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              {mode === 'login' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'reset' && 'Reset Password'}
            </h2>
            <p className="text-gray-400 mt-2">
              {mode === 'login' && "Welcome back! Please sign in to your account."}
              {mode === 'signup' && "Join our gaming community today."}
              {mode === 'reset' && "Enter your email to reset your password."}
            </p>
          </div>

          {/* Error message */}
          {authError && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{authError}</p>
            </div>
          )}

          {/* Reset email sent message */}
          {resetEmailSent && mode === 'reset' && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-500/50 rounded-lg flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-400">
                Password reset link sent to your email!
              </p>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    id="login-email"
                    type="email"
                    {...loginForm.register('email')}
                    className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
