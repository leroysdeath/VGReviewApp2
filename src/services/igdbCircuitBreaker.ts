/**
 * Circuit Breaker for IGDB API
 * Prevents cascading failures by temporarily disabling IGDB calls after repeated failures
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  timeoutDuration?: number;
  halfOpenRequests?: number;
}

export class IGDBCircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private state: CircuitState = 'CLOSED';
  private halfOpenAttempts = 0;

  // Configuration
  private readonly FAILURE_THRESHOLD: number;
  private readonly TIMEOUT_DURATION: number;
  private readonly HALF_OPEN_REQUESTS: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.FAILURE_THRESHOLD = options.failureThreshold || 3;
    this.TIMEOUT_DURATION = options.timeoutDuration || 60000; // 1 minute
    this.HALF_OPEN_REQUESTS = options.halfOpenRequests || 2;
  }

  /**
   * Check if a request can be made
   */
  canMakeRequest(): boolean {
    switch (this.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        // Check if enough time has passed to try again
        if (Date.now() - this.lastFailureTime > this.TIMEOUT_DURATION) {
          console.log('[CircuitBreaker] Moving from OPEN to HALF_OPEN state');
          this.state = 'HALF_OPEN';
          this.halfOpenAttempts = 0;
          return true;
        }
        return false;

      case 'HALF_OPEN':
        // Allow limited requests in half-open state
        return this.halfOpenAttempts < this.HALF_OPEN_REQUESTS;

      default:
        return false;
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.successCount++;

    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++;
      // If we've had enough successful requests, close the circuit
      if (this.halfOpenAttempts >= this.HALF_OPEN_REQUESTS) {
        console.log('[CircuitBreaker] Circuit restored - moving to CLOSED state');
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.halfOpenAttempts = 0;
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(error?: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    console.log(`[CircuitBreaker] Failure recorded (${this.failureCount}/${this.FAILURE_THRESHOLD}): ${error?.message || 'Unknown error'}`);

    if (this.state === 'HALF_OPEN') {
      // Any failure in half-open state reopens the circuit
      console.log('[CircuitBreaker] Failure in HALF_OPEN state - reopening circuit');
      this.state = 'OPEN';
      this.halfOpenAttempts = 0;
    } else if (this.state === 'CLOSED' && this.failureCount >= this.FAILURE_THRESHOLD) {
      // Too many failures, open the circuit
      console.log('[CircuitBreaker] Threshold exceeded - opening circuit');
      this.state = 'OPEN';
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      canMakeRequest: this.canMakeRequest()
    };
  }

  /**
   * Force reset the circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = 0;
    console.log('[CircuitBreaker] Circuit manually reset');
  }
}

// Singleton instance
export const igdbCircuitBreaker = new IGDBCircuitBreaker();