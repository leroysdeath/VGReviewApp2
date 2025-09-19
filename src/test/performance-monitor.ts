// Phase 4: Performance regression detection and analytics
// Monitors test execution time and detects performance issues

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PerformanceMetric {
  testFile: string;
  testName?: string;
  duration: number;
  timestamp: number;
  workers: number;
  environment: {
    nodeVersion: string;
    platform: string;
    memory: number;
    cpu: string;
  };
  metadata: {
    testCount: number;
    setupTime: number;
    teardownTime: number;
  };
}

interface PerformanceBaseline {
  testFile: string;
  averageDuration: number;
  p95Duration: number;
  sampleSize: number;
  lastUpdated: number;
  trend: 'improving' | 'stable' | 'degrading';
}

interface RegressionAlert {
  testFile: string;
  currentDuration: number;
  baselineDuration: number;
  regressionPercent: number;
  severity: 'minor' | 'moderate' | 'severe';
  confidence: number;
}

export class PerformanceMonitor {
  private metricsDir = join(process.cwd(), 'node_modules', '.cache', 'test-performance');
  private metrics: PerformanceMetric[] = [];
  private baselines = new Map<string, PerformanceBaseline>();
  private enabled = process.env.DISABLE_PERF_MONITORING !== 'true';
  
  private readonly regressionThresholds = {
    minor: 1.2,    // 20% slower
    moderate: 1.5, // 50% slower  
    severe: 2.0    // 100% slower
  };

  constructor() {
    this.ensureMetricsDir();
    this.loadData();
  }

  private ensureMetricsDir() {
    const fs = require('fs');
    if (!fs.existsSync(this.metricsDir)) {
      fs.mkdirSync(this.metricsDir, { recursive: true });
    }
  }

  private loadData() {
    // Load metrics history
    const metricsFile = join(this.metricsDir, 'metrics.json');
    if (existsSync(metricsFile)) {
      try {
        const data = JSON.parse(readFileSync(metricsFile, 'utf8'));
        this.metrics = data.metrics || [];
      } catch (error) {
        console.warn('⚠️  Failed to load performance metrics');
      }
    }

    // Load baselines
    const baselinesFile = join(this.metricsDir, 'baselines.json');
    if (existsSync(baselinesFile)) {
      try {
        const data = JSON.parse(readFileSync(baselinesFile, 'utf8'));
        this.baselines = new Map(data.baselines || []);
      } catch (error) {
        console.warn('⚠️  Failed to load performance baselines');
      }
    }
  }

  private saveData() {
    // Save recent metrics (keep last 1000)
    const metricsFile = join(this.metricsDir, 'metrics.json');
    const recentMetrics = this.metrics.slice(-1000);
    writeFileSync(metricsFile, JSON.stringify({ 
      version: '1.0.0',
      updated: Date.now(),
      metrics: recentMetrics 
    }, null, 2));

    // Save baselines
    const baselinesFile = join(this.metricsDir, 'baselines.json');
    writeFileSync(baselinesFile, JSON.stringify({
      version: '1.0.0',
      updated: Date.now(),
      baselines: Array.from(this.baselines.entries())
    }, null, 2));
  }

  // Record test execution metrics
  recordExecution(
    testFile: string,
    duration: number,
    metadata: {
      testCount?: number;
      setupTime?: number;
      teardownTime?: number;
      workers?: number;
      testName?: string;
    } = {}
  ) {
    if (!this.enabled) return;

    const metric: PerformanceMetric = {
      testFile,
      testName: metadata.testName,
      duration,
      timestamp: Date.now(),
      workers: metadata.workers || 1,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage().heapUsed,
        cpu: require('os').cpus()[0]?.model || 'unknown'
      },
      metadata: {
        testCount: metadata.testCount || 1,
        setupTime: metadata.setupTime || 0,
        teardownTime: metadata.teardownTime || 0
      }
    };

    this.metrics.push(metric);
    this.updateBaseline(testFile);
    this.saveData();
  }

  private updateBaseline(testFile: string) {
    // Get recent metrics for this test file (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentMetrics = this.metrics
      .filter(m => m.testFile === testFile && m.timestamp > thirtyDaysAgo)
      .sort((a, b) => a.duration - b.duration);

    if (recentMetrics.length < 5) return; // Need minimum sample size

    const durations = recentMetrics.map(m => m.duration);
    const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const p95Index = Math.floor(durations.length * 0.95);
    const p95 = durations[p95Index];

    // Calculate trend
    const oldMetrics = recentMetrics.slice(0, Math.floor(recentMetrics.length / 2));
    const newMetrics = recentMetrics.slice(Math.floor(recentMetrics.length / 2));
    
    const oldAvg = oldMetrics.reduce((sum, m) => sum + m.duration, 0) / oldMetrics.length;
    const newAvg = newMetrics.reduce((sum, m) => sum + m.duration, 0) / newMetrics.length;
    
    const trend = newAvg < oldAvg * 0.95 ? 'improving' :
                  newAvg > oldAvg * 1.05 ? 'degrading' : 'stable';

    this.baselines.set(testFile, {
      testFile,
      averageDuration: average,
      p95Duration: p95,
      sampleSize: recentMetrics.length,
      lastUpdated: Date.now(),
      trend
    });
  }

  // Detect performance regressions
  detectRegressions(currentResults: Array<{
    testFile: string;
    duration: number;
    testName?: string;
  }>): RegressionAlert[] {
    const alerts: RegressionAlert[] = [];

    for (const result of currentResults) {
      const baseline = this.baselines.get(result.testFile);
      if (!baseline) continue;

      const regressionRatio = result.duration / baseline.averageDuration;
      
      if (regressionRatio >= this.regressionThresholds.minor) {
        const severity = regressionRatio >= this.regressionThresholds.severe ? 'severe' :
                        regressionRatio >= this.regressionThresholds.moderate ? 'moderate' : 'minor';
        
        // Calculate confidence based on how far from baseline and sample size
        const confidence = Math.min(100, 
          (regressionRatio - 1) * 100 + 
          Math.min(50, baseline.sampleSize * 2)
        );

        alerts.push({
          testFile: result.testFile,
          currentDuration: result.duration,
          baselineDuration: baseline.averageDuration,
          regressionPercent: (regressionRatio - 1) * 100,
          severity,
          confidence
        });
      }
    }

    return alerts.sort((a, b) => b.regressionPercent - a.regressionPercent);
  }

  // Generate performance report
  generateReport(): {
    summary: {
      totalTests: number;
      averageDuration: number;
      slowestTest: string;
      fastestTest: string;
      totalTestTime: number;
    };
    trends: {
      improving: number;
      stable: number;
      degrading: number;
    };
    recommendations: string[];
    regressions: RegressionAlert[];
  } {
    // Get recent metrics (last 7 days)
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > weekAgo);

    if (recentMetrics.length === 0) {
      return {
        summary: {
          totalTests: 0,
          averageDuration: 0,
          slowestTest: 'N/A',
          fastestTest: 'N/A',
          totalTestTime: 0
        },
        trends: { improving: 0, stable: 0, degrading: 0 },
        recommendations: ['No recent test data available'],
        regressions: []
      };
    }

    // Calculate summary stats
    const durations = recentMetrics.map(m => m.duration);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = totalDuration / durations.length;
    
    const slowestMetric = recentMetrics.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest
    );
    
    const fastestMetric = recentMetrics.reduce((fastest, current) =>
      current.duration < fastest.duration ? current : fastest
    );

    // Analyze trends
    const baselines = Array.from(this.baselines.values());
    const trends = {
      improving: baselines.filter(b => b.trend === 'improving').length,
      stable: baselines.filter(b => b.trend === 'stable').length,
      degrading: baselines.filter(b => b.trend === 'degrading').length
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(recentMetrics, baselines);

    // Get current regressions
    const currentResults = recentMetrics.map(m => ({
      testFile: m.testFile,
      duration: m.duration,
      testName: m.testName
    }));
    const regressions = this.detectRegressions(currentResults);

    return {
      summary: {
        totalTests: new Set(recentMetrics.map(m => m.testFile)).size,
        averageDuration: Math.round(averageDuration),
        slowestTest: slowestMetric.testFile,
        fastestTest: fastestMetric.testFile,
        totalTestTime: Math.round(totalDuration)
      },
      trends,
      recommendations,
      regressions
    };
  }

  private generateRecommendations(
    recentMetrics: PerformanceMetric[],
    baselines: PerformanceBaseline[]
  ): string[] {
    const recommendations = [];

    // Check for slow tests
    const slowTests = baselines.filter(b => b.averageDuration > 10000); // >10s
    if (slowTests.length > 0) {
      recommendations.push(`Consider optimizing ${slowTests.length} slow tests (>10s average)`);
    }

    // Check for degrading trends
    const degradingTests = baselines.filter(b => b.trend === 'degrading');
    if (degradingTests.length > 0) {
      recommendations.push(`Investigate ${degradingTests.length} tests showing performance degradation`);
    }

    // Check worker utilization
    const workerMetrics = recentMetrics.map(m => m.workers);
    const avgWorkers = workerMetrics.reduce((sum, w) => sum + w, 0) / workerMetrics.length;
    if (avgWorkers < 2) {
      recommendations.push('Consider increasing worker count for better parallelization');
    }

    // Check test setup overhead
    const setupOverhead = recentMetrics
      .filter(m => m.metadata.setupTime > 0)
      .map(m => m.metadata.setupTime / m.duration);
    
    const avgSetupOverhead = setupOverhead.length > 0 ? 
      setupOverhead.reduce((sum, o) => sum + o, 0) / setupOverhead.length : 0;
    
    if (avgSetupOverhead > 0.3) {
      recommendations.push('High test setup overhead detected - consider optimizing test initialization');
    }

    if (recommendations.length === 0) {
      recommendations.push('Test performance looks good! 🚀');
    }

    return recommendations;
  }

  // Monitor test run in real-time
  monitorTestRun(testFiles: string[], onUpdate?: (progress: {
    completed: number;
    total: number;
    currentTest: string;
    avgDuration: number;
    estimatedTimeRemaining: number;
  }) => void) {
    const startTime = Date.now();
    let completed = 0;
    const durations: number[] = [];

    return {
      recordTestCompletion: (testFile: string, duration: number) => {
        completed++;
        durations.push(duration);
        
        const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const remaining = testFiles.length - completed;
        const estimatedTimeRemaining = remaining * avgDuration;

        if (onUpdate) {
          onUpdate({
            completed,
            total: testFiles.length,
            currentTest: testFile,
            avgDuration,
            estimatedTimeRemaining
          });
        }

        // Record for historical tracking
        this.recordExecution(testFile, duration);
      },
      
      getStats: () => ({
        totalTime: Date.now() - startTime,
        completedTests: completed,
        averageDuration: durations.length > 0 ? 
          durations.reduce((sum, d) => sum + d, 0) / durations.length : 0
      })
    };
  }

  // Clear old data
  cleanup(olderThanDays = 90) {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    // Remove baselines that haven't been updated recently
    for (const [testFile, baseline] of this.baselines.entries()) {
      if (baseline.lastUpdated < cutoff) {
        this.baselines.delete(testFile);
      }
    }
    
    this.saveData();
  }
}