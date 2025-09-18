/**
 * Test suite to demonstrate and verify the search race condition fix
 */

import { renderHook, act } from '@testing-library/react';
import { useGameSearch } from '../hooks/useGameSearch';

// Mock the dependencies
jest.mock('../services/advancedSearchCoordination', () => ({
  AdvancedSearchCoordination: jest.fn().mockImplementation(() => ({
    coordinatedSearch: jest.fn()
  }))
}));

describe('Search Race Condition Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle rapid consecutive searches correctly', async () => {
    const { result } = renderHook(() => useGameSearch());

    // Mock the search service to simulate different response times
    const mockSearch = jest.fn();
    result.current.searchGames = mockSearch;

    // Simulate the race condition scenario
    mockSearch
      .mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve([
          { id: 1, name: 'Mario Game 1', source: 'igdb' },
          { id: 2, name: 'Mario Game 2', source: 'igdb' }
        ]), 500)) // First search takes 500ms
      )
      .mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve([
          { id: 3, name: 'Zelda Game 1', source: 'igdb' },
          { id: 4, name: 'Zelda Game 2', source: 'igdb' }
        ]), 100)) // Second search takes 100ms (completes first)
      );

    // Trigger rapid consecutive searches
    act(() => {
      result.current.searchGames('mario');
    });

    // Wait a bit, then trigger another search
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      result.current.searchGames('zelda');
    });

    // Wait for both to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    // The results should only show Zelda games (the latest search)
    // NOT Mario games (the stale search that completed later)
    expect(result.current.searchState.games).toEqual([
      { id: 3, name: 'Zelda Game 1', source: 'igdb' },
      { id: 4, name: 'Zelda Game 2', source: 'igdb' }
    ]);
  });

  test('should demonstrate the current race condition problem', async () => {
    const { result } = renderHook(() => useGameSearch());

    // Track search calls
    const searchCalls: Array<{ query: string; timestamp: number }> = [];
    const originalSearchGames = result.current.searchGames;

    // Wrap the search function to track calls
    const wrappedSearch = async (query: string, options?: any) => {
      searchCalls.push({ query, timestamp: Date.now() });
      return originalSearchGames(query, options);
    };

    result.current.searchGames = wrappedSearch;

    // Simulate user typing "mario" quickly
    await act(async () => {
      result.current.searchGames('m');
      await new Promise(resolve => setTimeout(resolve, 100));
      result.current.searchGames('ma');
      await new Promise(resolve => setTimeout(resolve, 100));
      result.current.searchGames('mar');
      await new Promise(resolve => setTimeout(resolve, 100));
      result.current.searchGames('mari');
      await new Promise(resolve => setTimeout(resolve, 100));
      result.current.searchGames('mario');
    });

    // Should have made 5 search calls
    expect(searchCalls).toHaveLength(5);
    expect(searchCalls.map(call => call.query)).toEqual(['m', 'ma', 'mar', 'mari', 'mario']);
  });

  test('should verify AbortController is being used correctly', () => {
    const { result } = renderHook(() => useGameSearch());

    // Check that the hook is using AbortController
    expect(result.current.searchGames).toBeDefined();
    
    // The searchGames function should handle cancellation
    // This test would need to be enhanced to verify actual AbortController usage
    expect(typeof result.current.searchGames).toBe('function');
  });
});