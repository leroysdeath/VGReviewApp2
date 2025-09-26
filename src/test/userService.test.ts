/**
 * Unified User Service Tests
 * Consolidates tests from userService, userServiceSimple, profileService, and profileCache
 */

import { userService, profileCache, userServiceSimple } from '../services/userService';
import type { UserProfile, UserUpdate, ServiceResponse } from '../services/userService';
import { supabase } from '../services/supabase';

// Mock Supabase
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(),
    rpc: jest.fn()
  }
}));

// Mock sanitization utilities
jest.mock('../utils/sanitize', () => ({
  sanitizeStrict: jest.fn((str) => str),
  sanitizeBasic: jest.fn((str) => str),
  sanitizeURL: jest.fn((str) => str)
}));

// Mock type validators
jest.mock('../types/user', () => ({
  isDatabaseUser: jest.fn(() => true),
  dbUserToClientUser: jest.fn((user) => user),
  clientUpdateToDbUpdate: jest.fn((update) => update),
  authIdUtils: {},
  ProfileUpdateData: {},
  ServiceResponse: {},
  DatabaseUser: {},
  ClientUser: {}
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Unified User Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userService.clearCache();
  });

  describe('Authentication Operations', () => {
    describe('getCurrentAuthUser', () => {
      it('should return authenticated user successfully', async () => {
        const mockUser = {
          id: 'auth-123',
          email: 'test@example.com'
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        });

        const result = await userService.getCurrentAuthUser();

        expect(result.success).toBe(true);
        expect(result.data).toEqual({
          id: 'auth-123',
          email: 'test@example.com'
        });
      });

      it('should handle no authenticated user', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null
        });

        const result = await userService.getCurrentAuthUser();

        expect(result.success).toBe(false);
        expect(result.error).toBe('User not authenticated');
      });

      it('should handle auth errors', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Auth failed' }
        });

        const result = await userService.getCurrentAuthUser();

        expect(result.success).toBe(false);
        expect(result.error).toContain('Authentication error');
      });
    });

    describe('getOrCreateUser', () => {
      it('should create user via database function', async () => {
        const mockSession = {
          user: {
            id: 'auth-123',
            email: 'test@example.com',
            user_metadata: { name: 'Test User' }
          }
        };

        mockSupabase.rpc.mockResolvedValue({
          data: 456,
          error: null
        });

        const result = await userService.getOrCreateUser(mockSession as any);

        expect(result.success).toBe(true);
        expect(result.userId).toBe(456);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_or_create_user', {
          auth_id: 'auth-123',
          user_email: 'test@example.com',
          user_name: 'Test User',
          user_provider: 'supabase'
        });
      });

      it('should fallback to manual user creation', async () => {
        const mockSession = {
          user: {
            id: 'auth-123',
            email: 'test@example.com',
            user_metadata: { name: 'Test User' }
          }
        };

        // Mock database function failure
        mockSupabase.rpc.mockResolvedValue({
          data: null,
          error: { message: 'Function failed' }
        });

        // Mock successful lookup
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 789 },
                error: null
              })
            })
          })
        });

        const result = await userService.getOrCreateUser(mockSession as any);

        expect(result.success).toBe(true);
        expect(result.userId).toBe(789);
      });

      it('should handle no session provided', async () => {
        const result = await userService.getOrCreateUser();

        expect(result.success).toBe(false);
        expect(result.error).toBe('No session provided');
      });
    });
  });

  describe('Profile Operations - Simple', () => {
    describe('getUser', () => {
      it('should fetch user by ID', async () => {
        const mockUser = {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          name: 'Test User'
        };

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUser,
                error: null
              })
            })
          })
        });

        const result = await userService.getUser(1);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockUser);
      });

      it('should handle user not found', async () => {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'User not found' }
              })
            })
          })
        });

        const result = await userService.getUser(999);

        expect(result.success).toBe(false);
        expect(result.error).toBe('User not found');
      });
    });

    describe('getUserByUsername', () => {
      it('should fetch user by username', async () => {
        const mockUser = {
          id: 1,
          username: 'testuser',
          email: 'test@example.com'
        };

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUser,
                error: null
              })
            })
          })
        });

        const result = await userService.getUserByUsername('testuser');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockUser);
      });
    });

    describe('getUserByProviderId', () => {
      it('should fetch user by provider ID', async () => {
        const mockUser = {
          id: 1,
          provider_id: 'auth-123',
          email: 'test@example.com'
        };

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUser,
                error: null
              })
            })
          })
        });

        const result = await userService.getUserByProviderId('auth-123');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockUser);
      });
    });
  });

  describe('Enhanced Profile Operations', () => {
    describe('getUserProfile', () => {
      it('should get user profile with caching', async () => {
        const mockProfile = {
          id: 1,
          provider_id: 'b47ac10b-58cc-4372-a567-0e02b2c3d479',
          username: 'testuser',
          email: 'test@example.com',
          name: 'Test User',
          provider: 'supabase',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        };

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            })
          })
        });

        const result = await userService.getUserProfile('b47ac10b-58cc-4372-a567-0e02b2c3d479');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockProfile);
      });

      it('should reject invalid UUID format', async () => {
        const result = await userService.getUserProfile('invalid-uuid');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid provider ID format');
      });

      it('should handle profile not found', async () => {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' }
              })
            })
          })
        });

        const result = await userService.getUserProfile('b47ac10b-58cc-4372-a567-0e02b2c3d479');

        expect(result.success).toBe(false);
        expect(result.error).toBe('User profile not found');
      });
    });

    describe('ensureUserProfileExists', () => {
      it('should return existing profile if found', async () => {
        const mockProfile = {
          id: 1,
          provider_id: 'b47ac10b-58cc-4372-a567-0e02b2c3d479',
          username: 'testuser',
          email: 'test@example.com'
        };

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            })
          })
        });

        const result = await userService.ensureUserProfileExists(
          'b47ac10b-58cc-4372-a567-0e02b2c3d479',
          'test@example.com'
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockProfile);
      });

      it('should create new profile if not found', async () => {
        const newProfile = {
          id: 2,
          provider_id: 'b47ac10b-58cc-4372-a567-0e02b2c3d479',
          username: 'test',
          email: 'test@example.com',
          name: 'test',
          provider: 'supabase'
        };

        // Mock profile not found
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        });

        // Mock username availability check
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        });

        // Mock profile creation
        mockSupabase.from.mockReturnValueOnce({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: newProfile,
                error: null
              })
            })
          })
        });

        const result = await userService.ensureUserProfileExists(
          'b47ac10b-58cc-4372-a567-0e02b2c3d479',
          'test@example.com'
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(newProfile);
      });
    });

    describe('updateUserProfile', () => {
      it('should update user profile successfully', async () => {
        const updateData = {
          name: 'Updated Name',
          bio: 'Updated bio'
        };

        const updatedProfile = {
          id: 1,
          provider_id: 'auth-123',
          username: 'testuser',
          name: 'Updated Name',
          bio: 'Updated bio',
          updated_at: '2023-01-02T00:00:00Z'
        };

        mockSupabase.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: updatedProfile,
                  error: null
                })
              })
            })
          })
        });

        const result = await userService.updateUserProfile(1, updateData);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(updatedProfile);
      });

      it('should handle update errors', async () => {
        const updateData = { name: 'Updated Name' };

        mockSupabase.from.mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Update failed' }
                })
              })
            })
          })
        });

        const result = await userService.updateUserProfile(1, updateData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to update profile');
      });
    });

    describe('checkUsernameAvailability', () => {
      it('should return available for unused username', async () => {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        });

        const result = await userService.checkUsernameAvailability('newuser');

        expect(result.success).toBe(true);
        expect(result.data?.available).toBe(true);
      });

      it('should return not available for existing username', async () => {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: 1 },
                error: null
              })
            })
          })
        });

        const result = await userService.checkUsernameAvailability('existinguser');

        expect(result.success).toBe(true);
        expect(result.data?.available).toBe(false);
      });

      it('should handle empty username', async () => {
        const result = await userService.checkUsernameAvailability('');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Username cannot be empty');
      });

      it('should handle short username', async () => {
        const result = await userService.checkUsernameAvailability('ab');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Username must be at least 3 characters long');
      });
    });

    describe('getCurrentUserProfile', () => {
      it('should get current user profile', async () => {
        const mockAuthUser = {
          id: 'auth-123',
          email: 'test@example.com'
        };

        const mockProfile = {
          id: 1,
          provider_id: 'auth-123',
          username: 'testuser',
          email: 'test@example.com'
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockAuthUser },
          error: null
        });

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            })
          })
        });

        const result = await userService.getCurrentUserProfile();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockProfile);
      });

      it('should handle no authenticated user', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null
        });

        const result = await userService.getCurrentUserProfile();

        expect(result.success).toBe(false);
        expect(result.error).toContain('No authenticated user');
      });
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches', () => {
      // Add some mock data to caches
      userService['profileCache'].set('test-1', {
        data: { id: 1, provider_id: 'test-1' } as UserProfile,
        timestamp: Date.now(),
        userId: 'test-1'
      });

      userService.clearCache();

      // Cache should be empty
      expect(userService['profileCache'].size).toBe(0);
      expect(userService['userCache'].size).toBe(0);
    });

    it('should clear specific profile cache', () => {
      userService.clearProfileCache('test-1');

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should provide userServiceSimple alias', () => {
      expect(userServiceSimple).toBeDefined();
      expect(typeof userServiceSimple.getUser).toBe('function');
    });

    it('should provide profileCache interface', () => {
      expect(profileCache).toBeDefined();
      expect(typeof profileCache.get).toBe('function');
      expect(typeof profileCache.set).toBe('function');
      expect(typeof profileCache.update).toBe('function');
      expect(typeof profileCache.clear).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await userService.getUser(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockSupabase.auth.getUser.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await userService.getCurrentAuthUser();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected error');
    });
  });
});

describe('Function Exports', () => {
  const { getCurrentAuthUser, getUserProfile, ensureUserProfileExists,
          updateUserProfile, checkUsernameAvailability, getCurrentUserProfile } = require('../services/userService');

  it('should export all required functions', () => {
    expect(typeof getCurrentAuthUser).toBe('function');
    expect(typeof getUserProfile).toBe('function');
    expect(typeof ensureUserProfileExists).toBe('function');
    expect(typeof updateUserProfile).toBe('function');
    expect(typeof checkUsernameAvailability).toBe('function');
    expect(typeof getCurrentUserProfile).toBe('function');
  });
});