// Phase 3: Smart test runner with optimization strategies
// Provides different execution modes based on context

import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { TEST_CONFIGS, categorizeTest } from './test-categories';
import { createExecutionPlan, calculateOptimalWorkers } from './parallel-execution';

export type TestMode = 'dev' | 'preCommit' | 'ci' | 'local';

export interface TestRunOptions {
  mode: TestMode;
  changedFiles?: string[];
  bail?: number;
  verbose?: boolean;
  coverage?: boolean;
  maxWorkers?: string;
}

export class SmartTestRunner {
  private testDir = 'src/test';
  private testFiles: string[] = [];
  
  constructor() {
    this.loadTestFiles();
  }
  
  private loadTestFiles() {
    const getAllFiles = (dir: string): string[] => {
      const files: string[] = [];
      const entries = readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...getAllFiles(fullPath));
        } else if (entry.endsWith('.test.ts')) {
          files.push(fullPath);
        }
      }
      
      return files;
    };
    
    this.testFiles = getAllFiles(this.testDir);
  }
  
  // Run tests with smart optimization
  public run(options: TestRunOptions): void {
    const config = TEST_CONFIGS[options.mode];
    const testFiles = this.selectTests(options);
    const plan = createExecutionPlan(testFiles);
    
    console.log(`\n🚀 Starting ${options.mode} test run`);
    console.log(`📁 Selected ${testFiles.length} test files`);
    console.log(`⏱️  Estimated time: ${Math.ceil(plan.totalEstimatedTime / 1000)}s`);
    console.log(`🔧 Workers: ${options.maxWorkers || calculateOptimalWorkers()}`);
    
    // Build Jest command
    const jestArgs = this.buildJestCommand(options, testFiles);
    
    try {
      console.log(`\n🔍 Running: jest ${jestArgs.join(' ')}\n`);
      execSync(`npx jest ${jestArgs.join(' ')}`, { stdio: 'inherit' });
      console.log('\n✅ All tests passed!');
    } catch (error) {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    }
  }
  
  private selectTests(options: TestRunOptions): string[] {
    const config = TEST_CONFIGS[options.mode];
    
    // If specific changed files provided, run related tests
    if (options.changedFiles && options.changedFiles.length > 0) {
      return this.getRelatedTests(options.changedFiles);
    }
    
    // Filter by categories for the mode
    return this.testFiles.filter(file => {
      const category = categorizeTest(file);
      return config.categories.includes(category.name);
    });
  }
  
  private getRelatedTests(changedFiles: string[]): string[] {
    const relatedTests = new Set<string>();
    
    for (const file of changedFiles) {
      // Direct test file
      if (file.endsWith('.test.ts')) {
        relatedTests.add(file);
        continue;
      }
      
      // Map source files to test files
      const possibleTestFile = file.replace(/\.(ts|tsx)$/, '.test.ts');
      if (this.testFiles.includes(possibleTestFile)) {
        relatedTests.add(possibleTestFile);
      }
      
      // Service files -> integration tests
      if (file.includes('services/')) {
        this.testFiles.filter(t => categorizeTest(t).name === 'integration')
          .forEach(t => relatedTests.add(t));
      }
      
      // Component files -> unit tests
      if (file.includes('components/')) {
        this.testFiles.filter(t => categorizeTest(t).name === 'unit')
          .forEach(t => relatedTests.add(t));
      }
    }
    
    return Array.from(relatedTests);
  }
  
  private buildJestCommand(options: TestRunOptions, testFiles: string[]): string[] {
    const args: string[] = [];
    
    // Use appropriate config
    if (options.mode === 'dev' || options.mode === 'local') {
      args.push('--config', 'jest.config.fast.js');
    } else if (options.mode === 'ci') {
      args.push('--config', 'jest.config.ci.js');
    }
    
    // Performance settings
    args.push('--maxWorkers', options.maxWorkers || calculateOptimalWorkers());
    
    // Behavior settings
    if (options.bail !== undefined) {
      args.push('--bail', options.bail.toString());
    }
    
    if (options.verbose) {
      args.push('--verbose');
    } else {
      args.push('--silent');
    }
    
    if (options.coverage) {
      args.push('--coverage');
    }
    
    // Specific test files (if not running all)
    if (testFiles.length < this.testFiles.length) {
      args.push(...testFiles);
    }
    
    return args;
  }
  
  // Quick development feedback
  public runDev(changedFiles?: string[]) {
    this.run({
      mode: 'dev',
      changedFiles,
      bail: 1,
      verbose: false,
      coverage: false,
      maxWorkers: '75%'
    });
  }
  
  // Pre-commit validation
  public runPreCommit() {
    this.run({
      mode: 'preCommit',
      bail: 5,
      verbose: false,
      coverage: true,
      maxWorkers: '50%'
    });
  }
  
  // Full CI suite
  public runCI() {
    this.run({
      mode: 'ci',
      bail: 0,
      verbose: true,
      coverage: true,
      maxWorkers: '50%'
    });
  }
}

// CLI interface
if (require.main === module) {
  const runner = new SmartTestRunner();
  const mode = (process.argv[2] as TestMode) || 'local';
  
  switch (mode) {
    case 'dev':
      runner.runDev();
      break;
    case 'preCommit':
      runner.runPreCommit();
      break;
    case 'ci':
      runner.runCI();
      break;
    default:
      runner.run({ mode: 'local' });
  }
}