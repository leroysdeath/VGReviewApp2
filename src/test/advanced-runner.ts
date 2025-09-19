// Phase 4: Advanced test runner integrating all optimizations
// Combines caching, incremental testing, flaky detection, and performance monitoring

import { execSync } from 'child_process';
import { TestCache } from './test-cache';
import { IncrementalTester } from './incremental-testing';
import { FlakyTestDetector } from './flaky-test-detector';
import { PerformanceMonitor } from './performance-monitor';

export interface AdvancedRunOptions {
  mode: 'dev' | 'ci' | 'local' | 'incremental';
  useCache?: boolean;
  detectFlaky?: boolean;
  monitorPerformance?: boolean;
  maxTests?: number;
  confidenceThreshold?: number;
  bail?: number;
}

export class AdvancedTestRunner {
  private cache = new TestCache();
  private incrementalTester = new IncrementalTester();
  private flakyDetector = new FlakyTestDetector();
  private perfMonitor = new PerformanceMonitor();

  async run(options: AdvancedRunOptions = { mode: 'local' }) {
    console.log('🚀 Advanced Test Runner Starting...');
    console.log('=====================================');

    const startTime = Date.now();
    
    try {
      // Phase 1: Determine what tests to run
      const testSelection = await this.selectTests(options);
      
      // Phase 2: Apply optimizations
      const optimizedExecution = this.optimizeExecution(testSelection, options);
      
      // Phase 3: Execute tests with monitoring
      const results = await this.executeWithMonitoring(optimizedExecution, options);
      
      // Phase 4: Post-execution analysis
      await this.analyzeResults(results, options);
      
      const totalTime = Date.now() - startTime;
      console.log(`\n✅ Advanced test run completed in ${(totalTime / 1000).toFixed(1)}s`);
      
      return results;
      
    } catch (error) {
      console.error('\n❌ Advanced test run failed:', error);
      throw error;
    }
  }

  private async selectTests(options: AdvancedRunOptions) {
    console.log('\n📋 Phase 1: Test Selection');
    console.log('---------------------------');

    let selectedTests: string[] = [];
    let selectionReason = '';

    if (options.mode === 'incremental') {
      // Use git-based incremental selection
      const changes = this.incrementalTester.getChangedFiles();
      const impacts = this.incrementalTester.getImpactedTests(changes);
      
      selectedTests = impacts
        .filter(impact => impact.confidence >= (options.confidenceThreshold || 60))
        .slice(0, options.maxTests || 20)
        .map(impact => impact.testFile);
      
      selectionReason = `Incremental: ${changes.length} changes → ${selectedTests.length} tests`;
      
      if (selectedTests.length === 0) {
        console.log('⚠️  No incremental tests found, falling back to fast tests');
        selectedTests = this.getFastTests();
        selectionReason = 'Fallback: fast tests';
      }
      
    } else if (options.mode === 'dev') {
      selectedTests = this.getFastTests();
      selectionReason = 'Development: fast tests only';
      
    } else {
      selectedTests = this.getAllTests();
      selectionReason = 'Full test suite';
    }

    console.log(`📊 Selected ${selectedTests.length} tests (${selectionReason})`);
    
    return {
      tests: selectedTests,
      reason: selectionReason
    };
  }

  private optimizeExecution(
    testSelection: { tests: string[]; reason: string },
    options: AdvancedRunOptions
  ) {
    console.log('\n⚡ Phase 2: Execution Optimization');
    console.log('-----------------------------------');

    let optimizedTests = testSelection.tests;
    const optimizations = [];

    // Apply caching optimization
    if (options.useCache !== false) {
      const cachedTests = optimizedTests.filter(test => this.cache.canSkipTest(test));
      const runningTests = optimizedTests.filter(test => !this.cache.canSkipTest(test));
      
      if (cachedTests.length > 0) {
        optimizations.push(`Cache: skipping ${cachedTests.length} unchanged tests`);
        optimizedTests = runningTests;
      }
    }

    // Remove known flaky tests for fast runs
    if (options.mode === 'dev') {
      const flakyTests = this.flakyDetector.getFlakyTests(0.3);
      const flakyTestFiles = new Set(flakyTests.map(t => t.testFile));
      
      const stableTests = optimizedTests.filter(test => !flakyTestFiles.has(test));
      
      if (stableTests.length < optimizedTests.length) {
        optimizations.push(`Stability: excluded ${optimizedTests.length - stableTests.length} flaky tests`);
        optimizedTests = stableTests;
      }
    }

    optimizations.forEach(opt => console.log(`✅ ${opt}`));
    
    if (optimizations.length === 0) {
      console.log('ℹ️  No optimizations applied');
    }

    return {
      tests: optimizedTests,
      optimizations,
      originalCount: testSelection.tests.length
    };
  }

  private async executeWithMonitoring(
    execution: { tests: string[]; optimizations: string[]; originalCount: number },
    options: AdvancedRunOptions
  ) {
    console.log('\n🔄 Phase 3: Test Execution');
    console.log('---------------------------');
    
    if (execution.tests.length === 0) {
      console.log('✅ All tests skipped via optimizations');
      return { success: true, tests: [], duration: 0 };
    }

    const monitor = options.monitorPerformance !== false ? 
      this.perfMonitor.monitorTestRun(execution.tests, (progress) => {
        const percent = Math.round((progress.completed / progress.total) * 100);
        const eta = Math.round(progress.estimatedTimeRemaining / 1000);
        console.log(`📊 Progress: ${percent}% (${progress.completed}/${progress.total}) - ETA: ${eta}s`);
      }) : null;

    // Build Jest command
    const jestArgs = this.buildJestCommand(execution.tests, options);
    const command = `npx jest ${jestArgs.join(' ')}`;
    
    console.log(`🔧 Command: ${command}`);
    console.log(`🏃‍♂️ Running ${execution.tests.length} tests...\n`);

    const startTime = Date.now();
    let success = false;
    let output = '';

    try {
      output = execSync(command, { 
        encoding: 'utf8',
        stdio: options.mode === 'dev' ? 'inherit' : 'pipe'
      });
      success = true;
    } catch (error: any) {
      output = error.stdout || error.message;
      success = false;
    }

    const duration = Date.now() - startTime;
    const stats = monitor?.getStats();

    // Record performance metrics
    if (options.monitorPerformance !== false) {
      this.perfMonitor.recordExecution('test-suite', duration, {
        testCount: execution.tests.length,
        workers: this.extractWorkerCount(jestArgs)
      });
    }

    return {
      success,
      tests: execution.tests,
      duration,
      output,
      stats
    };
  }

  private async analyzeResults(
    results: { success: boolean; tests: string[]; duration: number; output: string; stats?: any },
    options: AdvancedRunOptions
  ) {
    console.log('\n📊 Phase 4: Post-Execution Analysis');
    console.log('-------------------------------------');

    // Performance analysis
    if (options.monitorPerformance !== false && results.success) {
      const perfReport = this.perfMonitor.generateReport();
      
      console.log(`⏱️  Performance Summary:`);
      console.log(`   Average test duration: ${perfReport.summary.averageDuration}ms`);
      console.log(`   Total test time: ${(perfReport.summary.totalTestTime / 1000).toFixed(1)}s`);
      
      if (perfReport.regressions.length > 0) {
        console.log(`⚠️  Performance regressions detected: ${perfReport.regressions.length}`);
        perfReport.regressions.slice(0, 3).forEach(regression => {
          console.log(`   ${regression.testFile}: +${regression.regressionPercent.toFixed(1)}% slower`);
        });
      }
    }

    // Flaky test analysis
    if (options.detectFlaky !== false) {
      const flakyTests = this.flakyDetector.getFlakyTests(0.1);
      if (flakyTests.length > 0) {
        console.log(`🔄 Flaky tests detected: ${flakyTests.length}`);
        const remediationPlan = this.flakyDetector.generateRemediationPlan();
        console.log(`💡 ${remediationPlan.summary}`);
      } else {
        console.log('✅ No flaky tests detected');
      }
    }

    // Cache statistics
    if (options.useCache !== false) {
      const cacheStats = this.cache.getCacheStats();
      console.log(`💾 Cache: ${cacheStats.totalTests} tests cached, ${cacheStats.passed} stable`);
      
      if (cacheStats.estimatedTimeSaved > 0) {
        console.log(`⚡ Estimated time saved: ${(cacheStats.estimatedTimeSaved / 1000).toFixed(1)}s`);
      }
    }

    // Overall test health
    const stabilityScore = this.flakyDetector.getStabilityScore();
    console.log(`🎯 Test suite stability: ${stabilityScore}%`);
  }

  private getFastTests(): string[] {
    try {
      const output = execSync('find src -name "*.test.ts" -path "*/test/*" -exec grep -l "simple\\|basic\\|fast\\|unit" {} \\;', 
        { encoding: 'utf8' });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [
        'src/test/simple.test.ts',
        'src/test/search-basic.test.ts',
        'src/test/game-quality-scoring.test.ts'
      ].filter(require('fs').existsSync);
    }
  }

  private getAllTests(): string[] {
    try {
      const output = execSync('find src -name "*.test.ts" -type f', { encoding: 'utf8' });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  private buildJestCommand(tests: string[], options: AdvancedRunOptions): string[] {
    const args = [];

    // Use appropriate config
    if (options.mode === 'dev' || options.mode === 'incremental') {
      args.push('--config', 'jest.config.fast.js');
    } else if (options.mode === 'ci') {
      args.push('--config', 'jest.config.ci.js');
    }

    // Performance settings
    args.push('--maxWorkers', options.mode === 'dev' ? '75%' : '50%');

    // Behavior settings  
    if (options.bail) {
      args.push('--bail', options.bail.toString());
    }

    if (options.mode === 'dev') {
      args.push('--silent');
    }

    // Add specific test files
    args.push(...tests);

    return args;
  }

  private extractWorkerCount(jestArgs: string[]): number {
    const workerIndex = jestArgs.indexOf('--maxWorkers');
    if (workerIndex >= 0 && workerIndex + 1 < jestArgs.length) {
      const workerValue = jestArgs[workerIndex + 1];
      if (workerValue.endsWith('%')) {
        const percent = parseInt(workerValue);
        return Math.ceil((require('os').cpus().length * percent) / 100);
      }
      return parseInt(workerValue) || 1;
    }
    return 1;
  }

  // Quick run methods
  async runDev() {
    return this.run({
      mode: 'dev',
      useCache: true,
      detectFlaky: true,
      monitorPerformance: true,
      bail: 1
    });
  }

  async runIncremental() {
    return this.run({
      mode: 'incremental',
      useCache: true,
      detectFlaky: false,
      monitorPerformance: true,
      maxTests: 15,
      confidenceThreshold: 70
    });
  }

  async runCI() {
    return this.run({
      mode: 'ci',
      useCache: false, // Always run full tests in CI
      detectFlaky: true,
      monitorPerformance: true
    });
  }
}

// CLI interface
if (require.main === module) {
  const runner = new AdvancedTestRunner();
  const mode = process.argv[2] as any || 'local';
  
  runner.run({ mode }).catch(error => {
    console.error('Test run failed:', error);
    process.exit(1);
  });
}