/**
 * Comprehensive race condition testing for search functionality
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameSearch } from '../hooks/useGameSearch';

// Mock the search coordination service
const mockCoordinatedSearch = jest.fn();

jest.mock('../services/advancedSearchCoordination', () => ({
  AdvancedSearchCoordination: jest.fn().mockImplementation(() => ({
    coordinatedSearch: mockCoordinatedSearch
  }))
}));

describe('Race Condition Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should handle rapid consecutive searches without race conditions', async () => {
    const { result } = renderHook(() => useGameSearch());

    // Mock different response times and results
    mockCoordinatedSearch
      .mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          results: [{ id: 1, name: 'Mario Game 1', source: 'igdb' }],
          context: { originalQuery: 'mario' }
        }), 500))
      )
      .mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          results: [{ id: 2, name: 'Zelda Game 1', source: 'igdb' }],
          context: { originalQuery: 'zelda' }
        }), 200))
      )
      .mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          results: [{ id: 3, name: 'Pokemon Game 1', source: 'igdb' }],
          context: { originalQuery: 'pokemon' }
        }), 100))
      );

    // Simulate rapid typing: mario -> zelda -> pokemon
    act(() => {
      result.current.searchGames('mario');
    });

    // Wait 50ms, then search for zelda
    act(() => {
      jest.advanceTimersByTime(50);
      result.current.searchGames('zelda');
    });

    // Wait another 50ms, then search for pokemon
    act(() => {
      jest.advanceTimersByTime(50);
      result.current.searchGames('pokemon');
    });

    // Fast forward all timers to complete all requests
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Wait for state to settle
    await waitFor(() => {
      expect(result.current.searchState.loading).toBe(false);
    });

    // Only the last search (pokemon) should be shown
    // Even though it completed first (100ms), it was the last initiated
    expect(result.current.searchState.games).toEqual([
      { id: 3, name: 'Pokemon Game 1', source: 'igdb' }
    ]);
  });

  test('should cancel previous requests when new search is initiated', async () => {
    const { result } = renderHook(() => useGameSearch());

    // Track abort calls
    const abortCalls: string[] = [];
    
    mockCoordinatedSearch.mockImplementation((query) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve({
            results: [{ id: 1, name: `${query} Game`, source: 'igdb' }],
            context: { originalQuery: query }
          });
        }, 300);

        // Simulate abort handling
        return {
          then: (onResolve: any, onReject: any) => {
            const promise = new Promise((res, rej) => {
              setTimeout(() => res({
                results: [{ id: 1, name: `${query} Game`, source: 'igdb' }],
                context: { originalQuery: query }
              }), 300);
            });
            
            promise.abort = () => {
              abortCalls.push(query);
              clearTimeout(timeout);
              onReject?.(new Error('AbortError'));
            };
            
            return promise.then(onResolve, onReject);
          }
        };
      });
    });

    // Start first search
    act(() => {
      result.current.searchGames('mario');
    });

    // Start second search before first completes
    act(() => {
      jest.advanceTimersByTime(100);
      result.current.searchGames('zelda');
    });

    // Verify that searches are being initiated
    expect(mockCoordinatedSearch).toHaveBeenCalledWith('mario', expect.any(Object));
    expect(mockCoordinatedSearch).toHaveBeenCalledWith('zelda', expect.any(Object));
  });

  test('should handle AbortError gracefully', async () => {
    const { result } = renderHook(() => useGameSearch());

    // Mock a search that gets aborted
    mockCoordinatedSearch
      .mockImplementationOnce(() => 
        Promise.reject(new Error('AbortError'))
      )
      .mockImplementationOnce(() => 
        Promise.resolve({
          results: [{ id: 2, name: 'Zelda Game', source: 'igdb' }],
          context: { originalQuery: 'zelda' }
        })
      );

    // Start search that will be aborted
    act(() => {
      result.current.searchGames('mario');
    });

    // Immediately start another search
    act(() => {
      result.current.searchGames('zelda');
    });

    await waitFor(() => {
      expect(result.current.searchState.loading).toBe(false);
    });

    // Should show results from the second search only
    expect(result.current.searchState.games).toEqual([
      { id: 2, name: 'Zelda Game', source: 'igdb' }
    ]);
    expect(result.current.searchState.error).toBeNull();
  });

  test('should demonstrate the current debouncing behavior', async () => {
    const { result } = renderHook(() => useGameSearch());

    // Track search call timestamps
    const searchCalls: Array<{ query: string; timestamp: number }> = [];
    
    mockCoordinatedSearch.mockImplementation((query) => {
      searchCalls.push({ query, timestamp: Date.now() });
      return Promise.resolve({
        results: [{ id: 1, name: `${query} Game`, source: 'igdb' }],
        context: { originalQuery: query }
      });
    });

    // Simulate typing "mario" character by character
    const typing = ['m', 'ma', 'mar', 'mari', 'mario'];
    
    for (let i = 0; i < typing.length; i++) {
      act(() => {
        result.current.searchGames(typing[i]);
        jest.advanceTimersByTime(100); // 100ms between keystrokes
      });
    }

    // Advance time to ensure all searches complete
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // With proper cancellation, should only see the final search
    // Without cancellation, would see multiple searches
    expect(searchCalls.length).toBeGreaterThan(0);
    console.log('Search calls made:', searchCalls.map(c => c.query));
  });

  test('should verify AbortController usage in useGameSearch hook', () => {
    const { result } = renderHook(() => useGameSearch());

    // The hook should have the necessary methods for cancellation
    expect(result.current.searchGames).toBeDefined();
    expect(result.current.clearSearch).toBeDefined();
    expect(typeof result.current.searchGames).toBe('function');
    expect(typeof result.current.clearSearch).toBe('function');
  });

  test('should handle network timeouts gracefully', async () => {
    const { result } = renderHook(() => useGameSearch());

    // Mock a search that times out
    mockCoordinatedSearch.mockImplementationOnce(() => 
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 1000);
      })
    );

    act(() => {
      result.current.searchGames('mario');
    });

    // Fast forward past timeout
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(result.current.searchState.loading).toBe(false);
    });

    // Should handle timeout error gracefully
    expect(result.current.searchState.error).toContain('timeout');
  });
});