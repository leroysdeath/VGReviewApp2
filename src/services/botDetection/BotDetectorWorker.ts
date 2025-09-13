/**
 * Bot Detector Worker Wrapper
 * Manages Web Worker communication and fallback to main thread
 */

import { BotDetectionRequest, BotDetectionResult, BotDetectorStats } from './types';

export class BotDetectorWorker {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, {
    resolve: (result: BotDetectionResult) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private requestId = 0;
  private isSupported = false;
  private initPromise: Promise<void> | null = null;
  private debug = false;

  constructor(debug = false) {
    this.debug = debug;
    this.isSupported = typeof Worker !== 'undefined';
    
    if (this.debug) {
      console.log('[BotDetectorWorker] Web Workers supported:', this.isSupported);
    }
  }

  /**
   * Initialize the worker
   */
  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    if (!this.isSupported) {
      if (this.debug) {
        console.log('[BotDetectorWorker] Web Workers not supported, using fallback');
      }
      return;
    }

    try {
      const startTime = performance.now();
      
      // Create worker with proper URL
      this.worker = new Worker('/botDetector.worker.js');
      
      // Set up message handler
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      
      // Set up error handler
      this.worker.onerror = (error) => {
        console.error('[BotDetectorWorker] Worker error:', error);
        this.handleWorkerError(error);
      };

      // Test worker is responsive
      await this.ping();
      
      if (this.debug) {
        const initTime = performance.now() - startTime;
        console.log(`[BotDetectorWorker] Initialized in ${initTime.toFixed(2)}ms`);
      }
    } catch (error) {
      console.error('[BotDetectorWorker] Failed to initialize:', error);
      this.isSupported = false;
      this.worker = null;
    }
  }

  /**
   * Test worker responsiveness
   */
  private async ping(): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = this.generateRequestId();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Worker ping timeout'));
      }, 1000);

      this.pendingRequests.set(id, {
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject,
        timeout
      });

      this.worker?.postMessage({
        type: 'getStats',
        id
      });
    });
  }

  /**
   * Detect if request is from a bot
   */
  async detect(request: BotDetectionRequest): Promise<BotDetectionResult> {
    const startTime = performance.now();

    // Ensure initialized
    await this.initialize();

    // Use worker if available
    if (this.worker && this.isSupported) {
      return this.detectWithWorker(request, startTime);
    }

    // Fallback to main thread
    return this.detectFallback(request, startTime);
  }

  /**
   * Detect using Web Worker
   */
  private async detectWithWorker(
    request: BotDetectionRequest,
    startTime: number
  ): Promise<BotDetectionResult> {
    return new Promise((resolve, reject) => {
      const id = this.generateRequestId();
      
      // Set timeout (3 seconds max)
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        // Fallback to main thread on timeout
        this.detectFallback(request, startTime).then(resolve).catch(reject);
      }, 3000);

      // Store pending request
      this.pendingRequests.set(id, {
        resolve: (result) => {
          clearTimeout(timeout);
          if (this.debug) {
            const totalTime = performance.now() - startTime;
            console.log(`[BotDetectorWorker] Detection completed in ${totalTime.toFixed(2)}ms`);
          }
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timeout
      });

      // Send to worker
      this.worker?.postMessage({
        type: 'detect',
        id,
        data: request
      });
    });
  }

  /**
   * Fallback detection on main thread
   */
  private async detectFallback(
    request: BotDetectionRequest,
    startTime: number
  ): Promise<BotDetectionResult> {
    if (this.debug) {
      console.log('[BotDetectorWorker] Using fallback detection');
    }

    const { userAgent } = request;
    
    // Simple bot detection for fallback
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /java(?!script)/i
    ];

    let isBot = false;
    const reasons: string[] = [];

    if (!userAgent || userAgent.length < 10) {
      isBot = true;
      reasons.push('invalid_user_agent');
    } else {
      for (const pattern of botPatterns) {
        if (pattern.test(userAgent)) {
          isBot = true;
          reasons.push('bot_user_agent');
          break;
        }
      }
    }

    const performanceMs = performance.now() - startTime;

    return {
      isBot,
      confidence: isBot ? 'high' : 'low',
      reasons,
      flags: [],
      performanceMs,
      cacheHit: false
    };
  }

  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const { type, id, data, error } = event.data;
    const pending = this.pendingRequests.get(id);

    if (!pending) {
      if (this.debug) {
        console.warn('[BotDetectorWorker] Received message for unknown request:', id);
      }
      return;
    }

    this.pendingRequests.delete(id);

    switch (type) {
      case 'result':
        pending.resolve(data);
        break;
      case 'stats':
        pending.resolve(data);
        break;
      case 'cleared':
      case 'cleaned':
        pending.resolve(data || {});
        break;
      case 'error':
        pending.reject(new Error(error || 'Worker error'));
        break;
      default:
        pending.reject(new Error(`Unknown message type: ${type}`));
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(error: ErrorEvent): void {
    console.error('[BotDetectorWorker] Worker error:', error);
    
    // Reject all pending requests
    this.pendingRequests.forEach((pending) => {
      pending.reject(new Error('Worker crashed'));
    });
    this.pendingRequests.clear();

    // Mark as unsupported to use fallback
    this.isSupported = false;
    this.worker = null;
  }

  /**
   * Get statistics from worker
   */
  async getStats(): Promise<BotDetectorStats> {
    if (!this.worker || !this.isSupported) {
      return {
        checksPerformed: 0,
        cacheHits: 0,
        cacheMisses: 0,
        rateLimitMapSize: 0,
        memoryEstimate: 0
      };
    }

    return new Promise((resolve, reject) => {
      const id = this.generateRequestId();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        resolve({
          checksPerformed: 0,
          cacheHits: 0,
          cacheMisses: 0,
          rateLimitMapSize: 0,
          memoryEstimate: 0
        });
      }, 1000);

      this.pendingRequests.set(id, {
        resolve: (stats) => {
          clearTimeout(timeout);
          resolve(stats as BotDetectorStats);
        },
        reject,
        timeout
      });

      this.worker.postMessage({
        type: 'getStats',
        id
      });
    });
  }

  /**
   * Clear worker state
   */
  async clear(): Promise<void> {
    if (!this.worker || !this.isSupported) return;

    return new Promise((resolve) => {
      const id = this.generateRequestId();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        resolve();
      }, 1000);

      this.pendingRequests.set(id, {
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject: () => resolve(),
        timeout
      });

      this.worker.postMessage({
        type: 'clear',
        id
      });
    });
  }

  /**
   * Cleanup old entries
   */
  async cleanup(): Promise<void> {
    if (!this.worker || !this.isSupported) return;

    return new Promise((resolve) => {
      const id = this.generateRequestId();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        resolve();
      }, 1000);

      this.pendingRequests.set(id, {
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject: () => resolve(),
        timeout
      });

      this.worker.postMessage({
        type: 'cleanup',
        id
      });
    });
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      // Clear all pending requests
      this.pendingRequests.forEach((pending) => {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Worker terminated'));
      });
      this.pendingRequests.clear();

      // Terminate worker
      this.worker.terminate();
      this.worker = null;
    }
    
    this.initPromise = null;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${++this.requestId}_${Date.now()}`;
  }

  /**
   * Check if worker is available
   */
  get isAvailable(): boolean {
    return this.isSupported && this.worker !== null;
  }
}