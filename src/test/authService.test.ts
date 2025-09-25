import { authService } from '../services/authService';
import type { User } from '@supabase/supabase-js';

// Mock Supabase
const mockSupabase = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
    updateUser: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    signInWithOAuth: jest.fn(),
    onAuthStateChange: jest.fn()
  },
  from: jest.fn()
};

jest.mock('../services/supabase', () => ({
  supabase: mockSupabase
}));

jest.mock('../services/userService', () => ({
  userService: {
    getOrCreateDatabaseUser: jest.fn()
  }
}));

// Mock user service
const { userService } = require('../services/userService');

// Mock window.location for redirect URL tests
delete (global as any).window.location;
(global as any).window = Object.create(window);
(global as any).window.location = {
  origin: 'http://localhost:3000',
  href: 'http://localhost:3000'
};

describe('AuthService', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      username: 'testuser',
      name: 'Test User'
    },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z'
  };

  const mockSession = {
    user: mockUser,
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default successful responses
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null
    });
    
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null
    });
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
    
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null
    });
    
    userService.getOrCreateDatabaseUser.mockResolvedValue({
      success: true,
      userId: 1
    });
  });

  describe('User Registration (signUp)', () => {
    test('should successfully register a new user', async () => {
      const email = 'newuser@example.com';
      const password = 'SecurePass123!';
      const username = 'newuser';

      const result = await authService.signUp(email, password, username);

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email,
        password,
        options: {
          data: {
            username,
            name: username
          },
          emailRedirectTo: 'http://localhost:3000/auth/callback'
        }
      });

      expect(result.user).toBe(mockUser);
      expect(result.error).toBeNull();
      expect(userService.getOrCreateDatabaseUser).toHaveBeenCalledWith(mockUser);
    });

    test('should handle registration errors', async () => {
      const registrationError = { message: 'Email already exists' };
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: registrationError
      });

      const result = await authService.signUp('existing@example.com', 'password', 'username');

      expect(result.user).toBeNull();
      expect(result.error).toBe(registrationError);
      expect(userService.getOrCreateDatabaseUser).not.toHaveBeenCalled();
    });

    test('should generate correct redirect URL for different environments', async () => {
      // Test localhost environment
      const result1 = await authService.signUp('test@example.com', 'password', 'testuser');
      
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            emailRedirectTo: 'http://localhost:3000/auth/callback'
          })
        })
      );

      // Test production environment
      (global as any).window.location.origin = 'https://myapp.com';

      jest.clearAllMocks();
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      await authService.signUp('test2@example.com', 'password', 'testuser2');
      
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            emailRedirectTo: 'https://myapp.com/auth/callback'
          })
        })
      );
    });

    test('should handle database user creation failure gracefully', async () => {
      userService.getOrCreateDatabaseUser.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const result = await authService.signUp('test@example.com', 'password', 'testuser');

      // Auth should still succeed even if database user creation fails
      expect(result.user).toBe(mockUser);
      expect(result.error).toBeNull();
    });

    test('should handle exceptions during registration', async () => {
      mockSupabase.auth.signUp.mockRejectedValue(new Error('Network error'));

      const result = await authService.signUp('test@example.com', 'password', 'testuser');

      expect(result.user).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('User Authentication (signIn)', () => {
    test('should successfully authenticate user with valid credentials', async () => {
      const email = 'user@example.com';
      const password = 'ValidPass123!';

      const result = await authService.signIn(email, password);

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email,
        password
      });

      expect(result.user).toBe(mockUser);
      expect(result.error).toBeNull();
    });

    test('should handle invalid credentials', async () => {
      const authError = { message: 'Invalid email or password' };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: authError
      });

      const result = await authService.signIn('wrong@example.com', 'wrongpassword');

      expect(result.user).toBeNull();
      expect(result.error).toBe(authError);
    });

    test('should handle network errors during sign in', async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValue(new Error('Connection timeout'));

      const result = await authService.signIn('user@example.com', 'password');

      expect(result.user).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('User Session Management', () => {
    test('should successfully sign out user', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const result = await authService.signOut();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });

    test('should handle sign out errors', async () => {
      const signOutError = { message: 'Failed to sign out' };
      mockSupabase.auth.signOut.mockResolvedValue({ error: signOutError });

      const result = await authService.signOut();

      expect(result.error).toBe(signOutError);
    });

    test('should get current user successfully', async () => {
      const user = await authService.getCurrentUser();

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(user).toBe(mockUser);
    });

    test('should handle getCurrentUser errors', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Auth error'));

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
    });

    test('should get current session successfully', async () => {
      const session = await authService.getCurrentSession();

      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      expect(session).toBe(mockSession);
    });

    test('should handle getCurrentSession errors', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Session error'));

      const session = await authService.getCurrentSession();

      expect(session).toBeNull();
    });
  });

  describe('Password Management', () => {
    test('should send password reset email successfully', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

      const result = await authService.resetPassword('user@example.com');

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'user@example.com',
        { redirectTo: 'http://localhost:3000/reset-password' }
      );
      expect(result.error).toBeNull();
    });

    test('should send password reset with custom redirect URL', async () => {
      const customUrl = 'https://myapp.com/custom-reset';
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

      await authService.resetPassword('user@example.com', customUrl);

      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'user@example.com',
        { redirectTo: customUrl }
      );
    });

    test('should handle password reset errors', async () => {
      const resetError = { message: 'Email not found' };
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: resetError });

      const result = await authService.resetPassword('nonexistent@example.com');

      expect(result.error).toBe(resetError);
    });

    test('should update password successfully', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

      const result = await authService.updatePassword('NewSecurePass123!');

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'NewSecurePass123!'
      });
      expect(result.error).toBeNull();
    });

    test('should handle password update errors', async () => {
      const updateError = { message: 'Password too weak' };
      mockSupabase.auth.updateUser.mockResolvedValue({ error: updateError });

      const result = await authService.updatePassword('weak');

      expect(result.error).toBe(updateError);
    });
  });

  describe('OAuth Authentication', () => {
    const supportedProviders = ['google', 'github', 'discord'] as const;

    supportedProviders.forEach(provider => {
      test(`should initiate ${provider} OAuth flow`, async () => {
        mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: null });

        const result = await authService.signInWithProvider(provider);

        expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider,
          options: {
            redirectTo: 'http://localhost:3000/auth/callback'
          }
        });
        expect(result.error).toBeNull();
      });
    });

    test('should handle OAuth errors', async () => {
      const oauthError = { message: 'OAuth provider unavailable' };
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({ error: oauthError });

      const result = await authService.signInWithProvider('google');

      expect(result.error).toBe(oauthError);
    });
  });

  describe('Profile Updates', () => {
    test('should update user profile successfully', async () => {
      const updates = { username: 'newusername', avatar: 'https://example.com/avatar.jpg' };
      
      mockSupabase.auth.updateUser.mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      });

      const result = await authService.updateProfile(updates);

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        data: {
          username: 'newusername',
          avatar_url: 'https://example.com/avatar.jpg',
          name: 'newusername'
        }
      });

      expect(result.error).toBeNull();
    });

    test('should handle profile update when no user is found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await authService.updateProfile({ username: 'test' });

      expect(result.error).toBe('No user found');
      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
    });

    test('should handle auth metadata update errors', async () => {
      const authError = { message: 'Failed to update metadata' };
      mockSupabase.auth.updateUser.mockResolvedValue({ error: authError });

      const result = await authService.updateProfile({ username: 'test' });

      expect(result.error).toBe(authError);
    });
  });

  describe('Username Availability', () => {
    test('should check username availability successfully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 0, error: null })
        })
      });

      const result = await authService.checkUsernameAvailability('availableuser');

      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should detect unavailable username', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 1, error: null })
        })
      });

      const result = await authService.checkUsernameAvailability('takenuser');

      expect(result.available).toBe(false);
    });

    test('should reject usernames that are too short', async () => {
      const result = await authService.checkUsernameAvailability('ab');

      expect(result.available).toBe(false);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    test('should handle database errors during username check', async () => {
      const dbError = { message: 'Database connection failed' };
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: null, error: dbError })
        })
      });

      const result = await authService.checkUsernameAvailability('testuser');

      expect(result.available).toBe(false);
      expect(result.error).toBe(dbError);
    });
  });

  describe('Auth State Changes', () => {
    test('should set up auth state change listener', () => {
      const callback = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } }
      });

      const subscription = authService.onAuthStateChange(callback);

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledWith(callback);
      expect(subscription).toBeDefined();
    });
  });

  describe('Account Management', () => {
    test('should delete user account successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      });
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const result = await authService.deleteAccount();

      expect(mockSupabase.from).toHaveBeenCalledWith('user');
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });

    test('should handle delete account when no user is found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await authService.deleteAccount();

      expect(result.error).toBe('No user found');
    });
  });

  describe('Error Boundary and Edge Cases', () => {
    test('should handle null/undefined email gracefully', async () => {
      const result = await authService.signUp('', 'password', 'username');
      
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: ''
        })
      );
    });

    test('should handle empty username gracefully', async () => {
      const result = await authService.signUp('test@example.com', 'password', '');
      
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: expect.objectContaining({
              username: '',
              name: ''
            })
          })
        })
      );
    });

    test('should handle network failures gracefully across all methods', async () => {
      const networkError = new Error('Network request failed');
      
      // Test all async methods handle network errors
      mockSupabase.auth.signUp.mockRejectedValue(networkError);
      mockSupabase.auth.signInWithPassword.mockRejectedValue(networkError);
      mockSupabase.auth.resetPasswordForEmail.mockRejectedValue(networkError);
      
      const signUpResult = await authService.signUp('test@example.com', 'pass', 'user');
      const signInResult = await authService.signIn('test@example.com', 'pass');
      const resetResult = await authService.resetPassword('test@example.com');
      
      expect(signUpResult.error).toBeInstanceOf(Error);
      expect(signInResult.error).toBeInstanceOf(Error);
      expect(resetResult.error).toBeInstanceOf(Error);
    });
  });

  describe('Environment-Specific Behavior', () => {
    test('should adapt redirect URLs based on environment', async () => {
      const environments = [
        { origin: 'http://localhost:3000', expected: 'http://localhost:3000/auth/callback' },
        { origin: 'http://127.0.0.1:3000', expected: 'http://127.0.0.1:3000/auth/callback' },
        { origin: 'https://myapp.netlify.app', expected: 'https://myapp.netlify.app/auth/callback' },
        { origin: 'https://production.com', expected: 'https://production.com/auth/callback' }
      ];

      for (const env of environments) {
        (global as any).window.location.origin = env.origin;

        jest.clearAllMocks();
        mockSupabase.auth.signUp.mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null
        });

        await authService.signUp('test@example.com', 'password', 'testuser');

        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
          expect.objectContaining({
            options: expect.objectContaining({
              emailRedirectTo: env.expected
            })
          })
        );
      }
    });
  });
});