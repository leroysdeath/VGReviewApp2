/**
 * SearchCoordinator - Centralized search management to prevent duplicate searches
 * and race conditions between different search components
 */

interface SearchRequest {
  id: string;
  source: string;
  query: string;
  timestamp: number;
}

interface SearchExecutor {
  (query: string): Promise<any>;
}

export class SearchCoordinator {
  private activeSearchId: string | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private searchExecutor: SearchExecutor | null = null;
  private pendingRequests = new Map<string, SearchRequest>();

  constructor(executor?: SearchExecutor) {
    this.searchExecutor = executor;
  }

  /**
   * Set the function that will execute the actual search
   */
  setExecutor(executor: SearchExecutor) {
    this.searchExecutor = executor;
  }

  /**
   * Request a search with debouncing and cancellation
   */
  async requestSearch(
    source: string, 
    query: string, 
    delay: number = 1500,
    immediate: boolean = false
  ): Promise<void> {
    // Generate unique search ID
    const searchId = `${source}-${Date.now()}-${Math.random()}`;
    
    // Cancel any existing search
    this.cancelActiveSearch();
    
    // Set this as the active search
    this.activeSearchId = searchId;
    
    // Store request info
    const request: SearchRequest = {
      id: searchId,
      source,
      query: query.trim(),
      timestamp: Date.now()
    };
    
    this.pendingRequests.set(searchId, request);
    
    console.log(`🎯 SearchCoordinator: Requesting search from ${source} for "${query}" (delay: ${delay}ms, immediate: ${immediate})`);
    
    if (immediate || delay === 0) {
      return this.executeSearch(searchId);
    }
    
    return new Promise((resolve, reject) => {
      this.debounceTimer = setTimeout(async () => {
        try {
          await this.executeSearch(searchId);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }

  /**
   * Execute search only if it's still the active request
   */
  private async executeSearch(searchId: string): Promise<void> {
    // Check if this search is still active
    if (this.activeSearchId !== searchId) {
      console.log(`🚫 SearchCoordinator: Search ${searchId} cancelled (no longer active)`);
      return;
    }

    const request = this.pendingRequests.get(searchId);
    if (!request) {
      console.warn(`⚠️ SearchCoordinator: No request found for ${searchId}`);
      return;
    }

    if (!this.searchExecutor) {
      console.error(`❌ SearchCoordinator: No search executor set`);
      throw new Error('No search executor configured');
    }

    console.log(`✅ SearchCoordinator: Executing search for "${request.query}" from ${request.source}`);
    
    try {
      await this.searchExecutor(request.query);
      console.log(`🎉 SearchCoordinator: Search completed successfully`);
    } catch (error) {
      console.error(`❌ SearchCoordinator: Search failed:`, error);
      throw error;
    } finally {
      // Clean up
      this.pendingRequests.delete(searchId);
      if (this.activeSearchId === searchId) {
        this.activeSearchId = null;
      }
    }
  }

  /**
   * Cancel any active search
   */
  cancelActiveSearch(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.activeSearchId) {
      console.log(`🚫 SearchCoordinator: Cancelling active search ${this.activeSearchId}`);
      this.pendingRequests.delete(this.activeSearchId);
      this.activeSearchId = null;
    }
  }

  /**
   * Check if a search is currently active
   */
  isSearchActive(): boolean {
    return this.activeSearchId !== null;
  }

  /**
   * Get info about the current active search
   */
  getActiveSearchInfo(): SearchRequest | null {
    if (!this.activeSearchId) return null;
    return this.pendingRequests.get(this.activeSearchId) || null;
  }

  /**
   * Clean up on unmount
   */
  destroy(): void {
    this.cancelActiveSearch();
    this.pendingRequests.clear();
    this.searchExecutor = null;
  }
}

/**
 * Hook to use SearchCoordinator in React components
 */
import { useRef, useEffect, useCallback } from 'react';

export function useSearchCoordinator(searchExecutor?: SearchExecutor) {
  const coordinatorRef = useRef<SearchCoordinator | null>(null);

  // Initialize coordinator
  if (!coordinatorRef.current) {
    coordinatorRef.current = new SearchCoordinator(searchExecutor);
  }

  // Update executor if provided
  useEffect(() => {
    if (searchExecutor && coordinatorRef.current) {
      coordinatorRef.current.setExecutor(searchExecutor);
    }
  }, [searchExecutor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      coordinatorRef.current?.destroy();
    };
  }, []);

  // Provide convenient methods
  const requestSearch = useCallback((
    source: string,
    query: string,
    delay?: number,
    immediate?: boolean
  ) => {
    return coordinatorRef.current?.requestSearch(source, query, delay, immediate) || Promise.resolve();
  }, []);

  const cancelSearch = useCallback(() => {
    coordinatorRef.current?.cancelActiveSearch();
  }, []);

  const isSearchActive = useCallback(() => {
    return coordinatorRef.current?.isSearchActive() || false;
  }, []);

  return {
    requestSearch,
    cancelSearch,
    isSearchActive,
    coordinator: coordinatorRef.current
  };
}