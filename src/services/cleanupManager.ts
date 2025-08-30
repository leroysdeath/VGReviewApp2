/**
 * Global Cleanup Manager for Memory Leak Prevention
 * Centralized system for managing all subscriptions, timers, and resources
 */

type CleanupFunction = () => void | Promise<void>;
type ResourceType = 'subscription' | 'timer' | 'listener' | 'observer' | 'fetch' | 'websocket' | 'other';

interface CleanupTask {
  id: string;
  type: ResourceType;
  cleanup: CleanupFunction;
  component?: string;
  createdAt: number;
  priority: number; // Higher priority = cleaned up first
}

interface MemoryStats {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
}

class CleanupManager {
  private static instance: CleanupManager;
  private cleanupTasks: Map<string, CleanupTask> = new Map();
  private memoryMonitorInterval?: NodeJS.Timeout;
  private memoryWarningThreshold = 0.8; // Warn at 80% memory usage
  private memoryCriticalThreshold = 0.9; // Force cleanup at 90% memory usage
  private isMonitoring = false;
  private debugMode = process.env.NODE_ENV === 'development';

  private constructor() {
    // Singleton pattern
    if (typeof window !== 'undefined') {
      // Listen for page unload to cleanup everything
      window.addEventListener('beforeunload', () => this.cleanupAll());
      
      // Listen for visibility change to cleanup background resources
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.cleanupByType('fetch'); // Cancel pending fetches when tab is hidden
        }
      });
    }
  }

  static getInstance(): CleanupManager {
    if (!CleanupManager.instance) {
      CleanupManager.instance = new CleanupManager();
    }
    return CleanupManager.instance;
  }

  /**
   * Register a cleanup task
   */
  register(
    id: string, 
    cleanup: CleanupFunction, 
    options: {
      type?: ResourceType;
      component?: string;
      priority?: number;
    } = {}
  ): () => void {
    const task: CleanupTask = {
      id,
      type: options.type || 'other',
      cleanup,
      component: options.component,
      createdAt: Date.now(),
      priority: options.priority || 0
    };

    // If a task with this ID exists, cleanup the old one first
    if (this.cleanupTasks.has(id)) {
      this.cleanup(id);
    }

    this.cleanupTasks.set(id, task);

    if (this.debugMode) {
      console.log(`[CleanupManager] Registered: ${id} (${task.type}) from ${task.component || 'unknown'}`);
    }

    // Return unregister function for convenience
    return () => this.cleanup(id);
  }

  /**
   * Register a timer with automatic cleanup
   */
  registerTimer(
    id: string,
    callback: () => void,
    delay: number,
    component?: string
  ): NodeJS.Timeout {
    const timer = setTimeout(() => {
      callback();
      this.cleanupTasks.delete(id); // Auto-remove after execution
    }, delay);

    this.register(id, () => clearTimeout(timer), {
      type: 'timer',
      component,
      priority: 1
    });

    return timer;
  }

  /**
   * Register an interval with automatic cleanup
   */
  registerInterval(
    id: string,
    callback: () => void,
    interval: number,
    component?: string
  ): NodeJS.Timeout {
    const timer = setInterval(callback, interval);

    this.register(id, () => clearInterval(timer), {
      type: 'timer',
      component,
      priority: 1
    });

    return timer;
  }

  /**
   * Cleanup a specific task
   */
  async cleanup(id: string): Promise<void> {
    const task = this.cleanupTasks.get(id);
    if (!task) return;

    try {
      await task.cleanup();
      this.cleanupTasks.delete(id);
      
      if (this.debugMode) {
        console.log(`[CleanupManager] Cleaned up: ${id}`);
      }
    } catch (error) {
      console.error(`[CleanupManager] Error cleaning up ${id}:`, error);
    }
  }

  /**
   * Cleanup all tasks of a specific type
   */
  async cleanupByType(type: ResourceType): Promise<void> {
    const tasks = Array.from(this.cleanupTasks.values())
      .filter(task => task.type === type)
      .sort((a, b) => b.priority - a.priority);

    for (const task of tasks) {
      await this.cleanup(task.id);
    }
  }

  /**
   * Cleanup all tasks from a specific component
   */
  async cleanupByComponent(component: string): Promise<void> {
    const tasks = Array.from(this.cleanupTasks.values())
      .filter(task => task.component === component)
      .sort((a, b) => b.priority - a.priority);

    for (const task of tasks) {
      await this.cleanup(task.id);
    }
  }

  /**
   * Cleanup all registered tasks
   */
  async cleanupAll(): Promise<void> {
    const tasks = Array.from(this.cleanupTasks.values())
      .sort((a, b) => b.priority - a.priority);

    if (this.debugMode) {
      console.log(`[CleanupManager] Cleaning up ${tasks.length} tasks...`);
    }

    for (const task of tasks) {
      await this.cleanup(task.id);
    }

    this.stopMemoryMonitoring();
  }

  /**
   * Get current memory usage
   */
  private getMemoryStats(): MemoryStats {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
    return {};
  }

  /**
   * Start monitoring memory usage
   */
  startMemoryMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.memoryMonitorInterval = setInterval(() => {
      const stats = this.getMemoryStats();
      
      if (stats.usedJSHeapSize && stats.jsHeapSizeLimit) {
        const usage = stats.usedJSHeapSize / stats.jsHeapSizeLimit;
        
        if (usage > this.memoryCriticalThreshold) {
          console.warn('[CleanupManager] Critical memory usage detected, forcing cleanup...');
          this.forceCleanup();
        } else if (usage > this.memoryWarningThreshold) {
          console.warn(`[CleanupManager] High memory usage: ${(usage * 100).toFixed(1)}%`);
          // Cleanup old tasks (>5 minutes old)
          this.cleanupOldTasks(5 * 60 * 1000);
        }
        
        if (this.debugMode) {
          console.log(`[CleanupManager] Memory: ${(stats.usedJSHeapSize / 1048576).toFixed(1)}MB / ${(stats.jsHeapSizeLimit / 1048576).toFixed(1)}MB (${(usage * 100).toFixed(1)}%)`);
        }
      }
    }, intervalMs);
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = undefined;
      this.isMonitoring = false;
    }
  }

  /**
   * Force cleanup of non-critical resources
   */
  private async forceCleanup(): Promise<void> {
    // Cleanup in order of priority (lowest priority first)
    await this.cleanupByType('fetch');
    await this.cleanupByType('observer');
    await this.cleanupOldTasks(60 * 1000); // Cleanup tasks older than 1 minute
  }

  /**
   * Cleanup tasks older than specified age
   */
  private async cleanupOldTasks(maxAge: number): Promise<void> {
    const now = Date.now();
    const oldTasks = Array.from(this.cleanupTasks.values())
      .filter(task => now - task.createdAt > maxAge)
      .sort((a, b) => a.priority - b.priority); // Clean low priority first

    for (const task of oldTasks) {
      await this.cleanup(task.id);
    }
  }

  /**
   * Get statistics about registered tasks
   */
  getStats(): {
    totalTasks: number;
    tasksByType: Record<ResourceType, number>;
    tasksByComponent: Record<string, number>;
    oldestTask: CleanupTask | null;
    memoryStats: MemoryStats;
  } {
    const tasksByType: Record<string, number> = {};
    const tasksByComponent: Record<string, number> = {};
    let oldestTask: CleanupTask | null = null;
    let oldestTime = Date.now();

    for (const task of this.cleanupTasks.values()) {
      // Count by type
      tasksByType[task.type] = (tasksByType[task.type] || 0) + 1;
      
      // Count by component
      if (task.component) {
        tasksByComponent[task.component] = (tasksByComponent[task.component] || 0) + 1;
      }
      
      // Find oldest
      if (task.createdAt < oldestTime) {
        oldestTime = task.createdAt;
        oldestTask = task;
      }
    }

    return {
      totalTasks: this.cleanupTasks.size,
      tasksByType: tasksByType as Record<ResourceType, number>,
      tasksByComponent,
      oldestTask,
      memoryStats: this.getMemoryStats()
    };
  }

  /**
   * Debug: List all registered tasks
   */
  listTasks(): void {
    console.table(
      Array.from(this.cleanupTasks.values()).map(task => ({
        id: task.id,
        type: task.type,
        component: task.component || 'unknown',
        age: `${((Date.now() - task.createdAt) / 1000).toFixed(1)}s`,
        priority: task.priority
      }))
    );
  }
}

// Export singleton instance
export const cleanupManager = CleanupManager.getInstance();

// Export convenience functions
export const registerCleanup = cleanupManager.register.bind(cleanupManager);
export const registerTimer = cleanupManager.registerTimer.bind(cleanupManager);
export const registerInterval = cleanupManager.registerInterval.bind(cleanupManager);
export const cleanup = cleanupManager.cleanup.bind(cleanupManager);
export const cleanupByComponent = cleanupManager.cleanupByComponent.bind(cleanupManager);
export const cleanupAll = cleanupManager.cleanupAll.bind(cleanupManager);

// React hook for automatic cleanup on unmount
export function useCleanup(component: string) {
  return {
    register: (id: string, cleanupFn: CleanupFunction, type?: ResourceType) => {
      return cleanupManager.register(id, cleanupFn, { component, type });
    },
    registerTimer: (id: string, callback: () => void, delay: number) => {
      return cleanupManager.registerTimer(id, callback, delay, component);
    },
    registerInterval: (id: string, callback: () => void, interval: number) => {
      return cleanupManager.registerInterval(id, callback, interval, component);
    },
    cleanup: () => cleanupManager.cleanupByComponent(component)
  };
}

export default cleanupManager;