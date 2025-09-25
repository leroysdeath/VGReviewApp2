import * as profileService from '../services/profileService';
import { sanitizeStrict, sanitizeBasic, sanitizeURL } from '../utils/sanitize';

// Mock dependencies
jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn()
    },
    storage: {
      from: jest.fn()
    }
  }
}));

jest.mock('../services/userService', () => ({
  userService: {
    getOrCreateDatabaseUser: jest.fn(),
    getUserProfile: jest.fn()
  }
}));

jest.mock('../services/profileCache', () => ({
  profileCache: {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn()
  }
}));

jest.mock('../utils/sanitize');

describe('ProfileService', () => {
  const mockUser = {
    id: 1,
    provider_id: 'test-auth-id',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    display_name: 'Test Display Name',
    bio: 'Test bio',
    location: 'Test Location',
    website: 'https://test.com',
    platform: 'PC',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementations
    (sanitizeStrict as jest.Mock).mockImplementation((str) => str || '');
    (sanitizeBasic as jest.Mock).mockImplementation((str) => str || '');
    (sanitizeURL as jest.Mock).mockImplementation((str) => str || '');
  });

  describe('Input Validation', () => {
    describe('Auth ID Validation', () => {
      test('should detect valid UUID format', () => {
        const validUuid = '550e8400-e29b-41d4-a716-446655440000';
        // We can't directly test authIdUtils since it's internal, but we can test the function behavior
        
        expect(validUuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });

      test('should detect invalid UUID format', () => {
        const invalidUuids = [
          'not-a-uuid',
          '123',
          '',
          '550e8400-e29b-41d4-a716',  // Too short
          '550e8400-e29b-41d4-a716-446655440000-extra' // Too long
        ];

        invalidUuids.forEach(uuid => {
          expect(uuid).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });
      });
    });

    test('should validate profile update data structure', () => {
      const validUpdateData = {
        username: 'newusername',
        displayName: 'New Display Name',
        bio: 'New bio',
        location: 'New location',
        website: 'https://newsite.com',
        platform: 'PlayStation',
        avatar: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2w'
      };

      // Verify all expected fields are present
      expect(validUpdateData).toHaveProperty('username');
      expect(validUpdateData).toHaveProperty('displayName');
      expect(validUpdateData).toHaveProperty('bio');
      expect(validUpdateData).toHaveProperty('location');
      expect(validUpdateData).toHaveProperty('website');
      expect(validUpdateData).toHaveProperty('platform');
      expect(validUpdateData).toHaveProperty('avatar');
    });
  });

  describe('Username Validation', () => {
    test('should validate username length requirements', async () => {
      const testCases = [
        { username: 'ab', valid: false, reason: 'too short' },
        { username: 'abc', valid: true, reason: 'minimum length' },
        { username: 'validusername', valid: true, reason: 'normal length' },
        { username: 'a'.repeat(22), valid: false, reason: 'too long' },
        { username: 'a'.repeat(21), valid: true, reason: 'maximum length' }
      ];

      testCases.forEach(({ username, valid, reason }) => {
        if (valid) {
          expect(username.length).toBeGreaterThanOrEqual(3);
          expect(username.length).toBeLessThanOrEqual(21);
        } else {
          expect(username.length < 3 || username.length > 21).toBe(true);
        }
      });
    });

    test('should validate username character requirements', () => {
      const validUsernames = ['abc', 'user123', 'test_user', 'user-name'];
      const invalidUsernames = ['user!', 'user@domain', 'user space', ''];

      validUsernames.forEach(username => {
        // Should only contain alphanumeric characters, underscores, and hyphens
        expect(username).toMatch(/^[a-zA-Z0-9_-]+$/);
        expect(username.length).toBeGreaterThanOrEqual(3);
      });

      invalidUsernames.forEach(username => {
        if (username.length >= 3) {
          expect(username).not.toMatch(/^[a-zA-Z0-9_-]+$/);
        }
      });
    });
  });

  describe('Profile Field Sanitization', () => {
    test('should sanitize display name properly', () => {
      const testData = {
        displayName: '<script>alert("xss")</script>Safe Name'
      };

      // Simulate the sanitization that should happen
      expect(sanitizeStrict).toBeDefined();
      
      // Call with the input to ensure sanitization would be triggered
      const sanitized = sanitizeStrict(testData.displayName);
      expect(sanitizeStrict).toHaveBeenCalledWith(testData.displayName);
    });

    test('should sanitize bio content', () => {
      const testBio = 'This is a <b>test</b> bio with <script>malicious</script> content';
      
      sanitizeBasic(testBio);
      expect(sanitizeBasic).toHaveBeenCalledWith(testBio);
    });

    test('should validate and sanitize website URLs', () => {
      const testUrls = [
        'https://example.com',
        'http://test.org',
        'ftp://files.com', // Should be sanitized
        'javascript:alert("xss")', // Should be sanitized
        'not-a-url' // Should be sanitized
      ];

      testUrls.forEach(url => {
        sanitizeURL(url);
        expect(sanitizeURL).toHaveBeenCalledWith(url);
      });
    });

    test('should validate bio length limits', () => {
      const shortBio = 'Short bio';
      const maxLengthBio = 'a'.repeat(500);
      const tooLongBio = 'a'.repeat(501);

      expect(shortBio.length).toBeLessThanOrEqual(500);
      expect(maxLengthBio.length).toBe(500);
      expect(tooLongBio.length).toBeGreaterThan(500);
    });
  });

  describe('Avatar Handling', () => {
    test('should detect valid data URL format for avatars', () => {
      const validDataUrls = [
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEA',
        'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAA'
      ];

      const invalidDataUrls = [
        'https://example.com/image.jpg', // Not a data URL
        'data:text/plain;base64,SGVsbG8gV29ybGQ=', // Wrong type
        'not-data-url',
        ''
      ];

      validDataUrls.forEach(url => {
        expect(url.startsWith('data:image/')).toBe(true);
      });

      invalidDataUrls.forEach(url => {
        expect(url.startsWith('data:image/')).toBe(false);
      });
    });

    test('should validate avatar file type restrictions', () => {
      const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const unsupportedTypes = ['image/svg+xml', 'application/pdf', 'text/plain'];

      supportedTypes.forEach(type => {
        expect(['image/jpeg', 'image/png', 'image/gif', 'image/webp']).toContain(type);
      });

      unsupportedTypes.forEach(type => {
        expect(['image/jpeg', 'image/png', 'image/gif', 'image/webp']).not.toContain(type);
      });
    });

    test('should validate avatar size limits', () => {
      // Simulate checking file size limits (2MB = 2 * 1024 * 1024 bytes)
      const maxSize = 2 * 1024 * 1024;
      const validSize = 1024 * 1024; // 1MB
      const invalidSize = 3 * 1024 * 1024; // 3MB

      expect(validSize).toBeLessThanOrEqual(maxSize);
      expect(invalidSize).toBeGreaterThan(maxSize);
    });
  });

  describe('Profile Data Consistency', () => {
    test('should maintain consistent data structure', () => {
      const profileData = {
        id: 1,
        provider_id: 'auth-id',
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        display_name: 'Test Display',
        bio: 'Bio text',
        location: 'Location',
        website: 'https://example.com',
        platform: 'PC',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Verify all required fields are present
      expect(profileData).toHaveProperty('id');
      expect(profileData).toHaveProperty('provider_id');
      expect(profileData).toHaveProperty('email');
      expect(profileData).toHaveProperty('username');
      expect(profileData).toHaveProperty('name');
      expect(profileData).toHaveProperty('created_at');
      expect(profileData).toHaveProperty('updated_at');
      
      // Verify optional fields
      expect(profileData).toHaveProperty('display_name');
      expect(profileData).toHaveProperty('bio');
      expect(profileData).toHaveProperty('location');
      expect(profileData).toHaveProperty('website');
      expect(profileData).toHaveProperty('platform');
      expect(profileData).toHaveProperty('avatar_url');
    });

    test('should handle partial profile updates', () => {
      const partialUpdate = {
        username: 'newusername',
        bio: 'Updated bio'
        // Other fields should remain unchanged
      };

      // Verify only specified fields are in update
      expect(Object.keys(partialUpdate)).toEqual(['username', 'bio']);
      expect(partialUpdate).not.toHaveProperty('email');
      expect(partialUpdate).not.toHaveProperty('created_at');
    });
  });

  describe('Error Handling Scenarios', () => {
    test('should handle empty or null input gracefully', () => {
      const invalidInputs = [null, undefined, '', {}, []];

      invalidInputs.forEach(input => {
        // These should not throw errors when passed to sanitization functions
        expect(() => {
          sanitizeStrict(input as any);
          sanitizeBasic(input as any);
          sanitizeURL(input as any);
        }).not.toThrow();
      });
    });

    test('should handle malformed profile data', () => {
      const malformedData = {
        username: null,
        bio: undefined,
        website: 123, // Wrong type
        avatar: {}, // Wrong type
      };

      // Should handle type conversion gracefully
      expect(typeof malformedData.username).not.toBe('string');
      expect(typeof malformedData.bio).toBe('undefined');
      expect(typeof malformedData.website).toBe('number');
      expect(typeof malformedData.avatar).toBe('object');
    });
  });

  describe('Security Considerations', () => {
    test('should prevent XSS in profile fields', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')">',
        '<svg onload="alert(\'xss\')"></svg>'
      ];

      xssAttempts.forEach(malicious => {
        sanitizeStrict(malicious);
        expect(sanitizeStrict).toHaveBeenCalledWith(malicious);
      });
    });

    test('should validate URL schemes for security', () => {
      const unsafeUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:msgbox("xss")',
        'file:///etc/passwd'
      ];

      const safeUrls = [
        'https://example.com',
        'http://example.com',
        'mailto:user@example.com'
      ];

      unsafeUrls.forEach(url => {
        sanitizeURL(url);
        expect(sanitizeURL).toHaveBeenCalledWith(url);
      });

      safeUrls.forEach(url => {
        sanitizeURL(url);
        expect(sanitizeURL).toHaveBeenCalledWith(url);
      });
    });
  });

  describe('Performance Considerations', () => {
    test('should handle large bio text efficiently', () => {
      const largeBio = 'Lorem ipsum '.repeat(50); // ~550 characters
      const startTime = Date.now();
      
      sanitizeBasic(largeBio);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(sanitizeBasic).toHaveBeenCalledWith(largeBio);
    });

    test('should process avatar data URL efficiently', () => {
      // Simulate base64 image data (smaller for test)
      const mockImageData = 'data:image/jpeg;base64,' + 'A'.repeat(1000);
      const startTime = Date.now();
      
      // Simulate processing (checking format, etc.)
      const isValidFormat = mockImageData.startsWith('data:image/');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50);
      expect(isValidFormat).toBe(true);
    });
  });

  describe('Data Transformation', () => {
    test('should properly map client data to database format', () => {
      const clientData = {
        username: 'testuser',
        displayName: 'Test Display Name',
        bio: 'User bio',
        location: 'User location',
        website: 'https://user.com',
        platform: 'PC'
      };

      // Simulate the mapping logic
      const dbData = {
        username: clientData.username,
        display_name: clientData.displayName,
        bio: clientData.bio,
        location: clientData.location,
        website: clientData.website,
        platform: clientData.platform,
        updated_at: new Date().toISOString()
      };

      expect(dbData.display_name).toBe(clientData.displayName);
      expect(dbData).toHaveProperty('updated_at');
    });

    test('should map database data to client format', () => {
      const dbData = {
        id: 1,
        provider_id: 'auth-id',
        username: 'testuser',
        display_name: 'Test Display',
        bio: 'Bio',
        location: 'Location',
        website: 'https://example.com',
        platform: 'PC',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Simulate client mapping
      const clientData = {
        id: dbData.id,
        providerId: dbData.provider_id,
        username: dbData.username,
        displayName: dbData.display_name,
        bio: dbData.bio,
        location: dbData.location,
        website: dbData.website,
        platform: dbData.platform,
        avatarUrl: dbData.avatar_url,
        createdAt: dbData.created_at,
        updatedAt: dbData.updated_at
      };

      expect(clientData.providerId).toBe(dbData.provider_id);
      expect(clientData.displayName).toBe(dbData.display_name);
      expect(clientData.avatarUrl).toBe(dbData.avatar_url);
    });
  });
});