import { IGDBGame } from '../types/igdb';
import { gameSyncService } from '../services/gameSyncService';

interface QueueItem {
  games: IGDBGame[];
  retryCount: number;
  addedAt: Date;
}

/**
 * Background queue for processing game saves without blocking search
 */
class SyncQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private maxRetries = 3;
  private processInterval: NodeJS.Timeout | null = null;
  private failedItems: QueueItem[] = [];

  constructor() {
    // Start processing loop
    this.startProcessing();
  }

  /**
   * Add games to the sync queue
   */
  add(games: IGDBGame[]): void {
    if (!games || games.length === 0) return;

    console.log(`📥 Adding ${games.length} games to sync queue`);
    
    this.queue.push({
      games,
      retryCount: 0,
      addedAt: new Date()
    });

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Start the processing loop
   */
  private startProcessing(): void {
    // Process queue every 5 seconds if there are items
    this.processInterval = setInterval(() => {
      if (this.queue.length > 0 && !this.processing) {
        this.processQueue();
      }
    }, 5000);
  }

  /**
   * Process items in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    console.log(`🔄 Processing sync queue (${this.queue.length} batches)`);

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        // Process batch
        await gameSyncService.saveGamesFromIGDB(item.games);
        console.log(`✅ Successfully synced ${item.games.length} games from queue`);

        // Rate limiting between batches
        await this.delay(1000);
      } catch (error) {
        console.error(`❌ Sync queue error:`, error);

        // Handle retry logic
        if (item.retryCount < this.maxRetries) {
          item.retryCount++;
          console.log(`🔁 Retrying batch (attempt ${item.retryCount}/${this.maxRetries})`);
          
          // Re-add to queue with exponential backoff
          setTimeout(() => {
            this.queue.push(item);
          }, Math.pow(2, item.retryCount) * 60000); // 1min, 2min, 4min
        } else {
          console.error(`❌ Max retries reached for batch, moving to failed items`);
          this.failedItems.push(item);
        }
      }
    }

    this.processing = false;
    console.log('✅ Sync queue processing complete');
  }

  /**
   * Retry failed items
   */
  async retryFailed(): Promise<void> {
    if (this.failedItems.length === 0) {
      console.log('No failed items to retry');
      return;
    }

    console.log(`🔁 Retrying ${this.failedItems.length} failed batches`);
    
    // Move failed items back to queue
    while (this.failedItems.length > 0) {
      const item = this.failedItems.shift();
      if (item) {
        item.retryCount = 0; // Reset retry count
        this.queue.push(item);
      }
    }

    // Process queue
    if (!this.processing) {
      await this.processQueue();
    }
  }

  /**
   * Get queue statistics
   */
  getStatistics(): {
    queueLength: number;
    failedCount: number;
    isProcessing: boolean;
    totalGamesQueued: number;
    oldestItemAge: number | null;
  } {
    const totalGamesQueued = this.queue.reduce((sum, item) => sum + item.games.length, 0);
    const oldestItem = this.queue[0];
    const oldestItemAge = oldestItem 
      ? Date.now() - oldestItem.addedAt.getTime()
      : null;

    return {
      queueLength: this.queue.length,
      failedCount: this.failedItems.length,
      isProcessing: this.processing,
      totalGamesQueued,
      oldestItemAge
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    console.log('🗑️ Clearing sync queue');
    this.queue = [];
    this.failedItems = [];
  }

  /**
   * Stop processing
   */
  stop(): void {
    console.log('🛑 Stopping sync queue');
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    this.processing = false;
  }

  /**
   * Resume processing
   */
  resume(): void {
    console.log('▶️ Resuming sync queue');
    this.startProcessing();
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process a single batch immediately (bypass queue)
   */
  async processImmediate(games: IGDBGame[]): Promise<void> {
    try {
      await gameSyncService.saveGamesFromIGDB(games);
    } catch (error) {
      console.error('Error in immediate processing:', error);
      // Fall back to queue
      this.add(games);
    }
  }
}

// Export singleton instance
export const syncQueue = new SyncQueue();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).gameSyncQueue = syncQueue;
}