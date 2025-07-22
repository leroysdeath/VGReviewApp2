// src/context/AuthModalContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthModalContextType {
  isOpen: boolean;
  mode: 'login' | 'signup' | 'reset';
  openModal: (mode?: 'login' | 'signup' | 'reset') => void;
  closeModal: () => void;
  setMode: (mode: 'login' | 'signup' | 'reset') => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

interface AuthModalProviderProps {
  children: ReactNode;
}

export const AuthModalProvider: React.FC<AuthModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');

  const openModal = (initialMode: 'login' | 'signup' | 'reset' = 'login') => {
    setMode(initialMode);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  const value = {
    isOpen,
    mode,
    openModal,
    closeModal,
    setMode
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

// src/components/auth/AuthModal.tsx - Complete replacement
import React, { useState } from 'react';
import { X, Eye, EyeOff, Mail, Key, User, AlertCircle, Check, Loader2, Github } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthModal } from '../../context/AuthModalContext';

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
  onLoginSuccess?: () => void;
  onSignupSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLoginSuccess,
  onSignupSuccess
}) => {
  const { isOpen, mode, closeModal, setMode } = useAuthModal();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Login data:', data);
      
      // Success
      onLoginSuccess?.();
      closeModal();
    } catch (error) {
      setAuthError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle signup submission
  const handleSignup = async (data: SignupFormValues) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Signup data:', data);
      
      // Success
      onSignupSuccess?.();
      closeModal();
    } catch (error) {
      setAuthError('An error occurred during signup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset
  const handleReset = async (data: ResetFormValues) => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      // Simulate API call
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

  // Reset modal state when it closes
  React.useEffect(() => {
    if (!isOpen) {
      setShowPassword(false);
      setAuthError(null);
      setResetEmailSent(false);
      loginForm.reset();
      signupForm.reset();
      resetForm.reset();
    }
  }, [isOpen, loginForm, signupForm, resetForm]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={closeModal}
    >
      <div 
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-gray-800 rounded-xl shadow-2xl border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors z-10"
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
              {mode === 'signup' && "Create a new account to get started."}
              {mode === 'reset' && "Enter your email to reset your password."}
            </p>
          </div>

          {/* Error message */}
          {authError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{authError}</p>
            </div>
          )}

          {/* Reset email sent message */}
          {resetEmailSent && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
              <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-400">Password reset email sent! Check your inbox.</p>
            </div>
          )}

          {/* Forms */}
          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    id="login-email"
                    type="email"
                    {...loginForm.register('email')}
                    className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                      loginForm.formState.errors.email ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="your.email@example.com"
                    disabled={isLoading}
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-400">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    {...loginForm.register('password')}
                    className={`w-full pl-10 pr-10 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                      loginForm.formState.errors.password ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-400">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    {...loginForm.register('rememberMe')}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700"
                    disabled={isLoading}
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              {/* Social login */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSocialLogin('github')}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
                  disabled={isLoading}
                >
                  <Github className="h-5 w-5" />
                  GitHub
                </button>
              </div>

              {/* Switch to signup */}
              <p className="text-center text-sm text-gray-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
                  disabled={isLoading}
                >
                  Sign up
                </button>
              </p>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
              {/* Username */}
              <div>
                <label htmlFor="signup-username" className="block text-sm font-medium text-gray-300 mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    id="signup-username"
                    type="text"
                    {...signupForm.register('username')}
                    className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                      signupForm.formState.errors.username ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="johndoe"
                    disabled={isLoading}
                  />
                </div>
                {signupForm.formState.errors.username && (
                  <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.username.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    id="signup-email"
                    type="email"
                    {...signupForm.register('email')}
                    className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                      signupForm.formState.errors.email ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="your.email@example.com"
                    disabled={isLoading}
                  />
                </div>
                {signupForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    {...signupForm.register('password')}
                    className={`w-full pl-10 pr-10 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                      signupForm.formState.errors.password ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {signupForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.password.message}</p>
                )}
                
                {/* Password strength indicator */}
                {signupForm.watch('password') && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-600 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrength(signupForm.watch('password')).color}`}
                          style={{ width: `${(getPasswordStrength(signupForm.watch('password')).strength / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">
                        {getPasswordStrength(signupForm.watch('password')).label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    id="signup-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    {...signupForm.register('confirmPassword')}
                    className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                      signupForm.formState.errors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                </div>
                {signupForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Terms and conditions */}
              <div>
                <div className="flex items-start">
                  <input
                    id="agree-terms"
                    type="checkbox"
                    {...signupForm.register('agreeToTerms')}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700 mt-1"
                    disabled={isLoading}
                  />
                  <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-300">
                    I agree to the{' '}
                    <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors">
                      Privacy Policy
                    </a>
                  </label>
                </div>
                {signupForm.formState.errors.agreeToTerms && (
                  <p className="mt-1 text-sm text-red-400">{signupForm.formState.errors.agreeToTerms.message}</p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>

              {/* Switch to login */}
              <p className="text-center text-sm text-gray-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    id="reset-email"
                    type="email"
                    {...resetForm.register('email')}
                    className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                      resetForm.formState.errors.email ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="your.email@example.com"
                    disabled={isLoading}
                  />
                </div>
                {resetForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-400">{resetForm.formState.errors.email.message}</p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending reset email...
                  </>
                ) : (
                  'Send Reset Email'
                )}
              </button>

              {/* Back to login */}
              <p className="text-center text-sm text-gray-400">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
                  disabled={isLoading}
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// src/App.tsx - Complete replacement
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ResponsiveNavbar } from './components/ResponsiveNavbar';
import { ResponsiveLandingPage } from './components/ResponsiveLandingPage';
import { ReviewProvider } from './context/ReviewContext';
import { AuthModalProvider } from './context/AuthModalContext';
import { AuthModal } from './components/auth/AuthModal';
import { GamePage } from './pages/GamePage';
import { GameSearchPage } from './pages/GameSearchPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { UserPage } from './pages/UserPage';
import { UserSearchPage } from './pages/UserSearchPage';
import { LoginPage } from './pages/LoginPage';
import { ReviewFormPage } from './pages/ReviewFormPage';
import { ProfilePage } from './pages/ProfilePage';
import { IGDBTestPage } from './pages/IGDBTestPage';
import { SEOHead } from './components/SEOHead';

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthModalProvider>
          <ReviewProvider currentUserId={1}> {/* Using a dummy user ID for demo purposes */}
            <Router>
              <div className="min-h-screen bg-gray-900">
                <SEOHead />
                <ResponsiveNavbar />
                <Routes>
                  <Route path="/" element={<ResponsiveLandingPage />} />
                  <Route path="/game/:id" element={<GamePage />} />
                  
                  {/* UPDATED: Both search routes now point to SearchResultsPage */}
                  <Route path="/search" element={<SearchResultsPage />} />
                  <Route path="/search-results" element={<SearchResultsPage />} />
                  
                  {/* Keep your other existing routes */}
                  <Route path="/user/:id" element={<UserPage />} />
                  <Route path="/users" element={<UserSearchPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/review/:gameId?" element={<ReviewFormPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  {import.meta.env.DEV && <Route path="/igdb-test" element={<IGDBTestPage />} />}
                </Routes>
                
                {/* Global Auth Modal */}
                <AuthModal />
              </div>
            </Router>
          </ReviewProvider>
        </AuthModalProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;

// src/components/ResponsiveNavbar.tsx - Updated to use AuthModal context
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  Menu, 
  X, 
  Gamepad2, 
  User, 
  Bell, 
  Settings,
  LogOut,
  Home,
  Star,
  Users,
  BookOpen
} from 'lucide-react';
import { LoginModal } from './LoginModal';
import { NotificationCenter } from './NotificationCenter';
import { useAuthModal } from '../context/AuthModalContext';

export const ResponsiveNavbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { openModal } = useAuthModal();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

  const handleNotificationClick = () => {
    setIsNotificationCenterOpen(true);
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <Gamepad2 className="h-8 w-8 text-purple-400" />
            <span className="text-xl font-bold text-white hidden sm:block">GameVault</span>
            <span className="text-xl font-bold text-white sm:hidden">GV</span>
          </Link>

          {/* Desktop Search Bar */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games..."
                className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-gray-600 transition-colors"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </form>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/"
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActivePath('/') 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
            
            <Link
              to="/search"
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActivePath('/search') 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Browse</span>
            </Link>

            <Link
              to="/review"
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActivePath('/review') 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Star className="h-4 w-4" />
              <span>Review</span>
            </Link>

            <Link
              to="/users"
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActivePath('/users') 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Community</span>
            </Link>

            {/* Notification Bell */}
            <button
              onClick={handleNotificationClick}
              className="relative p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Login Button */}
            <button
              onClick={() => openModal('login')}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors font-medium"
            >
              Login
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-4 pb-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-gray-600 transition-colors"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </form>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActivePath('/') 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <Home className="h-5 w-5" />
              <span>Home</span>
            </Link>
            
            <Link
              to="/search"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActivePath('/search') 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <Search className="h-5 w-5" />
              <span>Browse Games</span>
            </Link>

            <Link
              to="/review"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActivePath('/review') 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <Star className="h-5 w-5" />
              <span>Write Review</span>
            </Link>

            <Link
              to="/users"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActivePath('/users') 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <Users className="h-5 w-5" />
              <span>Community</span>
            </Link>

            <Link
              to="/user/1"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Profile
            </Link>
            
            <button
              onClick={() => {
                openModal('login');
                setIsMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              Login
            </button>
          </div>
        </div>
      )}
      
      {/* Notification Center */}
      <NotificationCenter
        userId="user123" // This would come from auth context in a real app
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />
    </nav>
  );
};
