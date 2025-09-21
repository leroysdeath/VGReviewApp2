/**
 * Health Monitor for IGDB API
 * Monitors API health and automatically disables/enables IGDB based on health status
 */

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';

export interface HealthCheckResult {
  status: HealthStatus;
  lastCheckTime: number;
  responseTime?: number;
  error?: string;
}

export class IGDBHealthMonitor {
  private isHealthy = true;
  private lastHealthCheck: HealthCheckResult | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;

  // Configuration
  private readonly CHECK_INTERVAL = 300000; // 5 minutes
  private readonly QUICK_CHECK_INTERVAL = 30000; // 30 seconds when unhealthy
  private readonly HEALTH_CHECK_TIMEOUT = 2000; // 2 seconds
  private readonly FAILURES_FOR_UNHEALTHY = 3;
  private readonly SUCCESSES_FOR_HEALTHY = 2;

  /**
   * Start health monitoring
   */
  startMonitoring(): void {
    if (this.checkInterval) {
      console.log('[HealthMonitor] Monitoring already active');
      return;
    }

    console.log('[HealthMonitor] Starting IGDB health monitoring');

    // Perform initial check
    this.performHealthCheck();

    // Set up periodic checks
    this.scheduleNextCheck();
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearTimeout(this.checkInterval);
      this.checkInterval = null;
      console.log('[HealthMonitor] Stopped IGDB health monitoring');
    }
  }

  /**
   * Perform a health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.HEALTH_CHECK_TIMEOUT);

      // Simple test query - search for "mario" with limit 1
      const response = await fetch('/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'mario',
          limit: 1,
          type: 'health_check'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        this.recordSuccess(responseTime);

        this.lastHealthCheck = {
          status: this.determineHealthStatus(),
          lastCheckTime: Date.now(),
          responseTime
        };

        console.log(`[HealthMonitor] Health check succeeded in ${responseTime}ms - Status: ${this.lastHealthCheck.status}`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordFailure(error as Error);

      this.lastHealthCheck = {
        status: this.determineHealthStatus(),
        lastCheckTime: Date.now(),
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      console.log(`[HealthMonitor] Health check failed: ${this.lastHealthCheck.error} - Status: ${this.lastHealthCheck.status}`);
    }

    // Schedule next check based on health status
    this.scheduleNextCheck();

    return this.lastHealthCheck!;
  }

  /**
   * Check if service is currently healthy
   */
  isServiceHealthy(): boolean {
    return this.isHealthy;
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthStatus {
    if (!this.lastHealthCheck) {
      return 'HEALTHY'; // Assume healthy until proven otherwise
    }
    return this.lastHealthCheck.status;
  }

  /**
   * Get health statistics
   */
  getStats() {
    return {
      isHealthy: this.isHealthy,
      status: this.getHealthStatus(),
      lastCheck: this.lastHealthCheck,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      isMonitoring: this.checkInterval !== null
    };
  }

  /**
   * Force a health check immediately
   */
  async forceCheck(): Promise<HealthCheckResult> {
    console.log('[HealthMonitor] Forcing immediate health check');
    return this.performHealthCheck();
  }

  /**
   * Record a successful operation (can be from actual usage)
   */
  recordOperationalSuccess(): void {
    if (!this.isHealthy) {
      this.consecutiveSuccesses++;
      console.log(`[HealthMonitor] Operational success recorded (${this.consecutiveSuccesses}/${this.SUCCESSES_FOR_HEALTHY})`);

      if (this.consecutiveSuccesses >= this.SUCCESSES_FOR_HEALTHY) {
        this.isHealthy = true;
        this.consecutiveFailures = 0;
        console.log('[HealthMonitor] Service marked as HEALTHY after operational successes');
      }
    }
  }

  /**
   * Record a failed operation (can be from actual usage)
   */
  recordOperationalFailure(error?: Error): void {
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;

    console.log(`[HealthMonitor] Operational failure recorded (${this.consecutiveFailures}/${this.FAILURES_FOR_UNHEALTHY}): ${error?.message || 'Unknown'}`);

    if (this.consecutiveFailures >= this.FAILURES_FOR_UNHEALTHY) {
      this.isHealthy = false;
      console.log('[HealthMonitor] Service marked as UNHEALTHY after operational failures');
    }
  }

  /**
   * Record successful health check
   */
  private recordSuccess(responseTime: number): void {
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;

    if (this.consecutiveSuccesses >= this.SUCCESSES_FOR_HEALTHY) {
      this.isHealthy = true;
    }
  }

  /**
   * Record failed health check
   */
  private recordFailure(error: Error): void {
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;

    if (this.consecutiveFailures >= this.FAILURES_FOR_UNHEALTHY) {
      this.isHealthy = false;
    }
  }

  /**
   * Determine health status based on current state
   */
  private determineHealthStatus(): HealthStatus {
    if (this.isHealthy) {
      return 'HEALTHY';
    } else if (this.consecutiveFailures < this.FAILURES_FOR_UNHEALTHY * 2) {
      return 'DEGRADED';
    } else {
      return 'UNHEALTHY';
    }
  }

  /**
   * Schedule the next health check
   */
  private scheduleNextCheck(): void {
    // Clear existing interval
    if (this.checkInterval) {
      clearTimeout(this.checkInterval);
    }

    // Use shorter interval when unhealthy for faster recovery detection
    const interval = this.isHealthy ? this.CHECK_INTERVAL : this.QUICK_CHECK_INTERVAL;

    this.checkInterval = setTimeout(() => {
      this.performHealthCheck();
    }, interval);
  }
}

// Singleton instance
export const igdbHealthMonitor = new IGDBHealthMonitor();

// Start monitoring automatically
if (typeof window !== 'undefined') {
  igdbHealthMonitor.startMonitoring();
}