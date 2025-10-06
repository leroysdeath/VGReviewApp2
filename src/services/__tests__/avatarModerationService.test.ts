/**
 * Avatar Moderation Service Tests
 * Tests the NSFW.js integration and moderation thresholds
 */

import { avatarModerationService } from '../avatarModerationService';
import * as nsfwjs from 'nsfwjs';
import { supabase } from '../supabase';

// Mock NSFW.js
jest.mock('nsfwjs');

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue({ count: 0, error: null })
    }))
  }
}));

describe('AvatarModerationService', () => {
  let mockModel: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock NSFW model
    mockModel = {
      classify: jest.fn()
    };

    (nsfwjs.load as jest.Mock).mockResolvedValue(mockModel);
  });

  describe('moderateAvatar', () => {
    it('should approve safe images with high neutral score', async () => {
      // Mock a safe image classification
      mockModel.classify.mockResolvedValue([
        { className: 'Neutral', probability: 0.92 },
        { className: 'Drawing', probability: 0.05 },
        { className: 'Sexy', probability: 0.02 },
        { className: 'Porn', probability: 0.005 },
        { className: 'Hentai', probability: 0.005 }
      ]);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await avatarModerationService.moderateAvatar(file, 1);

      expect(result.approved).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.message).toBe('Image approved.');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should block pornographic content at 70% threshold (liberal)', async () => {
      // Test exactly at threshold (70%)
      mockModel.classify.mockResolvedValue([
        { className: 'Porn', probability: 0.71 }, // Just above 70% threshold
        { className: 'Sexy', probability: 0.20 },
        { className: 'Neutral', probability: 0.05 },
        { className: 'Drawing', probability: 0.02 },
        { className: 'Hentai', probability: 0.02 }
      ]);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await avatarModerationService.moderateAvatar(file, 1);

      expect(result.approved).toBe(false);
      expect(result.violations).toContain('pornographic');
      expect(result.message).toBe('This image cannot be used as an avatar.');
    });

    it('should allow pornographic content below 70% threshold', async () => {
      // Test just below threshold (should pass with liberal settings)
      mockModel.classify.mockResolvedValue([
        { className: 'Porn', probability: 0.69 }, // Just below 70% threshold
        { className: 'Sexy', probability: 0.20 },
        { className: 'Neutral', probability: 0.08 },
        { className: 'Drawing', probability: 0.02 },
        { className: 'Hentai', probability: 0.01 }
      ]);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await avatarModerationService.moderateAvatar(file, 1);

      expect(result.approved).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.message).toBe('Image approved.');
    });

    it('should allow suggestive/sexy content (per requirements)', async () => {
      // High sexy score should still pass
      mockModel.classify.mockResolvedValue([
        { className: 'Sexy', probability: 0.85 }, // High sexy score
        { className: 'Neutral', probability: 0.10 },
        { className: 'Porn', probability: 0.03 },
        { className: 'Drawing', probability: 0.01 },
        { className: 'Hentai', probability: 0.01 }
      ]);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await avatarModerationService.moderateAvatar(file, 1);

      expect(result.approved).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.message).toBe('Image approved.');
    });

    it('should block hentai content at 70% threshold', async () => {
      mockModel.classify.mockResolvedValue([
        { className: 'Hentai', probability: 0.75 }, // Above threshold
        { className: 'Drawing', probability: 0.20 },
        { className: 'Sexy', probability: 0.03 },
        { className: 'Porn', probability: 0.01 },
        { className: 'Neutral', probability: 0.01 }
      ]);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await avatarModerationService.moderateAvatar(file, 1);

      expect(result.approved).toBe(false);
      expect(result.violations).toContain('pornographic');
      expect(result.message).toBe('This image cannot be used as an avatar.');
    });

    it('should handle model loading errors gracefully', async () => {
      (nsfwjs.load as jest.Mock).mockRejectedValue(new Error('Model load failed'));

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await avatarModerationService.moderateAvatar(file, 1);

      expect(result.approved).toBe(false);
      expect(result.message).toBe('Moderation service unavailable. Please try again later.');
      expect(result.cost).toBe(0);
    });

    it('should handle invalid image files', async () => {
      const file = new File(['invalid'], 'test.txt', { type: 'text/plain' });
      const result = await avatarModerationService.moderateAvatar(file, 1);

      expect(result.approved).toBe(false);
      expect(result.message).toBe('Invalid image file. Please try another.');
    });

    it('should log moderation attempts when userId provided', async () => {
      mockModel.classify.mockResolvedValue([
        { className: 'Neutral', probability: 0.95 },
        { className: 'Drawing', probability: 0.03 },
        { className: 'Sexy', probability: 0.01 },
        { className: 'Porn', probability: 0.005 },
        { className: 'Hentai', probability: 0.005 }
      ]);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await avatarModerationService.moderateAvatar(file, 123);

      expect(supabase.from).toHaveBeenCalledWith('avatar_moderation_logs');
    });
  });

  describe('checkRateLimits', () => {
    it('should allow uploads when under rate limits', async () => {
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue({ count: 2, error: null })
      });

      const result = await avatarModerationService.checkRateLimits(1);

      expect(result.allowed).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should block uploads when hourly limit reached (5 per hour)', async () => {
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue({ count: 5, error: null })
      });

      const result = await avatarModerationService.checkRateLimits(1);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Upload limit reached. Try again in an hour.');
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it('should block uploads when daily limit reached (10 per day)', async () => {
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        count: jest.fn()
          .mockResolvedValueOnce({ count: 3, error: null }) // Hourly check
          .mockResolvedValueOnce({ count: 10, error: null }) // Daily check
      });

      const result = await avatarModerationService.checkRateLimits(1);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Daily upload limit reached. Try again tomorrow.');
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it('should block uploads when too many failed attempts (5 per day)', async () => {
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        count: jest.fn()
          .mockResolvedValueOnce({ count: 2, error: null }) // Hourly check
          .mockResolvedValueOnce({ count: 8, error: null }) // Daily check
          .mockResolvedValueOnce({ count: 5, error: null }) // Failed attempts check
      });

      const result = await avatarModerationService.checkRateLimits(1);

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('Too many failed upload attempts. Try again tomorrow.');
    });

    it('should fail open (allow) on database errors', async () => {
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        count: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const result = await avatarModerationService.checkRateLimits(1);

      expect(result.allowed).toBe(true); // Fail open
      expect(result.message).toBeUndefined();
    });
  });

  describe('threshold validation', () => {
    it('should use liberal thresholds as specified', () => {
      // Test that the service is configured with the correct thresholds
      const service = new (avatarModerationService.constructor as any)();

      expect(service.thresholds.porn).toBe(0.7); // 70% liberal threshold
      expect(service.thresholds.hentai).toBe(0.7); // 70% liberal threshold
      expect(service.thresholds.sexy).toBe(1.0); // Never block suggestive
      expect(service.thresholds.neutral).toBe(0.3); // 30% neutral enough
      expect(service.thresholds.drawing).toBe(1.0); // Don't block drawings
    });
  });
});