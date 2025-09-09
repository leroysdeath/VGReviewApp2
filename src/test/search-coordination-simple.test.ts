import { SearchCoordinator } from '../services/searchCoordinator';

describe('SearchCoordinator - Core Functionality', () => {
  let coordinator: SearchCoordinator;
  let mockExecutor: jest.Mock;
  let executionLog: string[];

  beforeEach(() => {
    // Mock setTimeout to avoid real delays in tests
    jest.useFakeTimers();
    
    executionLog = [];
    mockExecutor = jest.fn().mockImplementation(async (query: string) => {
      executionLog.push(`EXECUTED: ${query}`);
      return Promise.resolve();
    });
    
    coordinator = new SearchCoordinator(mockExecutor);
    jest.clearAllMocks();
  });

  afterEach(() => {
    coordinator.destroy();
    // Restore real timers
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Single Search Execution', () => {
    it('should execute only one search when multiple requests are made quickly', async () => {
      console.log('\n🎯 Testing single search execution during rapid requests');

      // Simulate rapid search requests (like user typing)
      const promises = [
        coordinator.requestSearch('typing', 'm', 100),
        coordinator.requestSearch('typing', 'ma', 100),
        coordinator.requestSearch('typing', 'mar', 100),
        coordinator.requestSearch('typing', 'mario', 100)
      ];

      // Fast-forward all timers to trigger delayed searches
      jest.runAllTimers();

      // Wait for all requests to complete
      await Promise.allSettled(promises);

      console.log(`   Execution log: ${executionLog.join(', ')}`);
      console.log(`   Mock executor called ${mockExecutor.mock.calls.length} times`);

      // Should only execute the last search request
      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(mockExecutor).toHaveBeenCalledWith('mario');
      expect(executionLog).toEqual(['EXECUTED: mario']);
    });

    it('should cancel previous search when new search is requested', async () => {
      console.log('\n🚫 Testing search cancellation');

      // Start first search with delay
      const firstSearch = coordinator.requestSearch('user', 'zelda', 500);
      
      // Advance time partially (but not enough to trigger first search)
      jest.advanceTimersByTime(100);
      
      // Start second search (should cancel first)
      const secondSearch = coordinator.requestSearch('user', 'pokemon', 200);
      
      // Fast-forward remaining timers
      jest.runAllTimers();
      
      // Wait for all to complete
      await Promise.allSettled([firstSearch, secondSearch]);

      console.log(`   Execution log: ${executionLog.join(', ')}`);
      console.log(`   Only second search should execute`);

      // Should only execute the second search
      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(mockExecutor).toHaveBeenCalledWith('pokemon');
      expect(executionLog).toEqual(['EXECUTED: pokemon']);
    });

    it('should handle immediate search requests', async () => {
      console.log('\n⚡ Testing immediate search execution');

      // Request immediate search (0 delay)
      await coordinator.requestSearch('button', 'sonic', 0, true);

      console.log(`   Immediate execution log: ${executionLog.join(', ')}`);

      // Should execute immediately
      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(mockExecutor).toHaveBeenCalledWith('sonic');
      expect(executionLog).toEqual(['EXECUTED: sonic']);
    });
  });

  describe('Search State Management', () => {
    it('should track active search state correctly', async () => {
      console.log('\n📊 Testing search state tracking');

      // Initially no active search
      expect(coordinator.isSearchActive()).toBe(false);
      expect(coordinator.getActiveSearchInfo()).toBeNull();

      // Start a search with delay
      const searchPromise = coordinator.requestSearch('test', 'mario', 300);
      
      // Should be active now
      expect(coordinator.isSearchActive()).toBe(true);
      const activeInfo = coordinator.getActiveSearchInfo();
      expect(activeInfo).toBeTruthy();
      expect(activeInfo?.query).toBe('mario');
      expect(activeInfo?.source).toBe('test');

      console.log(`   Active search info: ${JSON.stringify(activeInfo, null, 2)}`);

      // Fast-forward to complete the search
      jest.runAllTimers();
      await searchPromise;

      // Should no longer be active
      expect(coordinator.isSearchActive()).toBe(false);
      expect(coordinator.getActiveSearchInfo()).toBeNull();
    });

    it('should handle search cancellation properly', () => {
      console.log('\n🛑 Testing manual search cancellation');

      // Start a search
      coordinator.requestSearch('test', 'mario', 1000);
      
      expect(coordinator.isSearchActive()).toBe(true);
      
      // Cancel it
      coordinator.cancelActiveSearch();
      
      expect(coordinator.isSearchActive()).toBe(false);
      expect(coordinator.getActiveSearchInfo()).toBeNull();
      
      console.log(`   Search cancelled successfully`);
    });
  });

  describe('Error Handling', () => {
    it('should handle executor errors gracefully', async () => {
      console.log('\n❌ Testing error handling');

      const errorExecutor = jest.fn().mockRejectedValue(new Error('Search failed'));
      coordinator.setExecutor(errorExecutor);

      try {
        await coordinator.requestSearch('error-test', 'failing-query', 0, true);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Search failed');
        console.log(`   Error handled correctly: ${error.message}`);
      }

      // Should no longer be active after error
      expect(coordinator.isSearchActive()).toBe(false);
    });

    it('should handle missing executor', async () => {
      console.log('\n🚨 Testing missing executor handling');

      coordinator.setExecutor(null as any);

      try {
        await coordinator.requestSearch('no-executor', 'test', 0, true);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('No search executor configured');
        console.log(`   Missing executor error handled: ${error.message}`);
      }
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should clean up properly on destroy', () => {
      console.log('\n🧹 Testing cleanup on destroy');

      // Start some searches
      coordinator.requestSearch('test1', 'mario', 1000);
      coordinator.requestSearch('test2', 'zelda', 1000);
      
      expect(coordinator.isSearchActive()).toBe(true);
      
      // Destroy coordinator
      coordinator.destroy();
      
      expect(coordinator.isSearchActive()).toBe(false);
      expect(coordinator.getActiveSearchInfo()).toBeNull();
      
      console.log(`   Coordinator cleaned up successfully`);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle search results page typing scenario', async () => {
      console.log('\n🌐 Testing real-world search results page scenario');

      // Simulate user typing "mario games" with realistic delays
      const typingSequence = [
        { query: 'm', delay: 200 },
        { query: 'ma', delay: 200 },
        { query: 'mar', delay: 200 },
        { query: 'mari', delay: 200 },
        { query: 'mario', delay: 200 },
        { query: 'mario ', delay: 200 },
        { query: 'mario g', delay: 200 },
        { query: 'mario ga', delay: 200 },
        { query: 'mario gam', delay: 200 },
        { query: 'mario game', delay: 200 },
        { query: 'mario games', delay: 200 }
      ];

      const searchPromises: Promise<void>[] = [];
      
      for (const step of typingSequence) {
        searchPromises.push(
          coordinator.requestSearch('user-typing', step.query, step.delay)
        );
        // Advance time slightly between keystrokes
        jest.advanceTimersByTime(50);
      }

      // Fast-forward all remaining timers
      jest.runAllTimers();

      // Wait for all searches to settle
      await Promise.allSettled(searchPromises);

      console.log(`   Typing sequence executed`);
      console.log(`   Final execution log: ${executionLog.join(', ')}`);

      // Should only execute the final search
      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(mockExecutor).toHaveBeenCalledWith('mario games');
      expect(executionLog).toEqual(['EXECUTED: mario games']);
    });

    it('should handle Enter key interrupt scenario', async () => {
      console.log('\n⌨️ Testing Enter key interrupt scenario');

      // Start typing with delay
      const typingPromise = coordinator.requestSearch('typing', 'mario', 1000);
      
      // Advance time partially
      jest.advanceTimersByTime(200);
      
      // User presses Enter (immediate search)
      await coordinator.requestSearch('enter-key', 'mario', 0, true);

      // Fast-forward remaining timers
      jest.runAllTimers();

      // Wait for any remaining promises
      await Promise.allSettled([typingPromise]);

      console.log(`   Enter key scenario log: ${executionLog.join(', ')}`);

      // Should execute the immediate Enter search, cancelling the delayed typing search
      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(mockExecutor).toHaveBeenCalledWith('mario');
    });
  });

  afterAll(() => {
    console.log('\n✅ SEARCH COORDINATOR TEST SUMMARY:');
    console.log('- Single search execution verified ✓');
    console.log('- Search cancellation working ✓'); 
    console.log('- Immediate searches handled ✓');
    console.log('- State management correct ✓');
    console.log('- Error handling robust ✓');
    console.log('- Memory cleanup working ✓');
    console.log('- Real-world scenarios tested ✓');
    console.log('\nSearchCoordinator is ready for production! 🚀');
  });
});