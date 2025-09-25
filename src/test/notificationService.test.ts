/**
 * Unit tests for Notification Service
 * Tests notification creation, delivery, and management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          range: jest.fn(() => ({
            data: [],
            error: null
          })),
          data: [],
          error: null
        })),
        is: jest.fn(() => ({
          order: jest.fn(() => ({
            data: [],
            error: null
          }))
        }))
      }))
    })),
    insert: jest.fn(() => ({
      data: null,
      error: null
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: null
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        error: null
      }))
    }))
  }))
};

jest.mock('../services/supabase', () => ({
  supabase: mockSupabase
}));

import { notificationService } from '../services/notificationService';

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Notifications', () => {
    it('should create a review notification', async () => {
      const mockNotification = {
        id: 1,
        user_id: 123,
        type: 'review',
        title: 'New Review',
        message: 'Someone reviewed your game',
        created_at: new Date().toISOString()
      };

      (mockSupabase.from().insert as jest.Mock).mockResolvedValue({
        data: mockNotification,
        error: null
      });

      await expect(
        notificationService.createReviewNotification(123, 456, 'Test Game')
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith('notification');
    });

    it('should create a follow notification', async () => {
      (mockSupabase.from().insert as jest.Mock).mockResolvedValue({
        data: { id: 1 },
        error: null
      });

      await expect(
        notificationService.createFollowNotification(123, 456)
      ).resolves.not.toThrow();
    });

    it('should create a comment notification', async () => {
      (mockSupabase.from().insert as jest.Mock).mockResolvedValue({
        data: { id: 1 },
        error: null
      });

      await expect(
        notificationService.createCommentNotification(123, 456, 789)
      ).resolves.not.toThrow();
    });
  });

  describe('Get Notifications', () => {
    it('should fetch user notifications', async () => {
      const mockNotifications = [
        {
          id: 1,
          type: 'review',
          title: 'New Review',
          message: 'Someone reviewed your game',
          read: false,
          created_at: new Date().toISOString()
        }
      ];

      (mockSupabase.from().select().eq().order().range as jest.Mock).mockResolvedValue({
        data: mockNotifications,
        error: null
      });

      const result = await notificationService.getUserNotifications(123);

      expect(result).toEqual(mockNotifications);
      expect(mockSupabase.from).toHaveBeenCalledWith('notification');
    });

    it('should fetch unread notifications', async () => {
      const mockUnread = [
        { id: 1, read: false, title: 'Unread notification' }
      ];

      (mockSupabase.from().select().eq().is().order as jest.Mock).mockResolvedValue({
        data: mockUnread,
        error: null
      });

      const result = await notificationService.getUnreadNotifications(123);

      expect(result).toEqual(mockUnread);
    });

    it('should get notification count', async () => {
      (mockSupabase.from().select().eq().is as jest.Mock).mockResolvedValue({
        data: new Array(5).fill({}),
        error: null
      });

      const result = await notificationService.getNotificationCount(123);

      expect(result).toBe(5);
    });
  });

  describe('Mark as Read', () => {
    it('should mark single notification as read', async () => {
      (mockSupabase.from().update().eq as jest.Mock).mockResolvedValue({
        data: { id: 1, read: true },
        error: null
      });

      await expect(
        notificationService.markAsRead(123, 1)
      ).resolves.not.toThrow();
    });

    it('should mark all notifications as read', async () => {
      (mockSupabase.from().update().eq as jest.Mock).mockResolvedValue({
        data: [],
        error: null
      });

      await expect(
        notificationService.markAllAsRead(123)
      ).resolves.not.toThrow();
    });
  });

  describe('Delete Notifications', () => {
    it('should delete a notification', async () => {
      (mockSupabase.from().delete().eq as jest.Mock).mockResolvedValue({
        error: null
      });

      await expect(
        notificationService.deleteNotification(1, 123)
      ).resolves.not.toThrow();
    });

    it('should delete all notifications for user', async () => {
      (mockSupabase.from().delete().eq as jest.Mock).mockResolvedValue({
        error: null
      });

      await expect(
        notificationService.deleteAllNotifications(123)
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle notification creation errors', async () => {
      (mockSupabase.from().insert as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(
        notificationService.createReviewNotification(123, 456, 'Test')
      ).rejects.toThrow('Database error');
    });

    it('should handle fetch errors gracefully', async () => {
      (mockSupabase.from().select().eq().order().range as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        notificationService.getUserNotifications(123)
      ).rejects.toThrow('Network error');
    });
  });

  describe('Notification Types', () => {
    const notificationTypes = [
      'review',
      'comment', 
      'follow',
      'like',
      'system'
    ];

    notificationTypes.forEach(type => {
      it(`should handle ${type} notification type`, async () => {
        (mockSupabase.from().insert as jest.Mock).mockResolvedValue({
          data: { id: 1, type },
          error: null
        });

        await expect(
          notificationService.createNotification({
            user_id: 123,
            type,
            title: `Test ${type}`,
            message: `Test ${type} notification`
          })
        ).resolves.not.toThrow();
      });
    });
  });
});