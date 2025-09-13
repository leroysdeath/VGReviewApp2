/**
 * Custom hook for privacy-compliant tracking
 */

import { useCallback, useEffect, useRef } from 'react';
import { trackingService, ViewSource } from '../services/trackingService';
import { useAuth } from './useAuth';

interface UseTrackingOptions {
  gameId?: number;
  source?: ViewSource;
  autoTrack?: boolean;
  throttle?: boolean;
}

export const useTracking = (options: UseTrackingOptions = {}) => {
  const { user } = useAuth();
  const hasTracked = useRef(false);
  const userId = user?.databaseId;

  // Auto-track on mount if specified
  useEffect(() => {
    if (options.autoTrack && options.gameId && !hasTracked.current) {
      trackingService.trackGameView(
        options.gameId,
        options.source || 'direct',
        userId
      );
      hasTracked.current = true;
    }
  }, [options.autoTrack, options.gameId, options.source, userId]);

  // Manual track function
  const trackView = useCallback(
    async (gameId: number, source?: ViewSource) => {
      if (options.throttle && hasTracked.current) {
        return { success: true, tracked: false, reason: 'Already tracked in this session' };
      }

      const result = await trackingService.trackGameView(
        gameId,
        source || options.source || 'direct',
        userId
      );

      if (result.tracked && options.throttle) {
        hasTracked.current = true;
      }

      return result;
    },
    [userId, options.source, options.throttle]
  );

  // Track search click
  const trackSearchClick = useCallback(
    async (gameId: number) => {
      return trackingService.trackSearchResultClick(gameId, userId);
    },
    [userId]
  );

  // Track recommendation click
  const trackRecommendationClick = useCallback(
    async (gameId: number) => {
      return trackingService.trackRecommendationClick(gameId, userId);
    },
    [userId]
  );

  // Track list item click
  const trackListClick = useCallback(
    async (gameId: number) => {
      return trackingService.trackListItemClick(gameId, userId);
    },
    [userId]
  );

  // Track review view
  const trackReviewView = useCallback(
    async (gameId: number) => {
      return trackingService.trackReviewView(gameId, userId);
    },
    [userId]
  );

  // Track profile game view
  const trackProfileGameView = useCallback(
    async (gameId: number) => {
      return trackingService.trackProfileGameView(gameId, userId);
    },
    [userId]
  );

  // Get game statistics
  const getGameStats = useCallback(
    async (gameId: number) => {
      return trackingService.getGameStats(gameId);
    },
    []
  );

  // Get trending games
  const getTrendingGames = useCallback(
    async (limit?: number) => {
      return trackingService.getTrendingGames(limit);
    },
    []
  );

  return {
    trackView,
    trackSearchClick,
    trackRecommendationClick,
    trackListClick,
    trackReviewView,
    trackProfileGameView,
    getGameStats,
    getTrendingGames,
    hasTracked: hasTracked.current
  };
};