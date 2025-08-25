import { userService } from './userService';
import { supabase } from './supabase';

export interface NavigationHealth {
  totalAuthUsers: number;
  totalDbUsers: number;
  missingDbUsers: number;
  cacheSize: number;
  timestamp: string;
}

export interface NavigationError {
  type: 'missing_user' | 'navigation_failure' | 'auth_mismatch';
  authId?: string;
  userId?: number;
  error: string;
  timestamp: string;
}

/**
 * Navigation Monitoring Module
 * Modular monolithic service for monitoring navigation health and consistency
 * Integrates with the user service for comprehensive monitoring
 */
export class NavigationMonitorService {
  private errors: NavigationError[] = [];
  private maxErrors = 100; // Keep last 100 errors
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: NavigationHealth | null = null;

  constructor() {
    // Start periodic health checks in development
    if (process.env.NODE_ENV === 'development') {
      this.startPeriodicHealthChecks();
    }
  }

  /**
   * Health Monitoring Module
   */
  private startPeriodicHealthChecks(): void {
    // Check health every 5 minutes in development
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.checkNavigationHealth();
      this.lastHealthCheck = health;
      
      if (health.missingDbUsers > 0) {
        this.logError({
          type: 'auth_mismatch',
          error: `Found ${health.missingDbUsers} authenticated users without database records`
        });
      }
    }, 5 * 60 * 1000);
  }

  private stopPeriodicHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Error Logging Module
   */
  public logError(error: Omit<NavigationError, 'timestamp'>): void {
    const errorWithTimestamp: NavigationError = {
      ...error,
      timestamp: new Date().toISOString()
    };

    this.errors.push(errorWithTimestamp);
    
    // Keep only the last maxErrors entries
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log critical errors to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Navigation Error:', errorWithTimestamp);
    }
  }

  /**
   * Get recent navigation errors
   */
  public getRecentErrors(minutes: number = 5): NavigationError[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.errors.filter(error => new Date(error.timestamp) > cutoff);
  }

  /**
   * Check overall navigation health
   */
  public async checkNavigationHealth(): Promise<NavigationHealth> {
    try {
      // Get count of authenticated users (approximate)
      const { count: authUserCount } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1
      });

      // Get count of database users
      const { count: dbUserCount } = await supabase
        .from('user')
        .select('id', { count: 'exact', head: true });

      // Calculate health metrics
      const totalAuthUsers = authUserCount || 0;
      const totalDbUsers = dbUserCount || 0;
      const missingDbUsers = Math.max(0, totalAuthUsers - totalDbUsers);
      const cacheStats = userService.getCacheStats();

      return {
        totalAuthUsers,
        totalDbUsers,
        missingDbUsers,
        cacheSize: cacheStats.totalCachedItems,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logError({
        type: 'navigation_failure',
        error: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      return {
        totalAuthUsers: 0,
        totalDbUsers: 0,
        missingDbUsers: 0,
        cacheSize: userService.getCacheStats().totalCachedItems,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate user navigation consistency
   */
  public async validateUserNavigation(authId: string): Promise<{ valid: boolean; userId?: number; error?: string }> {
    try {
      // Check if user exists in database
      const { data: user, error } = await supabase
        .from('user')
        .select('id')
        .eq('provider_id', authId)
        .single();

      if (error) {
        this.logError({
          type: 'missing_user',
          authId,
          error: `User lookup failed: ${error.message}`
        });
        return { valid: false, error: error.message };
      }

      if (!user) {
        this.logError({
          type: 'missing_user',
          authId,
          error: 'User not found in database'
        });
        return { valid: false, error: 'User not found in database' };
      }

      return { valid: true, userId: user.id };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      this.logError({
        type: 'navigation_failure',
        authId,
        error: errorMessage
      });
      return { valid: false, error: errorMessage };
    }
  }

  /**
   * Get navigation statistics for debugging
   */
  public getNavigationStats(): {
    totalErrors: number;
    recentErrors: number;
    errorsByType: Record<string, number>;
  } {
    const recentErrors = this.getRecentErrors(30); // Last 30 minutes
    const errorsByType = this.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: this.errors.length,
      recentErrors: recentErrors.length,
      errorsByType
    };
  }

  /**
   * Integration Module with User Service
   */
  public async validateAndFixUserNavigation(authId: string): Promise<{ 
    valid: boolean; 
    userId?: number; 
    fixed?: boolean; 
    error?: string 
  }> {
    try {
      // First validate current state
      const validation = await this.validateUserNavigation(authId);
      if (validation.valid) {
        return validation;
      }

      // If invalid, try to fix using user service
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === authId) {
        const createResult = await userService.getOrCreateDatabaseUser(user);
        if (createResult.success && createResult.userId) {
          return { 
            valid: true, 
            userId: createResult.userId, 
            fixed: true 
          };
        }
      }

      return { 
        valid: false, 
        error: 'Could not fix user navigation issue'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation/fix error';
      this.logError({
        type: 'navigation_failure',
        authId,
        error: errorMessage
      });
      return { valid: false, error: errorMessage };
    }
  }

  /**
   * Get comprehensive navigation status including cache stats
   */
  public getNavigationStatus(): {
    health: NavigationHealth | null;
    cacheStats: ReturnType<typeof userService.getCacheStats>;
    errorStats: ReturnType<typeof this.getNavigationStats>;
  } {
    return {
      health: this.lastHealthCheck,
      cacheStats: userService.getCacheStats(),
      errorStats: this.getNavigationStats()
    };
  }

  /**
   * Maintenance and Cleanup Module
   */
  public clearErrors(): void {
    this.errors = [];
  }

  public destroy(): void {
    this.stopPeriodicHealthChecks();
    this.clearErrors();
  }
}

export const navigationMonitor = new NavigationMonitorService();