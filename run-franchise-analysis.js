// Direct franchise analysis runner
// This bypasses Jest and runs the analysis directly

import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

console.log('🎮 FRANCHISE COVERAGE ANALYSIS - DIRECT RUNNER');
console.log('===============================================');
console.log('Loading environment...');

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure your .env file contains:');
  console.log('VITE_SUPABASE_URL=your_supabase_url');
  console.log('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  process.exit(1);
}

console.log('✅ Environment loaded successfully');
console.log('📡 Running analysis with real API calls...');
console.log('⚠️  This may take several minutes and will use API quota');
console.log('');

// Import and run the analysis
async function runAnalysis() {
  try {
    console.log('Starting franchise coverage analysis...\n');
    
    const result = execSync('npm test src/test/franchise-coverage-analysis.test.ts -- --testTimeout=300000 --verbose', {
      encoding: 'utf8',
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    
    console.log('\n✅ Analysis completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
    console.log('\nThis could be due to:');
    console.log('1. API rate limiting - try again in a few minutes');
    console.log('2. Network connectivity issues');
    console.log('3. Invalid Supabase credentials');
    console.log('4. TypeScript compilation issues');
    
    // Let's try a simpler approach
    console.log('\n🔄 Trying simpler test approach...');
    try {
      execSync('npm test src/test/sister-game-simple.test.ts', {
        encoding: 'utf8',
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'test'
        }
      });
    } catch (simpleError) {
      console.error('Simple test also failed:', simpleError.message);
    }
  }
}

runAnalysis();