// Phase 3: Test categorization system for optimized execution
// Allows running different test types with different strategies

export interface TestCategory {
  name: string;
  pattern: RegExp;
  timeout: number;
  parallel: boolean;
  priority: number; // Lower number = higher priority
  description: string;
}

// Categorize tests by execution requirements
export const TEST_CATEGORIES: TestCategory[] = [
  {
    name: 'unit',
    pattern: /\.(unit|spec)\.test\.ts$/,
    timeout: 5000,
    parallel: true,
    priority: 1,
    description: 'Fast unit tests with full parallelization'
  },
  
  {
    name: 'fast',
    pattern: /(simple|basic|fast).*\.test\.ts$/,
    timeout: 8000,
    parallel: true, 
    priority: 2,
    description: 'Quick integration tests'
  },
  
  {
    name: 'integration',
    pattern: /(integration|search|game|franchise).*\.test\.ts$/,
    timeout: 15000,
    parallel: true,
    priority: 3,
    description: 'Standard integration tests'
  },
  
  {
    name: 'coordination',
    pattern: /(coordination|timing).*\.test\.ts$/,
    timeout: 25000,
    parallel: false, // These need sequential execution due to timing
    priority: 4,
    description: 'Timing-sensitive tests (sequential only)'
  },
  
  {
    name: 'performance',
    pattern: /(performance|benchmark|stress).*\.test\.ts$/,
    timeout: 30000,
    parallel: false,
    priority: 5,
    description: 'Performance benchmarks (run last)'
  }
];

// Get category for a test file
export function categorizeTest(filePath: string): TestCategory {
  for (const category of TEST_CATEGORIES) {
    if (category.pattern.test(filePath)) {
      return category;
    }
  }
  
  // Default category for unmatched tests
  return {
    name: 'default',
    pattern: /.*\.test\.ts$/,
    timeout: 15000,
    parallel: true,
    priority: 3,
    description: 'Default test category'
  };
}

// Group tests by category
export function groupTestsByCategory(testFiles: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  
  for (const file of testFiles) {
    const category = categorizeTest(file);
    const existing = groups.get(category.name) || [];
    existing.push(file);
    groups.set(category.name, existing);
  }
  
  return groups;
}

// Generate Jest run configs for different scenarios
export const TEST_CONFIGS = {
  // Development: Fast feedback loop
  dev: {
    categories: ['unit', 'fast'],
    maxWorkers: '75%',
    bail: 1, // Stop on first failure for faster feedback
    verbose: false,
    coverage: false
  },
  
  // Pre-commit: Quick but thorough
  preCommit: {
    categories: ['unit', 'fast', 'integration'],  
    maxWorkers: '50%',
    bail: 5,
    verbose: false,
    coverage: true
  },
  
  // CI: Full test suite
  ci: {
    categories: ['unit', 'fast', 'integration', 'coordination', 'performance'],
    maxWorkers: '50%',
    bail: 0, // Run all tests
    verbose: true,
    coverage: true
  },
  
  // Local testing: Quick verification
  local: {
    categories: ['unit', 'fast'],
    maxWorkers: '100%',
    bail: 3,
    verbose: true,
    coverage: false
  }
};

// Smart test selection based on changed files
export function selectTestsForChanges(changedFiles: string[]): string[] {
  const relevantTests: Set<string> = new Set();
  
  for (const file of changedFiles) {
    // Direct test file
    if (file.includes('.test.ts')) {
      relevantTests.add(file);
      continue;
    }
    
    // Map source files to related tests
    if (file.includes('/services/')) {
      // Service changes -> integration tests
      relevantTests.add('integration');
    } else if (file.includes('/components/')) {
      // Component changes -> unit tests
      relevantTests.add('unit');
    } else if (file.includes('/utils/')) {
      // Utility changes -> fast tests
      relevantTests.add('fast');
    }
  }
  
  return Array.from(relevantTests);
}