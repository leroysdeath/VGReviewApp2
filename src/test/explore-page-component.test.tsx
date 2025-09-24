import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { ExplorePage } from '../pages/ExplorePage';
import { ExploreGame } from '../services/exploreService';
import { faker } from '@faker-js/faker';

// ============================================
// Mock Dependencies
// ============================================

// Mock the services
jest.mock('../services/exploreService', () => ({
  fetchGamesWithReviewMetrics: jest.fn(),
}));

jest.mock('../hooks/useGameSearch', () => ({
  useGameSearch: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useSearchParams: jest.fn(),
}));

import { fetchGamesWithReviewMetrics } from '../services/exploreService';
import { useGameSearch } from '../hooks/useGameSearch';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
  redlight_flag: false, // Should always be false in results
  ...overrides,
});

const createMockExploreGamesList = (count: number = 10): ExploreGame[] => {
  return Array.from({ length: count }, (_, index) => {
    // Create games with decreasing unified scores for proper ranking
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

const createMockSearchGames = (count: number = 8): any[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: faker.number.int({ min: 1, max: 100000 }),
    igdb_id: faker.number.int({ min: 1000, max: 99999 }),
    name: `Search Result ${index + 1}`,
    cover_url: `https://images.igdb.com/igdb/image/upload/t_cover_big/${faker.string.alphanumeric(12)}.jpg`,
    platforms: faker.helpers.arrayElements(['PC', 'PlayStation 5', 'Xbox Series X'], 2),
    summary: faker.lorem.paragraph(),
    category: 0,
  }));
};

// ============================================
// Test Utilities
// ============================================

const renderExplorePage = () => {
  return render(
    <BrowserRouter>
      <ExplorePage />
    </BrowserRouter>
  );
};

const mockNavigate = jest.fn();
const mockSetSearchParams = jest.fn();
const mockSearchParams = new URLSearchParams();

// Mock search hook
const mockSearchState = {
  games: [],
  loading: false,
  error: null,
  source: null,
};

const mockSearchGames = jest.fn();
const mockSetSearchTerm = jest.fn();

// ============================================
// Test Setup
// ============================================

beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Setup router mocks
  (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  (useSearchParams as jest.Mock).mockReturnValue([mockSearchParams, mockSetSearchParams]);
  
  // Setup search hook mock
  (useGameSearch as jest.Mock).mockReturnValue({
    searchState: mockSearchState,
    searchGames: mockSearchGames,
    searchTerm: '',
    setSearchTerm: mockSetSearchTerm,
  });
  
  // Setup fetch mock
  (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(createMockExploreGamesList(10));
  
  // Mock window.innerWidth for responsive tests
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ============================================
// Test Suite
// ============================================

describe('ExplorePage Component', () => {
  
  // ============================================
  // Basic Rendering Tests
  // ============================================
  
  describe('Basic Rendering', () => {
    test('renders the explore page with default content', async () => {
      renderExplorePage();
      
      // Check for main heading
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      
      // Check for search input
      expect(screen.getByPlaceholderText(/search games/i)).toBeInTheDocument();
      
      // Check for view mode buttons (on desktop)
      expect(screen.getByRole('button', { name: /grid/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument();
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(fetchGamesWithReviewMetrics).toHaveBeenCalledWith('unified_score', 40);
      });
    });

    test('displays correct title in explore mode', async () => {
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText('Top Games by Rating, Reviews & Popularity')).toBeInTheDocument();
      });
    });

    test('displays info banner in explore mode', async () => {
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText(/games ranked by our unified algorithm/i)).toBeInTheDocument();
      });
    });

    test('displays results info with correct count', async () => {
      const mockGames = createMockExploreGamesList(5);
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);
      
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText('Showing top 5 games ranked by unified score')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Game Display Tests
  // ============================================
  
  describe('Game Display', () => {
    test('displays games in grid view by default', async () => {
      const mockGames = createMockExploreGamesList(5);
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);
      
      renderExplorePage();
      
      await waitFor(() => {
        mockGames.forEach((game, index) => {
          expect(screen.getByText(game.name)).toBeInTheDocument();
          // Check for ranking badge
          expect(screen.getByText((index + 1).toString())).toBeInTheDocument();
        });
      });
    });

    test('displays ranking badges in explore mode', async () => {
      const mockGames = createMockExploreGamesList(3);
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);
      
      renderExplorePage();
      
      await waitFor(() => {
        // Check for ranking badges 1, 2, 3
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    test('displays game ratings when available', async () => {
      const mockGames = [
        createMockExploreGame({ 
          name: 'Rated Game',
          avg_user_rating: 8.5,
          user_rating_count: 42
        })
      ];
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);
      
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText('Rated Game')).toBeInTheDocument();
        expect(screen.getByText('8.5')).toBeInTheDocument();
        expect(screen.getByText('42 reviews')).toBeInTheDocument();
      });
    });

    test('handles games without cover images gracefully', async () => {
      const mockGames = [
        createMockExploreGame({ 
          name: 'No Cover Game',
          cover_url: undefined
        })
      ];
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);
      
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText('No Cover Game')).toBeInTheDocument();
        // Should fall back to placeholder
        const images = screen.getAllByRole('img');
        expect(images.some(img => img.getAttribute('src')?.includes('placeholder'))).toBe(true);
      });
    });
  });

  // ============================================
  // View Mode Tests
  // ============================================
  
  describe('View Mode Switching', () => {
    test('switches from grid to list view', async () => {
      const mockGames = createMockExploreGamesList(3);
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);
      
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText(mockGames[0].name)).toBeInTheDocument();
      });
      
      // Click list view button
      const listButton = screen.getByRole('button', { name: /list/i });
      fireEvent.click(listButton);
      
      // In list view, should show "RANK" text
      await waitFor(() => {
        expect(screen.getAllByText('RANK')).toHaveLength(3);
      });
    });

    test('switches from list to grid view', async () => {
      const mockGames = createMockExploreGamesList(2);
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);
      
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText(mockGames[0].name)).toBeInTheDocument();
      });
      
      // Switch to list first
      fireEvent.click(screen.getByRole('button', { name: /list/i }));
      
      await waitFor(() => {
        expect(screen.getAllByText('RANK')).toHaveLength(2);
      });
      
      // Switch back to grid
      fireEvent.click(screen.getByRole('button', { name: /grid/i }));
      
      // RANK text should be gone in grid view
      await waitFor(() => {
        expect(screen.queryByText('RANK')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Search Functionality Tests
  // ============================================
  
  describe('Search Functionality', () => {
    test('shows search input and handles typing', async () => {
      renderExplorePage();
      
      const searchInput = screen.getByPlaceholderText(/search games/i);
      
      fireEvent.change(searchInput, { target: { value: 'Mario' } });
      
      expect(searchInput).toHaveValue('Mario');
    });

    test('switches to search mode when typing', async () => {
      const mockSearchGames = createMockSearchGames(3);
      
      (useGameSearch as jest.Mock).mockReturnValue({
        searchState: {
          games: mockSearchGames,
          loading: false,
          error: null,
          source: 'IGDB API',
        },
        searchGames: mockSearchGames,
        searchTerm: 'Mario',
        setSearchTerm: mockSetSearchTerm,
      });
      
      renderExplorePage();
      
      const searchInput = screen.getByPlaceholderText(/search games/i);
      
      // Type search term
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Mario' } });
      });
      
      // Should show search results title
      await waitFor(() => {
        expect(screen.getByText('Search Results for "Mario"')).toBeInTheDocument();
      });
      
      // Should show search results
      mockSearchGames.forEach(game => {
        expect(screen.getByText(game.name)).toBeInTheDocument();
      });
    });

    test('hides ranking badges in search mode', async () => {
      const mockSearchGames = createMockSearchGames(2);
      
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
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Test' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Search Results for "Test"')).toBeInTheDocument();
      });
      
      // Ranking badges should not be present
      expect(screen.queryByText('1')).not.toBeInTheDocument();
      expect(screen.queryByText('2')).not.toBeInTheDocument();
    });

    test('shows search source when available', async () => {
      const mockSearchGames = createMockSearchGames(2);
      
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
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Mario' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Found 2 games from IGDB API')).toBeInTheDocument();
      });
    });

    test('handles search with no results', async () => {
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
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'NonexistentGame' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('No games found for "NonexistentGame"')).toBeInTheDocument();
        expect(screen.getByText('Clear Search')).toBeInTheDocument();
      });
    });

    test('clears search when Clear Search button is clicked', async () => {
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
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'NonexistentGame' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Clear Search')).toBeInTheDocument();
      });
      
      const clearButton = screen.getByText('Clear Search');
      fireEvent.click(clearButton);
      
      expect(searchInput).toHaveValue('');
    });
  });

  // ============================================
  // Loading and Error States Tests
  // ============================================
  
  describe('Loading and Error States', () => {
    test('shows loading state for explore games', async () => {
      // Mock delayed response
      (fetchGamesWithReviewMetrics as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      renderExplorePage();
      
      expect(screen.getByText('Loading top-ranked games...')).toBeInTheDocument();
    });

    test('shows loading state for search', async () => {
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
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Mario' } });
      });
      
      expect(screen.getByText('Searching for "Mario"...')).toBeInTheDocument();
    });

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
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Mario' } });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Search failed')).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // Navigation Tests
  // ============================================
  
  describe('Navigation', () => {
    test('navigates to game page when game is clicked', async () => {
      const mockGames = createMockExploreGamesList(1);
      mockGames[0].igdb_id = 12345;
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);
      
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText(mockGames[0].name)).toBeInTheDocument();
      });
      
      // Click on the game
      fireEvent.click(screen.getByText(mockGames[0].name));
      
      expect(mockNavigate).toHaveBeenCalledWith('/game/12345');
    });

    test('navigates with internal id if igdb_id is not available', async () => {
      const mockGames = createMockExploreGamesList(1);
      mockGames[0].igdb_id = undefined;
      mockGames[0].id = 98765;
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);
      
      renderExplorePage();
      
      await waitFor(() => {
        expect(screen.getByText(mockGames[0].name)).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText(mockGames[0].name));
      
      expect(mockNavigate).toHaveBeenCalledWith('/game/98765');
    });
  });

  // ============================================
  // Responsive Design Tests
  // ============================================
  
  describe('Responsive Design', () => {
    test('sets list view on mobile devices', async () => {
      // Mock mobile width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      
      const mockGames = createMockExploreGamesList(2);
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockGames);
      
      renderExplorePage();
      
      // Trigger resize event
      fireEvent(window, new Event('resize'));
      
      await waitFor(() => {
        expect(screen.getAllByText('RANK')).toHaveLength(2);
      });
    });

    test('hides view mode buttons on mobile', async () => {
      // Mock mobile width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      
      renderExplorePage();
      
      // Trigger resize event
      fireEvent(window, new Event('resize'));
      
      // View mode buttons should have hidden class
      const gridButton = screen.getByRole('button', { name: /grid/i });
      expect(gridButton.closest('.hidden')).toBeInTheDocument();
    });
  });

  // ============================================
  // Integration Tests
  // ============================================
  
  describe('Integration Tests', () => {
    test('full workflow: load explore page, search, and clear search', async () => {
      const mockExploreGames = createMockExploreGamesList(3);
      const mockSearchGames = createMockSearchGames(2);
      
      // Initial load
      (fetchGamesWithReviewMetrics as jest.Mock).mockResolvedValue(mockExploreGames);
      
      let currentSearchState = {
        games: [],
        loading: false,
        error: null,
        source: null,
      };
      
      (useGameSearch as jest.Mock).mockImplementation(() => ({
        searchState: currentSearchState,
        searchGames: jest.fn().mockImplementation(() => {
          currentSearchState = {
            games: mockSearchGames,
            loading: false,
            error: null,
            source: 'IGDB API',
          };
        }),
        searchTerm: '',
        setSearchTerm: jest.fn(),
      }));
      
      renderExplorePage();
      
      // 1. Should show explore games initially
      await waitFor(() => {
        expect(screen.getByText('Top Games by Rating, Reviews & Popularity')).toBeInTheDocument();
        mockExploreGames.forEach(game => {
          expect(screen.getByText(game.name)).toBeInTheDocument();
        });
      });
      
      // 2. Search for games
      const searchInput = screen.getByPlaceholderText(/search games/i);
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Mario' } });
      });
      
      // Mock search state update
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
      
      // Re-render to apply mock changes
      renderExplorePage();
      
      await act(async () => {
        fireEvent.change(screen.getByPlaceholderText(/search games/i), { target: { value: 'Mario' } });
      });
      
      // 3. Should show search results
      await waitFor(() => {
        expect(screen.getByText('Search Results for "Mario"')).toBeInTheDocument();
      });
    });
  });
});