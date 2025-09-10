// Phase 3: Advanced parallel execution strategies
// Optimizes test execution based on test characteristics

import { TEST_CATEGORIES, categorizeTest } from './test-categories';

export interface ExecutionPlan {
  sequential: string[];
  parallel: string[][];
  totalEstimatedTime: number;
}

// Smart test batching for optimal parallel execution
export function createExecutionPlan(testFiles: string[]): ExecutionPlan {
  const categorized = new Map<string, string[]>();
  
  // Group tests by category
  for (const file of testFiles) {
    const category = categorizeTest(file);
    const existing = categorized.get(category.name) || [];
    existing.push(file);
    categorized.set(category.name, existing);
  }
  
  const sequential: string[] = [];
  const parallelBatches: string[][] = [];
  let estimatedTime = 0;
  
  // Process categories by priority
  const sortedCategories = Array.from(categorized.entries())
    .map(([name, files]) => ({
      category: TEST_CATEGORIES.find(c => c.name === name) || TEST_CATEGORIES[0],
      files
    }))
    .sort((a, b) => a.category.priority - b.category.priority);
  
  for (const { category, files } of sortedCategories) {
    if (category.parallel) {
      // Batch parallel tests optimally
      const batches = createOptimalBatches(files, 4); // 4 tests per batch max
      parallelBatches.push(...batches);
      
      // Parallel time is the longest batch
      const batchTime = Math.max(...batches.map(batch => batch.length * 2)); // 2s avg per test
      estimatedTime += batchTime;
    } else {
      // Sequential tests add linearly
      sequential.push(...files);
      estimatedTime += files.length * 5; // 5s avg for sequential tests
    }
  }
  
  return {
    sequential,
    parallel: parallelBatches,
    totalEstimatedTime: estimatedTime
  };
}

// Create optimal batches for parallel execution
function createOptimalBatches(tests: string[], maxBatchSize: number): string[][] {
  const batches: string[][] = [];
  
  for (let i = 0; i < tests.length; i += maxBatchSize) {
    batches.push(tests.slice(i, i + maxBatchSize));
  }
  
  return batches;
}

// Dynamic worker allocation based on system resources
export function calculateOptimalWorkers(): string {
  const cpus = require('os').cpus().length;
  const memoryGB = require('os').totalmem() / (1024 ** 3);
  
  // Conservative allocation for stability
  if (memoryGB < 8) {
    return '25%'; // Limited memory
  } else if (cpus <= 4) {
    return '50%'; // Limited cores
  } else if (cpus >= 8 && memoryGB >= 16) {
    return '75%'; // High-end system
  } else {
    return '50%'; // Default safe value
  }
}

// Test execution profiler for optimization insights
export class TestProfiler {
  private static profiles = new Map<string, number>();
  
  static recordExecution(testFile: string, durationMs: number) {
    this.profiles.set(testFile, durationMs);
  }
  
  static getProfile(testFile: string): number | undefined {
    return this.profiles.get(testFile);
  }
  
  static getSlowestTests(count: number = 10): Array<{ file: string; duration: number }> {
    return Array.from(this.profiles.entries())
      .map(([file, duration]) => ({ file, duration }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }
  
  static getRecommendedBatching(): Map<string, string[]> {
    const batches = new Map<string, string[]>();
    const sorted = this.getSlowestTests(100); // Top 100 slowest
    
    // Group slow tests separately to avoid bottlenecks
    const slow = sorted.filter(t => t.duration > 5000).map(t => t.file);
    const medium = sorted.filter(t => t.duration > 2000 && t.duration <= 5000).map(t => t.file);
    const fast = sorted.filter(t => t.duration <= 2000).map(t => t.file);
    
    if (slow.length > 0) batches.set('slow', slow);
    if (medium.length > 0) batches.set('medium', medium);
    if (fast.length > 0) batches.set('fast', fast);
    
    return batches;
  }
}

// Smart retry logic for flaky tests
export class FlakyTestHandler {
  private static retryMap = new Map<string, number>();
  private static maxRetries = 2;
  
  static shouldRetry(testFile: string, attempt: number): boolean {
    const currentRetries = this.retryMap.get(testFile) || 0;
    
    if (currentRetries >= this.maxRetries) {
      return false;
    }
    
    // Exponential backoff for retries
    const delay = Math.pow(2, attempt) * 100;
    setTimeout(() => {}, delay);
    
    this.retryMap.set(testFile, currentRetries + 1);
    return true;
  }
  
  static markSuccess(testFile: string) {
    this.retryMap.delete(testFile);
  }
  
  static getRetryCount(testFile: string): number {
    return this.retryMap.get(testFile) || 0;
  }
}