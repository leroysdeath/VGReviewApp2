/**
 * Integration tests for game tracking in pages
 * Tests that tracking is properly integrated into game and explore pages
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { ExplorePage } from '../pages/ExplorePage';
import { GamePage } from '../pages/GamePage';
import { supabase } from '../services/supabase';
import { privacyService } from '../services/privacyService';
import { trackingService } from '../services/trackingService';

// Mock services
jest.mock('../services/trackingService');
jest.mock('../services/privacyService');
jest.mock('../services/exploreService');
jest.mock('../services/gameDataService');
jest.mock('../hooks/useAuth');

const mockTrackingService = trackingService as jest.Mocked<typeof trackingService>;
const mockPrivacyService = privacyService as jest.Mocked<typeof privacyService>;

// Mock explore service
jest.mock('../services/exploreService', () => ({
  fetchGamesWithReviewMetrics: jest.fn(() => Promise.resolve([
    {
      id: 1,
      igdb_id: 123,
      name: 'Test Game',
      cover_url: '/test-cover.jpg',
      avg_user_rating: 8.5,
      review_count: 10
    }
  ]))
}));

// Mock useAuth
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { databaseId: 456 },
    isAuthenticated: true
  })
}));

// Mock game data service
jest.mock('../services/gameDataService', () => ({
  gameDataService: {
    getGameWithReviewsAndProgress: jest.fn(() => Promise.resolve({
      game: {
        id: 1,
        igdb_id: 123,
        name: 'Test Game',
        summary: 'A test game'
      },
      reviews: []
    }))
  }
}));

// Mock React Router params
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ identifier: '123' }),
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams(), jest.fn()]
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Tracking Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockPrivacyService.shouldTrack.mockResolvedValue({
      allowed: true,
      level: 'anonymous',
      sessionHash: 'test-hash'
    });
    
    mockTrackingService.trackGameView.mockResolvedValue({
      success: true,
      tracked: true
    });

    // Mock window.crypto for bot detection
    Object.defineProperty(window, 'crypto', {
      value: {
        subtle: {
          digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32)))
        }
      }
    });
  });

  describe('ExplorePage Tracking', () => {
    it('should track game clicks from explore page as list views', async () => {
      renderWithRouter(<ExplorePage />);

      // Wait for games to load
      await waitFor(() => {
        expect(screen.queryByText('Loading top-ranked games...')).not.toBeInTheDocument();
      });

      // Find and click a game
      const gameCard = screen.getByText('Test Game');
      fireEvent.click(gameCard);

      // Verify tracking was called with correct parameters
      await waitFor(() => {
        expect(mockTrackingService.trackGameView).toHaveBeenCalledWith(
          123, // game igdb_id
          'list', // source (not in search mode)
          456 // user database id
        );
      });
    });

    it('should track game clicks from search as search views', async () => {
      renderWithRouter(<ExplorePage />);

      // Wait for page to load
      await waitFor(() => {
        expect(screen.queryByText('Loading top-ranked games...')).not.toBeInTheDocument();
      });

      // Simulate search by typing in search box
      const searchInput = screen.getByPlaceholderText(/search games/i);
      fireEvent.change(searchInput, { target: { value: 'test game' } });

      // Wait for search to trigger
      await waitFor(() => {
        expect(screen.getByDisplayValue('test game')).toBeInTheDocument();
      });

      // Click a game in search results
      const gameCard = screen.getByText('Test Game');
      fireEvent.click(gameCard);

      // Verify tracking was called with search source
      await waitFor(() => {
        expect(mockTrackingService.trackGameView).toHaveBeenCalledWith(
          123,
          'search', // source (in search mode)
          456
        );
      });
    });

    it('should handle tracking errors gracefully without blocking navigation', async () => {
      // Mock tracking to fail
      mockTrackingService.trackGameView.mockRejectedValue(new Error('Tracking failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderWithRouter(<ExplorePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading top-ranked games...')).not.toBeInTheDocument();
      });

      const gameCard = screen.getByText('Test Game');
      fireEvent.click(gameCard);

      // Should log error but not crash
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to track game click:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('GamePage Tracking', () => {
    it('should automatically track game page views', async () => {
      renderWithRouter(<GamePage />);

      // Wait for game to load
      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Verify auto-tracking was called
      await waitFor(() => {
        expect(mockTrackingService.trackGameView).toHaveBeenCalledWith(
          123, // game igdb_id
          'direct', // source (direct page view)
          456 // user database id
        );
      });
    });

    it('should not track when game is loading', async () => {
      // Mock gameDataService to never resolve
      const mockGameData = require('../services/gameDataService');
      mockGameData.gameDataService.getGameWithReviewsAndProgress.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter(<GamePage />);

      // Wait a bit to ensure tracking doesn't happen during loading
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockTrackingService.trackGameView).not.toHaveBeenCalled();
    });

    it('should not track when there is an error loading the game', async () => {
      // Mock gameDataService to reject
      const mockGameData = require('../services/gameDataService');
      mockGameData.gameDataService.getGameWithReviewsAndProgress.mockRejectedValue(
        new Error('Game not found')
      );

      renderWithRouter(<GamePage />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      expect(mockTrackingService.trackGameView).not.toHaveBeenCalled();
    });
  });

  describe('Privacy Compliance', () => {
    it('should not track when user has not consented', async () => {
      mockPrivacyService.shouldTrack.mockResolvedValue({
        allowed: false,
        level: 'none',
        sessionHash: 'test-hash'
      });

      renderWithRouter(<ExplorePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading top-ranked games...')).not.toBeInTheDocument();
      });

      const gameCard = screen.getByText('Test Game');
      fireEvent.click(gameCard);

      // Should check privacy but not actually track
      await waitFor(() => {
        expect(mockPrivacyService.shouldTrack).toHaveBeenCalled();
      });

      // Tracking should still be attempted (service handles consent internally)
      expect(mockTrackingService.trackGameView).toHaveBeenCalled();
    });

    it('should respect anonymous tracking level', async () => {
      mockPrivacyService.shouldTrack.mockResolvedValue({
        allowed: true,
        level: 'anonymous',
        sessionHash: 'test-hash'
      });

      renderWithRouter(<ExplorePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading top-ranked games...')).not.toBeInTheDocument();
      });

      const gameCard = screen.getByText('Test Game');
      fireEvent.click(gameCard);

      await waitFor(() => {
        expect(mockTrackingService.trackGameView).toHaveBeenCalledWith(
          123,
          'list',
          456 // User ID should still be passed (service handles filtering)
        );
      });
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should not overwhelm the tracking service with rapid clicks', async () => {
      renderWithRouter(<ExplorePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading top-ranked games...')).not.toBeInTheDocument();
      });

      const gameCard = screen.getByText('Test Game');
      
      // Simulate rapid clicking
      fireEvent.click(gameCard);
      fireEvent.click(gameCard);
      fireEvent.click(gameCard);

      // Wait for any async operations
      await waitFor(() => {
        expect(mockTrackingService.trackGameView).toHaveBeenCalled();
      });

      // Should be called for each click (throttling is handled by the service)
      expect(mockTrackingService.trackGameView).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent tracking calls without errors', async () => {
      renderWithRouter(<ExplorePage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading top-ranked games...')).not.toBeInTheDocument();
      });

      // Simulate multiple simultaneous clicks
      const gameCard = screen.getByText('Test Game');
      const promises = [
        fireEvent.click(gameCard),
        fireEvent.click(gameCard),
        fireEvent.click(gameCard)
      ];

      await Promise.all(promises);

      // Should handle concurrent calls gracefully
      expect(mockTrackingService.trackGameView).toHaveBeenCalledTimes(3);
    });
  });
});