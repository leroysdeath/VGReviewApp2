/**
 * Unit tests for Collection & Wishlist Service
 * Tests user collection and wishlist management functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null
        })),
        single: jest.fn(() => ({
          data: null,
          error: null
        }))
      }))
    })),
    insert: jest.fn(() => ({
      data: null,
      error: null
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        and: jest.fn(() => ({
          error: null
        })),
        error: null
      }))
    }))
  }))
};

jest.mock('../services/supabase', () => ({
  supabase: mockSupabase
}));

import { collectionWishlistService } from '../services/collectionWishlistService';

describe('Collection & Wishlist Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Collection Management', () => {
    it('should add game to collection', async () => {
      (mockSupabase.from().insert as jest.Mock).mockResolvedValue({
        data: { id: 1, user_id: 123, game_id: 456 },
        error: null
      });

      await expect(
        collectionWishlistService.addToCollection(123, 456)
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith('user_collection');
    });

    it('should remove game from collection', async () => {
      (mockSupabase.from().delete().eq().and as jest.Mock).mockResolvedValue({
        error: null
      });

      await expect(
        collectionWishlistService.removeFromCollection(123, 456)
      ).resolves.not.toThrow();
    });

    it('should get user collection', async () => {
      const mockCollection = [
        { id: 1, game_id: 456, game: { name: 'Test Game' } }
      ];

      (mockSupabase.from().select().eq().order as jest.Mock).mockResolvedValue({
        data: mockCollection,
        error: null
      });

      const result = await collectionWishlistService.getUserCollection(123);

      expect(result).toEqual(mockCollection);
    });

    it('should check if game is in collection', async () => {
      (mockSupabase.from().select().eq().single as jest.Mock).mockResolvedValue({
        data: { id: 1 },
        error: null
      });

      const result = await collectionWishlistService.isInCollection(123, 456);

      expect(result).toBe(true);
    });
  });

  describe('Wishlist Management', () => {
    it('should add game to wishlist', async () => {
      (mockSupabase.from().insert as jest.Mock).mockResolvedValue({
        data: { id: 1, user_id: 123, game_id: 456 },
        error: null
      });

      await expect(
        collectionWishlistService.addToWishlist(123, 456)
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith('user_wishlist');
    });

    it('should remove game from wishlist', async () => {
      (mockSupabase.from().delete().eq().and as jest.Mock).mockResolvedValue({
        error: null
      });

      await expect(
        collectionWishlistService.removeFromWishlist(123, 456)
      ).resolves.not.toThrow();
    });

    it('should get user wishlist', async () => {
      const mockWishlist = [
        { id: 1, game_id: 456, game: { name: 'Wishlist Game' } }
      ];

      (mockSupabase.from().select().eq().order as jest.Mock).mockResolvedValue({
        data: mockWishlist,
        error: null
      });

      const result = await collectionWishlistService.getUserWishlist(123);

      expect(result).toEqual(mockWishlist);
    });

    it('should check if game is in wishlist', async () => {
      (mockSupabase.from().select().eq().single as jest.Mock).mockResolvedValue({
        data: null,
        error: null
      });

      const result = await collectionWishlistService.isInWishlist(123, 456);

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      (mockSupabase.from().insert as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Unique constraint violation' }
      });

      await expect(
        collectionWishlistService.addToCollection(123, 456)
      ).rejects.toThrow('Unique constraint violation');
    });

    it('should handle network errors', async () => {
      (mockSupabase.from().select().eq().order as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        collectionWishlistService.getUserCollection(123)
      ).rejects.toThrow('Network error');
    });
  });

  describe('Statistics', () => {
    it('should get collection statistics', async () => {
      (mockSupabase.from().select().eq as jest.Mock).mockResolvedValue({
        data: new Array(50).fill({}),
        error: null
      });

      const result = await collectionWishlistService.getCollectionStats(123);

      expect(result.total).toBe(50);
    });

    it('should get wishlist statistics', async () => {
      (mockSupabase.from().select().eq as jest.Mock).mockResolvedValue({
        data: new Array(25).fill({}),
        error: null
      });

      const result = await collectionWishlistService.getWishlistStats(123);

      expect(result.total).toBe(25);
    });
  });
});