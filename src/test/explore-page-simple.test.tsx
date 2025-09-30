import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { faker } from '@faker-js/faker';
import { ExploreGame } from '../services/exploreService';

// ============================================
// Mock Dependencies
// ============================================

const mockNavigate = jest.fn();
const mockSetSearchParams = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

jest.mock('../services/exploreService', () => ({
  fetchGamesWithReviewMetrics: jest.fn(),
}));

jest.mock('../hooks/useGameSearch', () => ({
  useGameSearch: jest.fn(),
}));

jest.mock('../services/trackingService', () => ({
  trackEvent: jest.fn(),
  trackPageView: jest.fn(),
  trackSearch: jest.fn(),
}));

import { fetchGamesWithReviewMetrics } from '../services/exploreService';
import { useGameSearch } from '../hooks/useGameSearch';
import { ExplorePage } from '../pages/ExplorePage';
import { AuthModalProvider } from '../context/AuthModalContext';

// ============================================
// Test Data Factories
// ============================================

const createMockExploreGame = (overrides: Partial<ExploreGame> = {}): ExploreGame => ({
  id: faker.number.int({ min: 1, max: 100000 }),
  igdb_id: faker.number.int({ min: 1000, max: 99999 }),
  name: faker.commerce.productName(),
  description: faker.lorem.paragraphs(2),
  summary: faker.lorem.paragraph(),
  release_date: faker.date.past({ years: 5 }).toISOString().split('T')[0],
  cover_url: `https://images.igdb.com/igdb/image/upload/t_cover_big/${faker.string.alphanumeric(12)}.jpg`,
  platforms: faker.helpers.arrayElements(['PC', 'PlayStation 5', 'Xbox Series X', 'Nintendo Switch'], 2),
  avg_user_rating: faker.number.float({ min: 1, max: 10, multipleOf: 0.1 }),
  user_rating_count: faker.number.int({ min: 1, max: 500 }),
  category: faker.helpers.arrayElement([0, 1, 2, 8, 9]),
  greenlight_flag: faker.datatype.boolean({ probability: 0.8 }),
  redlight_flag: false,
  ...overrides,
});

const createMockGamesList = (count: number = 10): ExploreGame[] => {
  return Array.from({ length: count }, (_, index) => {
    const baseScore = 0.9 - (index * 0.1);
    const avgRating = 8.5 - (index * 0.3);
    const reviewCount = 100 - (index * 8);
    
    return createMockExploreGame({
      name: `Top Game #${index + 1}`,
      avg_user_rating: Math.max(1, avgRating),
      user_rating_count: Math.max(1, reviewCount),
    });
  });
};

// ============================================
// Test Setup
// ============================================

const renderExplorePage = () => {
  return render(
    <AuthModalProvider>
      <BrowserRouter>
        <ExplorePage />
      </BrowserRouter>
    </AuthModalProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  
  // Setup default mocks
  (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(createMockGamesList(5));
  
  (useGameSearch as jest.Mock).mockReturnValue({
    searchState: {
      games: [],
      loading: false,
      error: null,
      source: null,
    },
    searchGames: jest.fn(),
    searchTerm: '',
    setSearchTerm: jest.fn(),
  });
  
  // Mock window.innerWidth for responsive tests
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });
});

// ============================================
// Test Suite
// ============================================

describe('ExplorePage Simple Tests', () => {
  
  describe('Basic Rendering', () => {
    test('renders the main heading', async () => {
      await act(async () => {
        renderExplorePage();
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        expect(screen.getByText('Top Games by Popularity')).toBeInTheDocument();
      });
    });

    test('renders search input', async () => {
      await act(async () => {
        renderExplorePage();
      });

      expect(screen.getByPlaceholderText(/search games/i)).toBeInTheDocument();
    });

    test('calls fetchGamesWithReviewMetrics on mount', async () => {
      await act(async () => {
        renderExplorePage();
      });

      await waitFor(() => {
        expect(fetchGamesWithReviewMetrics).toHaveBeenCalledWith('unified_score', 40);
      });
    });

    test('displays info banner in explore mode', async () => {
      await act(async () => {
        renderExplorePage();
      });

      await waitFor(() => {
        expect(screen.getByText(/showing top.*games by popularity/i)).toBeInTheDocument();
      });
    });
  });

  describe('Game Display', () => {
    test('displays games when loaded', async () => {
      const mockGames = createMockGamesList(3);
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);

      await act(async () => {
        renderExplorePage();
      });

      await waitFor(() => {
        mockGames.forEach(game => {
          expect(screen.getByText(game.name)).toBeInTheDocument();
        });
      });
    });

    test('displays ranking numbers in explore mode', async () => {
      const mockGames = createMockGamesList(3);
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);
      
      renderExplorePage();
      
      await waitFor(() => {
        // Check for ranking badges 1, 2, 3
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    test('displays game ratings', async () => {
      const mockGames = [
        createMockExploreGame({ 
          name: 'High Rated Game',
          avg_user_rating: 9.2,
          user_rating_count: 156
        })
      ];
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);
      
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText('High Rated Game')).toBeInTheDocument();
        expect(screen.getByText('9.2')).toBeInTheDocument();
        expect(screen.getByText(/156.*review/i)).toBeInTheDocument();
      });
    });

    test('displays results count', async () => {
      const mockGames = createMockGamesList(7);
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);

      await act(async () => {
        renderExplorePage();
      });

      await waitFor(() => {
        expect(screen.getByText('Showing top 7 games by popularity')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    test('allows typing in search input', () => {
      renderExplorePage();
      
      const searchInput = screen.getByPlaceholderText(/search games/i);
      fireEvent.change(searchInput, { target: { value: 'Mario' } });
      
      expect(searchInput).toHaveValue('Mario');
    });

    test('switches to search mode when search results are available', async () => {
      const mockSearchGames = [
        { id: 1, name: 'Super Mario Bros', cover_url: 'test.jpg' },
        { id: 2, name: 'Mario Kart', cover_url: 'test2.jpg' }
      ];
      
      (useGameSearch as jest.Mock).mockReturnValue({
        searchState: {
          games: mockSearchGames,
          loading: false,
          error: null,
          source: 'IGDB API',
        },
        searchGames: jest.fn(),
        searchTerm: 'Mario',
        setSearchTerm: jest.fn(),
      });
      
      renderExplorePage();
      
      const searchInput = screen.getByPlaceholderText(/search games/i);
      fireEvent.change(searchInput, { target: { value: 'Mario' } });
      
      await waitFor(() => {
        expect(screen.getByText('Search Results for "Mario"')).toBeInTheDocument();
        expect(screen.getByText('Found 2 games from IGDB API')).toBeInTheDocument();
      });
    });

    test('hides ranking badges in search mode', async () => {
      const mockSearchGames = [
        { id: 1, name: 'Search Result 1', cover_url: 'test.jpg' },
        { id: 2, name: 'Search Result 2', cover_url: 'test2.jpg' }
      ];
      
      (useGameSearch as jest.Mock).mockReturnValue({
        searchState: {
          games: mockSearchGames,
          loading: false,
          error: null,
          source: 'Database',
        },
        searchGames: jest.fn(),
        searchTerm: 'Test',
        setSearchTerm: jest.fn(),
      });
      
      renderExplorePage();
      
      const searchInput = screen.getByPlaceholderText(/search games/i);
      fireEvent.change(searchInput, { target: { value: 'Test' } });
      
      await waitFor(() => {
        expect(screen.getByText('Search Results for "Test"')).toBeInTheDocument();
        // Ranking badges should not be present in search mode
        expect(screen.queryByText('1')).not.toBeInTheDocument();
        expect(screen.queryByText('2')).not.toBeInTheDocument();
      });
    });

    test('shows no results message when search returns empty', async () => {
      (useGameSearch as jest.Mock).mockReturnValue({
        searchState: {
          games: [],
          loading: false,
          error: null,
          source: null,
        },
        searchGames: jest.fn(),
        searchTerm: 'NonexistentGame',
        setSearchTerm: jest.fn(),
      });
      
      renderExplorePage();
      
      const searchInput = screen.getByPlaceholderText(/search games/i);
      fireEvent.change(searchInput, { target: { value: 'NonexistentGame' } });
      
      await waitFor(() => {
        expect(screen.getByText('No games found for "NonexistentGame"')).toBeInTheDocument();
        expect(screen.getByText('Clear Search')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    test('shows loading state for explore games', () => {
      // Mock delayed response
      (fetchGamesWithReviewMetrics as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );
      
      renderExplorePage();
      
      expect(screen.getByText('Loading top-ranked games...')).toBeInTheDocument();
    });

    test('shows loading state for search', async () => {
      // Set up the search loading state before render
      (useGameSearch as jest.Mock).mockReturnValue({
        searchState: {
          games: [],
          loading: true,
          error: null,
          source: null,
        },
        searchGames: jest.fn(),
        searchTerm: 'Mario',
        setSearchTerm: jest.fn(),
      });
      
      renderExplorePage();
      
      const searchInput = screen.getByPlaceholderText(/search games/i);
      fireEvent.change(searchInput, { target: { value: 'Mario' } });
      
      await waitFor(() => {
        expect(screen.getByText('Searching for "Mario"...')).toBeInTheDocument();
      });
    });
  });

  describe('Error States', () => {
    test('shows error state for explore games', async () => {
      (fetchGamesWithReviewMetrics as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load games. Please try again later.')).toBeInTheDocument();
      });
    });

    test('shows error state for search', async () => {
      (useGameSearch as jest.Mock).mockReturnValue({
        searchState: {
          games: [],
          loading: false,
          error: 'Search failed',
          source: null,
        },
        searchGames: jest.fn(),
        searchTerm: 'Mario',
        setSearchTerm: jest.fn(),
      });
      
      renderExplorePage();
      
      const searchInput = screen.getByPlaceholderText(/search games/i);
      fireEvent.change(searchInput, { target: { value: 'Mario' } });
      
      await waitFor(() => {
        expect(screen.getByText('Search failed')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    test('navigates to game page when game is clicked', async () => {
      const mockGames = [createMockExploreGame({ 
        name: 'Clickable Game',
        igdb_id: 12345 
      })];
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);
      
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText('Clickable Game')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Clickable Game'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/game/12345');
    });

    test('uses internal ID when IGDB ID is not available', async () => {
      const mockGames = [createMockExploreGame({ 
        name: 'Internal ID Game',
        id: 98765,
        igdb_id: undefined 
      })];
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);
      
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText('Internal ID Game')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Internal ID Game'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/game/98765');
    });
  });

  describe('Data Quality', () => {
    test('handles empty game list gracefully', async () => {
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue([]);
      
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText('No games found with reviews')).toBeInTheDocument();
      });
    });

    test('displays game metadata correctly', async () => {
      const mockGames = [createMockExploreGame({
        name: 'Test Game 2023',
        release_date: '2023-05-15',
        platforms: ['PC', 'PlayStation 5'],
        avg_user_rating: 8.7,
        user_rating_count: 234
      })];
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);
      
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText('Test Game 2023')).toBeInTheDocument();
        expect(screen.getByText('2023')).toBeInTheDocument();
        expect(screen.getByText('8.7')).toBeInTheDocument();
        expect(screen.getByText(/234.*review/i)).toBeInTheDocument();
      });
    });
  });

  describe('Integration Tests', () => {
    test('full flow: load explore games, then search', async () => {
      const mockExploreGames = createMockGamesList(2);
      const mockSearchGames = [
        { id: 100, name: 'Mario World', cover_url: 'mario.jpg' }
      ];
      
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockExploreGames);
      
      // Initial render with explore games
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText('Top Games by Popularity')).toBeInTheDocument();
        mockExploreGames.forEach(game => {
          expect(screen.getByText(game.name)).toBeInTheDocument();
        });
      });
      
      // Update search mock and type in search
      (useGameSearch as jest.Mock).mockReturnValue({
        searchState: {
          games: mockSearchGames,
          loading: false,
          error: null,
          source: 'IGDB API',
        },
        searchGames: jest.fn(),
        searchTerm: 'Mario',
        setSearchTerm: jest.fn(),
      });
      
      const searchInput = screen.getByPlaceholderText(/search games/i);
      fireEvent.change(searchInput, { target: { value: 'Mario' } });
      
      // Should switch to search mode
      await waitFor(() => {
        expect(screen.getByText('Search Results for "Mario"')).toBeInTheDocument();
      });
    });
  });
});