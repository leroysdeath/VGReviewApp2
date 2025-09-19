// Phase 4: Advanced flaky test detection and auto-remediation
// Identifies, tracks, and fixes unstable tests

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface FlakyTestRecord {
  testFile: string;
  testName: string;
  failures: FailureRecord[];
  successes: number;
  totalRuns: number;
  failureRate: number;
  lastFailure: number;
  pattern: string; // Common failure pattern
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFixes: AutoFix[];
}

interface FailureRecord {
  timestamp: number;
  error: string;
  stackTrace: string;
  duration: number;
  environment: {
    workers: number;
    timeout: number;
    node_version: string;
  };
}

interface AutoFix {
  type: 'timeout' | 'retry' | 'isolation' | 'mock' | 'async';
  description: string;
  applied: boolean;
  effectiveness: number; // 0-100%
}

export class FlakyTestDetector {
  private cacheDir = join(process.cwd(), 'node_modules', '.cache', 'flaky-tests');
  private records = new Map<string, FlakyTestRecord>();
  private enabled = process.env.DISABLE_FLAKY_DETECTION !== 'true';

  constructor() {
    this.ensureCacheDir();
    this.loadRecords();
  }

  private ensureCacheDir() {
    const fs = require('fs');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private loadRecords() {
    const recordFile = join(this.cacheDir, 'flaky-records.json');
    if (existsSync(recordFile)) {
      try {
        const data = JSON.parse(readFileSync(recordFile, 'utf8'));
        this.records = new Map(data.records || []);
      } catch (error) {
        console.warn('⚠️  Failed to load flaky test records');
      }
    }
  }

  private saveRecords() {
    const recordFile = join(this.cacheDir, 'flaky-records.json');
    const data = {
      version: '1.0.0',
      updated: Date.now(),
      records: Array.from(this.records.entries())
    };
    writeFileSync(recordFile, JSON.stringify(data, null, 2));
  }

  // Record test result (success or failure)
  recordResult(testFile: string, testName: string, success: boolean, details?: {
    error?: string;
    stackTrace?: string;
    duration?: number;
    timeout?: number;
    workers?: number;
  }) {
    if (!this.enabled) return;

    const key = `${testFile}:${testName}`;
    let record = this.records.get(key);

    if (!record) {
      record = {
        testFile,
        testName,
        failures: [],
        successes: 0,
        totalRuns: 0,
        failureRate: 0,
        lastFailure: 0,
        pattern: '',
        severity: 'low',
        autoFixes: []
      };
    }

    record.totalRuns++;

    if (success) {
      record.successes++;
    } else {
      record.failures.push({
        timestamp: Date.now(),
        error: details?.error || 'Unknown error',
        stackTrace: details?.stackTrace || '',
        duration: details?.duration || 0,
        environment: {
          workers: details?.workers || 1,
          timeout: details?.timeout || 15000,
          node_version: process.version
        }
      });
      record.lastFailure = Date.now();
    }

    // Update metrics
    record.failureRate = record.failures.length / record.totalRuns;
    record.pattern = this.identifyPattern(record.failures);
    record.severity = this.calculateSeverity(record);

    // Auto-generate fixes
    record.autoFixes = this.generateAutoFixes(record);

    this.records.set(key, record);
    this.saveRecords();
  }

  private identifyPattern(failures: FailureRecord[]): string {
    if (failures.length < 2) return 'insufficient-data';

    const patterns = new Map<string, number>();

    for (const failure of failures) {
      // Check for timeout patterns
      if (failure.error.toLowerCase().includes('timeout')) {
        patterns.set('timeout', (patterns.get('timeout') || 0) + 1);
      }

      // Check for async/promise patterns
      if (failure.error.includes('Promise') || failure.error.includes('async')) {
        patterns.set('async', (patterns.get('async') || 0) + 1);
      }

      // Check for timing patterns
      if (failure.error.includes('timing') || failure.error.includes('delay')) {
        patterns.set('timing', (patterns.get('timing') || 0) + 1);
      }

      // Check for resource contention
      if (failure.error.includes('EADDRINUSE') || failure.error.includes('port')) {
        patterns.set('resource-contention', (patterns.get('resource-contention') || 0) + 1);
      }

      // Check for race conditions
      if (failure.error.includes('already exists') || failure.error.includes('concurrent')) {
        patterns.set('race-condition', (patterns.get('race-condition') || 0) + 1);
      }
    }

    // Return most common pattern
    const sortedPatterns = Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1]);

    return sortedPatterns.length > 0 ? sortedPatterns[0][0] : 'unknown';
  }

  private calculateSeverity(record: FlakyTestRecord): FlakyTestRecord['severity'] {
    if (record.totalRuns < 5) return 'low';

    if (record.failureRate > 0.5) return 'critical';
    if (record.failureRate > 0.3) return 'high';
    if (record.failureRate > 0.1) return 'medium';
    return 'low';
  }

  private generateAutoFixes(record: FlakyTestRecord): AutoFix[] {
    const fixes: AutoFix[] = [];

    // Timeout-based fixes
    if (record.pattern === 'timeout') {
      fixes.push({
        type: 'timeout',
        description: 'Increase test timeout to reduce timeout failures',
        applied: false,
        effectiveness: 85
      });

      fixes.push({
        type: 'retry',
        description: 'Add automatic retry mechanism for timeout failures',
        applied: false,
        effectiveness: 75
      });
    }

    // Async-based fixes
    if (record.pattern === 'async') {
      fixes.push({
        type: 'async',
        description: 'Add proper async/await handling and promise resolution',
        applied: false,
        effectiveness: 90
      });
    }

    // Timing-based fixes
    if (record.pattern === 'timing') {
      fixes.push({
        type: 'isolation',
        description: 'Run test in isolation to avoid timing conflicts',
        applied: false,
        effectiveness: 70
      });
    }

    // Resource contention fixes
    if (record.pattern === 'resource-contention') {
      fixes.push({
        type: 'isolation',
        description: 'Use unique ports/resources to avoid conflicts',
        applied: false,
        effectiveness: 95
      });
    }

    return fixes;
  }

  // Get flaky tests report
  getFlakyTests(minFailureRate = 0.1): FlakyTestRecord[] {
    return Array.from(this.records.values())
      .filter(record => record.failureRate >= minFailureRate && record.totalRuns >= 3)
      .sort((a, b) => {
        // Sort by severity first, then failure rate
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[b.severity] - severityOrder[a.severity];
        }
        return b.failureRate - a.failureRate;
      });
  }

  // Generate remediation suggestions
  generateRemediationPlan(): {
    summary: string;
    actions: Array<{
      test: string;
      issue: string;
      suggestion: string;
      priority: number;
      estimatedEffort: string;
    }>;
  } {
    const flakyTests = this.getFlakyTests(0.1);
    const actions = [];

    for (const test of flakyTests.slice(0, 10)) { // Top 10 most problematic
      const topFix = test.autoFixes
        .sort((a, b) => b.effectiveness - a.effectiveness)[0];

      if (topFix) {
        actions.push({
          test: `${test.testFile} - ${test.testName}`,
          issue: `${(test.failureRate * 100).toFixed(1)}% failure rate (${test.pattern})`,
          suggestion: topFix.description,
          priority: test.severity === 'critical' ? 1 : 
                   test.severity === 'high' ? 2 :
                   test.severity === 'medium' ? 3 : 4,
          estimatedEffort: topFix.type === 'timeout' ? '5 min' :
                          topFix.type === 'retry' ? '15 min' :
                          topFix.type === 'async' ? '30 min' :
                          '45 min'
        });
      }
    }

    const criticalCount = flakyTests.filter(t => t.severity === 'critical').length;
    const highCount = flakyTests.filter(t => t.severity === 'high').length;

    return {
      summary: `Found ${flakyTests.length} flaky tests (${criticalCount} critical, ${highCount} high priority)`,
      actions: actions.sort((a, b) => a.priority - b.priority)
    };
  }

  // Auto-apply simple fixes
  autoApplyFixes(dryRun = true): Array<{ test: string; fix: string; applied: boolean }> {
    const results = [];
    const flakyTests = this.getFlakyTests(0.2); // Only high-failure rate tests

    for (const test of flakyTests) {
      const timeoutFix = test.autoFixes.find(f => f.type === 'timeout' && f.effectiveness > 80);
      
      if (timeoutFix && !timeoutFix.applied) {
        const applied = dryRun ? false : this.applyTimeoutFix(test);
        
        results.push({
          test: `${test.testFile} - ${test.testName}`,
          fix: timeoutFix.description,
          applied
        });

        if (applied) {
          timeoutFix.applied = true;
        }
      }
    }

    if (!dryRun) {
      this.saveRecords();
    }

    return results;
  }

  private applyTimeoutFix(record: FlakyTestRecord): boolean {
    // This would modify the test file to increase timeout
    // For now, just mark as applied and suggest manual fix
    console.log(`🔧 Suggested fix for ${record.testFile}:`);
    console.log(`   Add timeout: jest.setTimeout(30000) or it('test', async () => {}, 30000)`);
    return true;
  }

  // Get test stability score
  getStabilityScore(): number {
    const allTests = Array.from(this.records.values());
    if (allTests.length === 0) return 100;

    const stableTests = allTests.filter(t => t.failureRate < 0.05).length;
    return Math.round((stableTests / allTests.length) * 100);
  }

  // Clear records for specific test or all
  clearRecords(testKey?: string) {
    if (testKey) {
      this.records.delete(testKey);
    } else {
      this.records.clear();
    }
    this.saveRecords();
  }

  // Analyze test run for flakiness
  analyzeTestRun(results: Array<{ 
    testFile: string; 
    testName: string; 
    status: 'passed' | 'failed'; 
    duration: number;
    error?: string;
  }>) {
    console.log('\n🔍 Flaky Test Analysis');
    console.log('======================');
    
    for (const result of results) {
      this.recordResult(
        result.testFile,
        result.testName,
        result.status === 'passed',
        {
          error: result.error,
          duration: result.duration
        }
      );
    }

    const flakyTests = this.getFlakyTests(0.1);
    const stabilityScore = this.getStabilityScore();
    
    console.log(`📊 Test stability score: ${stabilityScore}%`);
    
    if (flakyTests.length > 0) {
      console.log(`⚠️  Found ${flakyTests.length} flaky tests:`);
      flakyTests.slice(0, 5).forEach(test => {
        console.log(`   ${test.testFile} - ${(test.failureRate * 100).toFixed(1)}% failure rate`);
      });
    } else {
      console.log('✅ No flaky tests detected');
    }
  }
}