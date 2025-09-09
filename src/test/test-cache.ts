// Phase 4: Advanced test result caching system
// Skips tests when source files haven't changed

import { createHash } from 'crypto';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface TestResult {
  filePath: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  sourceHash: string;
  dependencyHashes: string[];
  timestamp: number;
  errors?: string[];
}

interface CacheEntry {
  testFile: string;
  sourceFiles: string[];
  lastRun: number;
  result: TestResult;
  dependencies: string[];
}

export class TestCache {
  private cacheDir = join(process.cwd(), 'node_modules', '.cache', 'jest-smart-cache');
  private cache = new Map<string, CacheEntry>();
  private enabled = process.env.NODE_ENV !== 'ci'; // Disable in CI for safety

  constructor() {
    this.ensureCacheDir();
    this.loadCache();
  }

  private ensureCacheDir() {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private loadCache() {
    const cacheFile = join(this.cacheDir, 'test-results.json');
    if (existsSync(cacheFile)) {
      try {
        const data = JSON.parse(readFileSync(cacheFile, 'utf8'));
        this.cache = new Map(data.entries || []);
      } catch (error) {
        console.warn('⚠️  Failed to load test cache, starting fresh');
      }
    }
  }

  private saveCache() {
    const cacheFile = join(this.cacheDir, 'test-results.json');
    const data = {
      version: '1.0.0',
      timestamp: Date.now(),
      entries: Array.from(this.cache.entries())
    };
    writeFileSync(cacheFile, JSON.stringify(data, null, 2));
  }

  // Calculate hash for file content
  private getFileHash(filePath: string): string {
    try {
      const content = readFileSync(filePath, 'utf8');
      return createHash('md5').update(content).digest('hex');
    } catch {
      return 'missing';
    }
  }

  // Get source files that a test depends on
  private getTestDependencies(testFile: string): string[] {
    const dependencies = new Set<string>();
    
    // Add the test file itself
    dependencies.add(testFile);
    
    // Infer dependencies based on test file path and content
    try {
      const content = readFileSync(testFile, 'utf8');
      
      // Extract imports and requires
      const importMatches = content.match(/(?:import|require)\s*\(?['"]([^'"]+)['"]/g) || [];
      for (const match of importMatches) {
        const imported = match.match(/['"]([^'"]+)['"]/)?.[1];
        if (imported && !imported.startsWith('node_modules') && !imported.startsWith('@')) {
          const resolvedPath = this.resolveImportPath(imported, testFile);
          if (resolvedPath) {
            dependencies.add(resolvedPath);
          }
        }
      }
      
      // Add common source files based on test name
      const testDir = testFile.replace(/\.test\.ts$/, '');
      if (existsSync(testDir + '.ts')) dependencies.add(testDir + '.ts');
      if (existsSync(testDir + '.tsx')) dependencies.add(testDir + '.tsx');
      
      // Add service files for integration tests
      if (testFile.includes('integration') || testFile.includes('search')) {
        const serviceFiles = [
          'src/services/gameSearchService.ts',
          'src/services/supabaseService.ts',
          'src/utils/contentProtectionFilter.ts'
        ];
        serviceFiles.forEach(file => {
          if (existsSync(file)) dependencies.add(file);
        });
      }
      
    } catch (error) {
      // Fallback to basic dependencies
      dependencies.add('src/services/gameSearchService.ts');
    }
    
    return Array.from(dependencies).filter(dep => existsSync(dep));
  }

  private resolveImportPath(importPath: string, fromFile: string): string | null {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const baseDir = fromFile.split('/').slice(0, -1).join('/');
      const resolved = join(baseDir, importPath);
      
      // Try different extensions
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        if (existsSync(resolved + ext)) return resolved + ext;
      }
      
      // Try index files
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        if (existsSync(join(resolved, 'index' + ext))) {
          return join(resolved, 'index' + ext);
        }
      }
    }
    
    return null;
  }

  // Check if test can be skipped based on cache
  canSkipTest(testFile: string): boolean {
    if (!this.enabled) return false;
    
    const cached = this.cache.get(testFile);
    if (!cached) return false;
    
    // Don't skip failed tests
    if (cached.result.status === 'failed') return false;
    
    // Check if any dependencies changed
    const dependencies = this.getTestDependencies(testFile);
    for (const dep of dependencies) {
      const currentHash = this.getFileHash(dep);
      const cachedHash = cached.result.dependencyHashes[dependencies.indexOf(dep)];
      
      if (currentHash !== cachedHash) {
        return false; // Dependency changed
      }
    }
    
    // Check age (don't skip tests older than 24 hours)
    const ageHours = (Date.now() - cached.lastRun) / (1000 * 60 * 60);
    if (ageHours > 24) return false;
    
    return true;
  }

  // Record test result
  recordResult(testFile: string, result: TestResult) {
    if (!this.enabled) return;
    
    const dependencies = this.getTestDependencies(testFile);
    const dependencyHashes = dependencies.map(dep => this.getFileHash(dep));
    
    const entry: CacheEntry = {
      testFile,
      sourceFiles: dependencies,
      lastRun: Date.now(),
      result: {
        ...result,
        dependencyHashes
      },
      dependencies
    };
    
    this.cache.set(testFile, entry);
    this.saveCache();
  }

  // Get cached result for display
  getCachedResult(testFile: string): TestResult | null {
    const cached = this.cache.get(testFile);
    return cached ? cached.result : null;
  }

  // Clear cache for specific test or all
  clearCache(testFile?: string) {
    if (testFile) {
      this.cache.delete(testFile);
    } else {
      this.cache.clear();
    }
    this.saveCache();
  }

  // Get cache statistics
  getCacheStats() {
    const entries = Array.from(this.cache.values());
    const passed = entries.filter(e => e.result.status === 'passed').length;
    const failed = entries.filter(e => e.result.status === 'failed').length;
    const totalDuration = entries.reduce((sum, e) => sum + e.result.duration, 0);
    
    return {
      totalTests: entries.length,
      passed,
      failed,
      averageDuration: entries.length > 0 ? totalDuration / entries.length : 0,
      cacheHitPotential: passed, // Tests that could potentially be skipped
      estimatedTimeSaved: passed * (totalDuration / entries.length || 0)
    };
  }

  // Intelligent cache warming
  warmCache(testFiles: string[]) {
    console.log('🔥 Warming test cache...');
    
    // Sort by dependency complexity (simpler tests first)
    const sortedTests = testFiles.sort((a, b) => {
      const depsA = this.getTestDependencies(a).length;
      const depsB = this.getTestDependencies(b).length;
      return depsA - depsB;
    });
    
    console.log(`📊 Cache warming plan: ${sortedTests.length} tests, estimated dependencies:`);
    sortedTests.forEach(test => {
      const deps = this.getTestDependencies(test).length;
      console.log(`   ${test}: ${deps} dependencies`);
    });
  }
}