/**
 * User Service Avatar Upload Tests
 * Tests the complete avatar upload flow including moderation
 */

import { userService } from '../userService';
import { avatarModerationService } from '../avatarModerationService';
import { supabase } from '../supabase';

// Mock dependencies
jest.mock('../supabase');
jest.mock('../avatarModerationService');

describe('UserService - Avatar Upload', () => {
  const mockUserId = 123;
  const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: mockUserId,
          email_verified: true,
          avatar_url: null
        },
        error: null
      }),
      update: jest.fn().mockReturnThis()
    });

    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: { path: 'avatars/123/avatar.jpg' },
        error: null
      }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://storage.supabase.co/avatars/123/avatar.jpg' }
      }),
      remove: jest.fn().mockResolvedValue({ error: null })
    });
  });

  describe('uploadAvatar', () => {
    it('should successfully upload avatar when all checks pass', async () => {
      // Mock successful moderation
      (avatarModerationService.checkRateLimits as jest.Mock).mockResolvedValue({
        allowed: true
      });

      (avatarModerationService.moderateAvatar as jest.Mock).mockResolvedValue({
        approved: true,
        confidence: 0.95,
        stage: 'client',
        violations: [],
        message: 'Image approved.',
        cost: 0
      });

      const result = await userService.uploadAvatar(mockUserId, mockFile);

      expect(result.success).toBe(true);
      expect(result.data?.avatar_url).toBe('https://storage.supabase.co/avatars/123/avatar.jpg');
      expect(result.message).toContain('uploaded successfully');
    });

    it('should reject upload when email not verified', async () => {
      // Mock unverified email
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockUserId,
            email_verified: false // Not verified
          },
          error: null
        })
      });

      const result = await userService.uploadAvatar(mockUserId, mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email verification required to upload avatar');
      expect(avatarModerationService.moderateAvatar).not.toHaveBeenCalled();
    });

    it('should reject upload when rate limit exceeded', async () => {
      (avatarModerationService.checkRateLimits as jest.Mock).mockResolvedValue({
        allowed: false,
        message: 'Upload limit reached. Try again in an hour.'
      });

      const result = await userService.uploadAvatar(mockUserId, mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload limit reached. Try again in an hour.');
      expect(avatarModerationService.moderateAvatar).not.toHaveBeenCalled();
    });

    it('should reject upload when file too large (>5MB)', async () => {
      const largeFile = new File(
        [new ArrayBuffer(6 * 1024 * 1024)], // 6MB
        'large.jpg',
        { type: 'image/jpeg' }
      );

      (avatarModerationService.checkRateLimits as jest.Mock).mockResolvedValue({
        allowed: true
      });

      const result = await userService.uploadAvatar(mockUserId, largeFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File size must be less than 5MB');
      expect(avatarModerationService.moderateAvatar).not.toHaveBeenCalled();
    });

    it('should reject upload with invalid file type', async () => {
      const invalidFile = new File(['test'], 'document.pdf', { type: 'application/pdf' });

      (avatarModerationService.checkRateLimits as jest.Mock).mockResolvedValue({
        allowed: true
      });

      const result = await userService.uploadAvatar(mockUserId, invalidFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image');
      expect(avatarModerationService.moderateAvatar).not.toHaveBeenCalled();
    });

    it('should reject upload when moderation fails', async () => {
      (avatarModerationService.checkRateLimits as jest.Mock).mockResolvedValue({
        allowed: true
      });

      (avatarModerationService.moderateAvatar as jest.Mock).mockResolvedValue({
        approved: false,
        confidence: 0.85,
        stage: 'client',
        violations: ['pornographic'],
        message: 'This image cannot be used as an avatar.',
        cost: 0
      });

      const result = await userService.uploadAvatar(mockUserId, mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('This image cannot be used as an avatar.');
      expect(supabase.storage.from).not.toHaveBeenCalled(); // Should not upload
    });

    it('should delete old avatar after uploading new one', async () => {
      // Mock user with existing avatar
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockUserId,
            email_verified: true,
            avatar_url: 'https://example.com/storage/v1/object/public/user-avatars/123/old-avatar.jpg',
            provider_id: 'auth123'
          },
          error: null
        }),
        update: jest.fn().mockReturnThis()
      });

      (avatarModerationService.checkRateLimits as jest.Mock).mockResolvedValue({
        allowed: true
      });

      (avatarModerationService.moderateAvatar as jest.Mock).mockResolvedValue({
        approved: true,
        confidence: 0.95,
        stage: 'client',
        violations: [],
        message: 'Image approved.',
        cost: 0
      });

      await userService.uploadAvatar(mockUserId, mockFile);

      // Verify old avatar was deleted after successful upload
      expect(supabase.storage.from).toHaveBeenCalledWith('user-avatars');
      const storageMock = (supabase.storage.from as jest.Mock).mock.results[1].value; // Second call is for deletion
      expect(storageMock.remove).toHaveBeenCalledWith(['123/old-avatar.jpg']);
    });

    it('should handle database update failures gracefully', async () => {
      (avatarModerationService.checkRateLimits as jest.Mock).mockResolvedValue({
        allowed: true
      });

      (avatarModerationService.moderateAvatar as jest.Mock).mockResolvedValue({
        approved: true,
        confidence: 0.95,
        stage: 'client',
        violations: [],
        message: 'Image approved.',
        cost: 0
      });

      // Mock database update failure
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
          .mockResolvedValueOnce({ // First call for fetching user
            data: { id: mockUserId, email_verified: true },
            error: null
          }),
        update: jest.fn().mockReturnThis()
      });

      const updateMock = jest.fn().mockResolvedValue({
        error: { message: 'Database error' }
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'user') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: mockUserId, email_verified: true },
              error: null
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: updateMock
              })
            })
          };
        }
        return {
          insert: jest.fn().mockResolvedValue({ error: null })
        };
      });

      const result = await userService.uploadAvatar(mockUserId, mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to update profile');
    });

    it('should handle storage upload failures gracefully', async () => {
      (avatarModerationService.checkRateLimits as jest.Mock).mockResolvedValue({
        allowed: true
      });

      (avatarModerationService.moderateAvatar as jest.Mock).mockResolvedValue({
        approved: true,
        confidence: 0.95,
        stage: 'client',
        violations: [],
        message: 'Image approved.',
        cost: 0
      });

      // Mock storage upload failure
      (supabase.storage.from as jest.Mock).mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage error' }
        }),
        remove: jest.fn().mockResolvedValue({ error: null })
      });

      const result = await userService.uploadAvatar(mockUserId, mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to upload avatar');
    });
  });

  describe('Email Verification Requirement', () => {
    it('should check email_verified field before allowing upload', async () => {
      const testCases = [
        { email_verified: true, should_allow: true },
        { email_verified: false, should_allow: false },
        { email_verified: null, should_allow: false },
        { email_verified: undefined, should_allow: false }
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: mockUserId,
              email_verified: testCase.email_verified
            },
            error: null
          })
        });

        (avatarModerationService.checkRateLimits as jest.Mock).mockResolvedValue({
          allowed: true
        });

        if (testCase.should_allow) {
          (avatarModerationService.moderateAvatar as jest.Mock).mockResolvedValue({
            approved: true,
            confidence: 0.95,
            stage: 'client',
            violations: [],
            message: 'Image approved.',
            cost: 0
          });
        }

        const result = await userService.uploadAvatar(mockUserId, mockFile);

        if (testCase.should_allow) {
          expect(result.success).toBe(true);
          expect(avatarModerationService.moderateAvatar).toHaveBeenCalled();
        } else {
          expect(result.success).toBe(false);
          expect(result.error).toBe('Email verification required to upload avatar');
          expect(avatarModerationService.moderateAvatar).not.toHaveBeenCalled();
        }
      }
    });
  });

  describe('File Type Validation', () => {
    const validTypes = [
      { file: new File([''], 'test.jpg', { type: 'image/jpeg' }), name: 'JPEG' },
      { file: new File([''], 'test.png', { type: 'image/png' }), name: 'PNG' },
      { file: new File([''], 'test.gif', { type: 'image/gif' }), name: 'GIF' },
      { file: new File([''], 'test.webp', { type: 'image/webp' }), name: 'WebP' }
    ];

    const invalidTypes = [
      { file: new File([''], 'test.pdf', { type: 'application/pdf' }), name: 'PDF' },
      { file: new File([''], 'test.doc', { type: 'application/msword' }), name: 'DOC' },
      { file: new File([''], 'test.svg', { type: 'image/svg+xml' }), name: 'SVG' },
      { file: new File([''], 'test.bmp', { type: 'image/bmp' }), name: 'BMP' }
    ];

    it.each(validTypes)('should accept $name files', async ({ file }) => {
      (avatarModerationService.checkRateLimits as jest.Mock).mockResolvedValue({
        allowed: true
      });

      (avatarModerationService.moderateAvatar as jest.Mock).mockResolvedValue({
        approved: true,
        confidence: 0.95,
        stage: 'client',
        violations: [],
        message: 'Image approved.',
        cost: 0
      });

      const result = await userService.uploadAvatar(mockUserId, file);

      expect(result.success).toBe(true);
      expect(avatarModerationService.moderateAvatar).toHaveBeenCalled();
    });

    it.each(invalidTypes)('should reject $name files', async ({ file }) => {
      (avatarModerationService.checkRateLimits as jest.Mock).mockResolvedValue({
        allowed: true
      });

      const result = await userService.uploadAvatar(mockUserId, file);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image');
      expect(avatarModerationService.moderateAvatar).not.toHaveBeenCalled();
    });
  });
});