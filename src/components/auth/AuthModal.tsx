// src/components/auth/AuthModal.tsx - COMPLETE REPLACEMENT
import React, { useState, useEffect, useCallback } from 'react';
import { X, Eye, EyeOff, Mail, Key, User, AlertCircle, Check, Loader2, Gamepad2, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../hooks/useAuth';
import { useAuthModal } from '../../context/AuthModalContext';
import { LegalModal } from '../LegalModal';
import { supabase } from '../../services/supabase';
import { authService } from '../../services/authService';

// Form validation schemas
const loginSchema = z.object({
  email: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional()
});

const signupSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(21, 'Username must be 21 characters or less')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .transform(val => val.toLowerCase()),
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
  onLoginSuccess?: () => void;
  onSignupSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLoginSuccess,
  onSignupSuccess
}) => {
  const { signIn, signUp, resetPassword } = useAuth();
  const { isOpen, mode, closeModal, setMode } = useAuthModal();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy'>('terms');
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null);

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

  // Check username availability with debounce
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const { available } = await authService.checkUsernameAvailability(username);
      setUsernameAvailable(available);
    } catch (error) {
      console.error('Username check failed:', error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  // Debounced username check effect
  useEffect(() => {
    const username = signupForm.watch('username');
    
    if (usernameCheckTimeout) {
      clearTimeout(usernameCheckTimeout);
    }

    if (username && username.length >= 3) {
      const timeout = setTimeout(() => {
        checkUsernameAvailability(username);
      }, 500); // 500ms debounce
      setUsernameCheckTimeout(timeout);
    } else {
      setUsernameAvailable(null);
    }

    return () => {
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout);
      }
    };
  }, [signupForm.watch('username')]);

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
        setAuthError(result.error.message || 'Login failed. Please try again.');
      } else {
        onLoginSuccess?.();
        closeModal();
      }
    } catch {
      setAuthError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle signup submission
  const handleSignup = async (data: SignupFormValues) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      // Store email in session storage for personalization
      sessionStorage.setItem('pendingVerificationEmail', data.email);
      
      const result = await signUp(data.email, data.password, data.username);
      if (result.error) {
        setAuthError(result.error.message || 'Signup failed. Please try again.');
        sessionStorage.removeItem('pendingVerificationEmail');
      } else {
        // Show email verification screen instead of switching to login
        setVerificationEmail(data.email);
        setShowEmailVerification(true);
        setAuthError(null);
        onSignupSuccess?.();
      }
    } catch {
      setAuthError('Signup failed. Please try again.');
      sessionStorage.removeItem('pendingVerificationEmail');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset
  const handleReset = async (data: ResetFormValues) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const result = await resetPassword(data.email);
      if (result.error) {
        setAuthError(result.error.message || 'Failed to send reset email. Please try again.');
      } else {
        setResetEmailSent(true);
      }
    } catch {
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
      label: labels[Math.min(strength - 1, 4)] || 'None',
      color: colors[Math.min(strength - 1, 4)] || 'bg-gray-600'
    };
  };

  // Reset modal state when mode changes
  const switchMode = (newMode: 'login' | 'signup' | 'reset') => {
    setMode(newMode);
    setAuthError(null);
    setResetEmailSent(false);
    setShowEmailVerification(false);
    setVerificationEmail('');
    loginForm.reset();
    signupForm.reset();
    resetForm.reset();
  };

  // Handle email verification resend
  const handleResendVerification = async () => {
    if (!verificationEmail) return;
    
    setIsLoading(true);
    setAuthError(null);
    
    try {
      // Use Supabase resend method for signup confirmation
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail
      });
      
      if (error) {
        setAuthError(error.message || 'Failed to resend verification email.');
      } else {
        // Show success message briefly
        setAuthError('Verification email resent! Please check your inbox.');
        setTimeout(() => setAuthError(null), 3000);
      }
    } catch {
      setAuthError('Failed to resend verification email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-close modal when user verifies email
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at && showEmailVerification) {
        setShowEmailVerification(false);
        closeModal();
        // Could add toast notification here if you have toast system
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [showEmailVerification, closeModal]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-gray-800 rounded-xl shadow-2xl border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors z-10"
          aria-label="Close"
          disabled={isLoading}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Gamepad2 className="h-8 w-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">GameVault</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              {mode === 'login' && 'Sign in to your account'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'reset' && 'Reset your password'}
            </h2>
            <p className="text-gray-400 mt-2">
              {mode === 'login' && "Don't have an account? "}
              {mode === 'signup' && "Already have an account? "}
              {mode === 'reset' && "Remember your password? "}
              {mode !== 'reset' && (
                <button
                  onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                  className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
                  disabled={isLoading}
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              )}
              {mode === 'reset' && (
                <button
                  onClick={() => switchMode('login')}
                  className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              )}
            </p>
          </div>

          {/* Error Message */}
          {authError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-200 text-sm">{authError}</p>
            </div>
          )}

          {/* Reset Email Sent Message */}
          {resetEmailSent && mode === 'reset' && (
            <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg flex items-start space-x-2">
              <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-green-200 text-sm">
                Password reset email sent! Check your inbox for instructions.
              </p>
            </div>
          )}

          {/* Email Verification Success Screen */}
          {showEmailVerification && (
            <div className="text-center p-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-white">Check Your Email!</h2>
              <p className="text-gray-400 mb-4">
                We've sent a verification link to <strong className="text-white">{verificationEmail}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Please check your inbox and click the link to verify your account. Don't forget to check your spam folder!
              </p>
              
              {/* Resend functionality */}
              <div className="space-y-4">
                <button 
                  onClick={handleResendVerification}
                  disabled={isLoading}
                  className="text-purple-400 hover:text-purple-300 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Resending...' : 'Resend verification email'}
                </button>
                
                <div className="pt-4 border-t border-gray-700">
                  <button 
                    onClick={closeModal}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Got it!
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && !showEmailVerification && (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Username or Email
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  You can sign in with either your username or email address
                </p>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    {...loginForm.register('email')}
                    type="text"
                    id="email"
                    autoComplete="username email"
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Username or email"
                    disabled={isLoading}
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-400">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    {...loginForm.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-400">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    {...loginForm.register('rememberMe')}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-sm text-gray-300">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-sm text-purple-400 hover:text-purple-300"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          )}

          {/* Signup Form */}
          {mode === 'signup' && !showEmailVerification && (
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Automatically converted to lowercase • 3-21 characters
                </p>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    {...signupForm.register('username', {
                      onChange: (e) => {
                        e.target.value = e.target.value.toLowerCase();
                      }
                    })}
                    type="text"
                    id="username"
                    className={`w-full pl-10 pr-20 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${
                      usernameAvailable === false ? 'border-red-500 focus:ring-red-500' : 
                      usernameAvailable === true ? 'border-green-500 focus:ring-green-500' : 
                      'border-gray-600 focus:ring-blue-500'
                    }`}
                    placeholder="Choose a username"
                    disabled={isLoading}
                    maxLength={21}
                  />
                  <div className="absolute right-3 top-3 flex items-center gap-2">
                    {checkingUsername && (
                      <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                    )}
                    {!checkingUsername && usernameAvailable === true && (
                      <Check className="h-4 w-4 text-green-400" />
                    )}
                    {!checkingUsername && usernameAvailable === false && (
                      <X className="h-4 w-4 text-red-400" />
                    )}
                    <span className="text-xs text-gray-500">
                      {signupForm.watch('username')?.length || 0}/21
                    </span>
                  </div>
                </div>
                {usernameAvailable === false && !checkingUsername && (
                  <p className="mt-1 text-sm text-red-400">This username is already taken</p>
                )}
                {signupForm.formState.errors.username && (
                  <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.username.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    {...signupForm.register('email')}
                    type="email"
                    id="signup-email"
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                    disabled={isLoading}
                  />
                </div>
                {signupForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    {...signupForm.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    id="signup-password"
                    className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Create a password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {signupForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.password.message}</p>
                )}

                {/* Password Strength Indicator */}
                {signupForm.watch('password') && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            getPasswordStrength(signupForm.watch('password')).color
                          }`}
                          style={{
                            width: `${(getPasswordStrength(signupForm.watch('password')).strength / 5) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">
                        {getPasswordStrength(signupForm.watch('password')).label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    {...signupForm.register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    className="w-full pl-10 pr-10 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {signupForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <div>
                <label className="flex items-start space-x-2">
                  <input
                    {...signupForm.register('agreeToTerms')}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-300">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setLegalModalType('terms');
                        setShowLegalModal(true);
                      }}
                      className="text-purple-400 hover:text-purple-300 underline"
                      disabled={isLoading}
                    >
                      Terms of Service
                    </button>
                    {' '}and{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setLegalModalType('privacy');
                        setShowLegalModal(true);
                      }}
                      className="text-purple-400 hover:text-purple-300 underline"
                      disabled={isLoading}
                    >
                      Privacy Policy
                    </button>
                  </span>
                </label>
                {signupForm.formState.errors.agreeToTerms && (
                  <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.agreeToTerms.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}

          {/* Reset Password Form */}
          {mode === 'reset' && !resetEmailSent && !showEmailVerification && (
            <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    {...resetForm.register('email')}
                    type="email"
                    id="reset-email"
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email address"
                    disabled={isLoading}
                  />
                </div>
                {resetForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-400">{resetForm.formState.errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Sending Reset Email...
                  </>
                ) : (
                  'Send Reset Email'
                )}
              </button>
            </form>
          )}

          {/* Mode Switch Links */}
          {!showEmailVerification && (
            <div className="mt-6 text-center text-sm">
              {mode === 'login' && (
              <p className="text-gray-400">
                Don't have an account?{' '}
                <button
                  onClick={() => switchMode('signup')}
                  className="text-purple-400 hover:text-purple-300 font-medium"
                  disabled={isLoading}
                >
                  Sign up
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p className="text-gray-400">
                Already have an account?{' '}
                <button
                  onClick={() => switchMode('login')}
                  className="text-purple-400 hover:text-purple-300 font-medium"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === 'reset' && (
              <p className="text-gray-400">
                Remember your password?{' '}
                <button
                  onClick={() => switchMode('login')}
                  className="text-purple-400 hover:text-purple-300 font-medium"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Legal Modal */}
      <LegalModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        type={legalModalType}
      />
    </div>
  );
};
