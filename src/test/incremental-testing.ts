// Phase 4: Incremental testing based on git changes
// Only runs tests affected by code changes

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname, relative } from 'path';

interface GitChange {
  file: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string;
}

interface TestImpact {
  testFile: string;
  impactReason: string[];
  priority: number; // 1 = high, 3 = low
  confidence: number; // 0-100%
}

export class IncrementalTester {
  private projectRoot = process.cwd();
  private testDir = 'src/test';

  // Get changed files from git
  getChangedFiles(baseBranch = 'main'): GitChange[] {
    try {
      // Get current branch
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      
      if (currentBranch === baseBranch) {
        // On main branch, compare with HEAD~1
        return this.parseGitOutput(
          execSync('git diff --name-status HEAD~1 HEAD', { encoding: 'utf8' })
        );
      } else {
        // On feature branch, compare with main
        return this.parseGitOutput(
          execSync(`git diff --name-status ${baseBranch}...HEAD`, { encoding: 'utf8' })
        );
      }
    } catch (error) {
      console.warn('⚠️  Could not get git changes, falling back to staged files');
      
      // Fallback to staged files
      try {
        return this.parseGitOutput(
          execSync('git diff --staged --name-status', { encoding: 'utf8' })
        );
      } catch {
        console.warn('⚠️  No git changes found, will run all tests');
        return [];
      }
    }
  }

  private parseGitOutput(output: string): GitChange[] {
    if (!output.trim()) return [];
    
    return output
      .trim()
      .split('\n')
      .map(line => {
        const [status, ...pathParts] = line.split('\t');
        const file = pathParts.join('\t');
        
        return {
          file,
          status: this.mapGitStatus(status),
          oldPath: status.startsWith('R') ? pathParts[0] : undefined
        };
      })
      .filter(change => change.file); // Filter out empty files
  }

  private mapGitStatus(status: string): GitChange['status'] {
    if (status === 'A') return 'added';
    if (status === 'D') return 'deleted';
    if (status.startsWith('R')) return 'renamed';
    return 'modified';
  }

  // Determine which tests should run based on changes
  getImpactedTests(changes: GitChange[]): TestImpact[] {
    const impacts = new Map<string, TestImpact>();
    
    for (const change of changes) {
      const testImpacts = this.analyzeFileImpact(change);
      
      for (const impact of testImpacts) {
        const existing = impacts.get(impact.testFile);
        if (existing) {
          // Merge impacts (take highest priority, combine reasons)
          existing.impactReason.push(...impact.impactReason);
          existing.priority = Math.min(existing.priority, impact.priority);
          existing.confidence = Math.max(existing.confidence, impact.confidence);
        } else {
          impacts.set(impact.testFile, impact);
        }
      }
    }
    
    return Array.from(impacts.values()).sort((a, b) => {
      // Sort by priority first, then confidence
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.confidence - a.confidence;
    });
  }

  private analyzeFileImpact(change: GitChange): TestImpact[] {
    const impacts: TestImpact[] = [];
    const { file } = change;
    
    // Direct test file changes
    if (file.endsWith('.test.ts')) {
      impacts.push({
        testFile: file,
        impactReason: ['Direct test file change'],
        priority: 1,
        confidence: 100
      });
      return impacts;
    }
    
    // Source file changes
    const testFile = this.findCorrespondingTest(file);
    if (testFile) {
      impacts.push({
        testFile,
        impactReason: [`Source file change: ${file}`],
        priority: 1,
        confidence: 95
      });
    }
    
    // Service layer changes affect integration tests
    if (file.includes('services/')) {
      const serviceTests = this.findTestsByPattern(/(integration|search|service).*\.test\.ts$/);
      for (const test of serviceTests) {
        impacts.push({
          testFile: test,
          impactReason: [`Service change: ${file}`],
          priority: 2,
          confidence: 80
        });
      }
    }
    
    // Component changes affect component tests
    if (file.includes('components/')) {
      const componentTests = this.findTestsByPattern(/(component|ui|render).*\.test\.ts$/);
      for (const test of componentTests) {
        impacts.push({
          testFile: test,
          impactReason: [`Component change: ${file}`],
          priority: 2,
          confidence: 70
        });
      }
    }
    
    // Utility changes affect many tests
    if (file.includes('utils/')) {
      const utilityTests = this.findTestsByPattern(/.*\.test\.ts$/);
      for (const test of utilityTests.slice(0, 10)) { // Limit to top 10
        impacts.push({
          testFile: test,
          impactReason: [`Utility change: ${file}`],
          priority: 3,
          confidence: 50
        });
      }
    }
    
    // Configuration changes affect all tests
    if (file.match(/\.(json|js|ts)$/) && 
        (file.includes('config') || file.includes('jest') || file === 'package.json')) {
      const allTests = this.findTestsByPattern(/.*\.test\.ts$/);
      for (const test of allTests) {
        impacts.push({
          testFile: test,
          impactReason: [`Configuration change: ${file}`],
          priority: 2,
          confidence: 90
        });
      }
    }
    
    // Database/schema changes affect data tests  
    if (file.includes('database') || file.includes('schema') || file.includes('migration')) {
      const dataTests = this.findTestsByPattern(/(data|db|migration|schema).*\.test\.ts$/);
      for (const test of dataTests) {
        impacts.push({
          testFile: test,
          impactReason: [`Database change: ${file}`],
          priority: 1,
          confidence: 85
        });
      }
    }
    
    return impacts;
  }

  private findCorrespondingTest(sourceFile: string): string | null {
    // Remove extension and add .test.ts
    const withoutExt = sourceFile.replace(/\.(ts|tsx|js|jsx)$/, '');
    const testFile = withoutExt + '.test.ts';
    
    if (existsSync(testFile)) return testFile;
    
    // Try in test directory
    const testDirFile = join(this.testDir, withoutExt.split('/').pop() + '.test.ts');
    if (existsSync(testDirFile)) return testDirFile;
    
    // Try variations
    const variations = [
      withoutExt + '.spec.ts',
      join(dirname(withoutExt), '__tests__', withoutExt.split('/').pop() + '.test.ts'),
      join(this.testDir, sourceFile.split('/').pop()?.replace(/\.(ts|tsx)$/, '.test.ts') || '')
    ];
    
    for (const variation of variations) {
      if (existsSync(variation)) return variation;
    }
    
    return null;
  }

  private findTestsByPattern(pattern: RegExp): string[] {
    const { execSync } = require('child_process');
    
    try {
      const output = execSync('find src -name "*.test.ts" -type f', { encoding: 'utf8' });
      return output
        .trim()
        .split('\n')
        .filter(file => file && pattern.test(file));
    } catch {
      // Fallback for systems without find
      return [];
    }
  }

  // Generate smart test command based on changes
  generateTestCommand(changes: GitChange[], options: {
    maxTests?: number;
    confidenceThreshold?: number;
    includeRelated?: boolean;
  } = {}): string {
    const {
      maxTests = 20,
      confidenceThreshold = 60,
      includeRelated = true
    } = options;
    
    const impacts = this.getImpactedTests(changes);
    
    // Filter by confidence and limit
    const selectedTests = impacts
      .filter(impact => impact.confidence >= confidenceThreshold)
      .slice(0, maxTests)
      .map(impact => impact.testFile);
    
    if (selectedTests.length === 0) {
      return 'npm run test:fast'; // Fallback to fast tests
    }
    
    // Add related tests if requested
    if (includeRelated && selectedTests.length < maxTests / 2) {
      const relatedTests = this.findRelatedTests(selectedTests)
        .slice(0, maxTests - selectedTests.length);
      selectedTests.push(...relatedTests);
    }
    
    return `jest ${selectedTests.join(' ')} --maxWorkers=75%`;
  }

  private findRelatedTests(testFiles: string[]): string[] {
    const related = new Set<string>();
    
    for (const testFile of testFiles) {
      // Add tests in same directory
      const dir = dirname(testFile);
      const dirTests = this.findTestsByPattern(new RegExp(`^${dir}/.*\\.test\\.ts$`));
      dirTests.forEach(test => related.add(test));
      
      // Add tests with similar names
      const baseName = testFile.split('/').pop()?.replace('.test.ts', '') || '';
      const similarTests = this.findTestsByPattern(new RegExp(`.*${baseName}.*\\.test\\.ts$`));
      similarTests.forEach(test => related.add(test));
    }
    
    // Remove original tests
    testFiles.forEach(test => related.delete(test));
    
    return Array.from(related);
  }

  // Analyze test impact for reporting
  analyzeImpact(changes: GitChange[]) {
    const impacts = this.getImpactedTests(changes);
    
    console.log('\n🔍 Incremental Test Analysis');
    console.log('============================');
    console.log(`📝 Changed files: ${changes.length}`);
    console.log(`🎯 Impacted tests: ${impacts.length}`);
    
    if (changes.length > 0) {
      console.log('\n📁 Changed files:');
      changes.forEach(change => {
        console.log(`   ${change.status.toUpperCase()}: ${change.file}`);
      });
    }
    
    if (impacts.length > 0) {
      console.log('\n🧪 Tests to run (by priority):');
      impacts.forEach((impact, index) => {
        console.log(`   ${index + 1}. ${impact.testFile}`);
        console.log(`      Priority: ${impact.priority} | Confidence: ${impact.confidence}%`);
        console.log(`      Reason: ${impact.impactReason.join(', ')}`);
      });
    }
    
    const estimatedTime = impacts.length * 2; // 2s average per test
    console.log(`\n⏱️  Estimated time: ${estimatedTime}s (vs full suite)`);
    
    return {
      totalChanges: changes.length,
      impactedTests: impacts.length,
      estimatedTimeSaved: Math.max(0, 120 - estimatedTime), // vs original 120s
      recommendation: impacts.length < 5 ? 'Run impacted tests' : 
                      impacts.length < 15 ? 'Run impacted + related tests' :
                      'Run full test suite'
    };
  }
}