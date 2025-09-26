/**
 * Unit tests for Review Service
 * Tests core review CRUD operations and business logic
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
      select: jest.fn(() => ({
        single: jest.fn(() => ({
          data: null,
          error: null
        }))
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        error: null
      }))
    }))
  }))
};

// Mock the module before importing
jest.mock('../services/supabase', () => ({
  supabase: mockSupabase
}));

import { reviewService } from '../services/reviewService';

describe('Review Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Review', () => {
    it('should create a new review successfully', async () => {
      const mockReview = {
        id: 1,
        game_id: 123,
        user_id: 456,
        rating: 4.5,
        review_text: 'Great game!',
        created_at: new Date().toISOString()
      };

      (mockSupabase.from().insert().select().single as jest.Mock).mockResolvedValue({
        data: mockReview,
        error: null
      });

      const reviewData = {
        game_id: 123,
        user_id: 456,
        rating: 4.5,
        review_text: 'Great game!'
      };

      const result = await reviewService.createReview(reviewData);

      expect(result).toEqual(mockReview);
      expect(mockSupabase.from).toHaveBeenCalledWith('rating');
    });

    it('should handle review creation errors', async () => {
      (mockSupabase.from().insert().select().single as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const reviewData = {
        game_id: 123,
        user_id: 456,
        rating: 4.5,
        review_text: 'Great game!'
      };

      await expect(reviewService.createReview(reviewData)).rejects.toThrow('Database error');
    });
  });

  describe('Get Reviews', () => {
    it('should fetch reviews for a game', async () => {
      const mockReviews = [
        { id: 1, game_id: 123, rating: 4.5, review_text: 'Great!' },
        { id: 2, game_id: 123, rating: 3.0, review_text: 'Okay' }
      ];

      (mockSupabase.from().select().eq().order as jest.Mock).mockResolvedValue({
        data: mockReviews,
        error: null
      });

      const result = await reviewService.getReviewsForGame(123);

      expect(result).toEqual(mockReviews);
      expect(mockSupabase.from).toHaveBeenCalledWith('rating');
    });

    it('should fetch user reviews', async () => {
      const mockReviews = [
        { id: 1, user_id: 456, rating: 4.5, review_text: 'Great!' }
      ];

      (mockSupabase.from().select().eq().order as jest.Mock).mockResolvedValue({
        data: mockReviews,
        error: null
      });

      const result = await reviewService.getUserReviews(456);

      expect(result).toEqual(mockReviews);
    });
  });

  describe('Update Review', () => {
    it('should update an existing review', async () => {
      const updatedReview = {
        id: 1,
        rating: 5.0,
        review_text: 'Updated: Excellent game!'
      };

      (mockSupabase.from().update().eq().select().single as jest.Mock).mockResolvedValue({
        data: updatedReview,
        error: null
      });

      const result = await reviewService.updateReview(1, {
        rating: 5.0,
        review_text: 'Updated: Excellent game!'
      });

      expect(result).toEqual(updatedReview);
    });
  });

  describe('Delete Review', () => {
    it('should delete a review successfully', async () => {
      (mockSupabase.from().delete().eq as jest.Mock).mockResolvedValue({
        error: null
      });

      await expect(reviewService.deleteReview(1, 456)).resolves.not.toThrow();
    });
  });

  describe('Rating Calculations', () => {
    it('should calculate average rating for a game', async () => {
      const mockRatings = [
        { rating: 4.5 },
        { rating: 3.0 },
        { rating: 5.0 }
      ];

      (mockSupabase.from().select().eq as jest.Mock).mockResolvedValue({
        data: mockRatings,
        error: null
      });

      const result = await reviewService.getAverageRating(123);

      expect(result).toBeCloseTo(4.17, 2);
    });

    it('should handle games with no ratings', async () => {
      (mockSupabase.from().select().eq as jest.Mock).mockResolvedValue({
        data: [],
        error: null
      });

      const result = await reviewService.getAverageRating(123);

      expect(result).toBe(0);
    });
  });
});