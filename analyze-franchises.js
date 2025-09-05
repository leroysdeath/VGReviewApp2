// Quick franchise coverage analysis runner
// Run with: node analyze-franchises.js

const { execSync } = require('child_process');

console.log('🎮 FRANCHISE COVERAGE ANALYSIS');
console.log('==============================');
console.log('This will analyze popular games coverage for major franchises');
console.log('⚠️ Note: This makes API calls and may take several minutes');
console.log('');

try {
  // Set environment variables for the test
  process.env.NODE_ENV = 'test';
  process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://test.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-key';
  
  console.log('Running franchise coverage analysis...');
  
  // Run the specific test
  const result = execSync('npm test src/test/franchise-coverage-analysis.test.ts', {
    encoding: 'utf8',
    stdio: 'inherit'
  });
  
  console.log('\n✅ Analysis complete! Check the output above for detailed results.');
  
} catch (error) {
  console.error('\n❌ Analysis failed:', error.message);
  console.log('\nTip: Make sure your .env file has valid Supabase credentials');
  console.log('Or run with: VITE_SUPABASE_URL=your_url VITE_SUPABASE_ANON_KEY=your_key node analyze-franchises.js');
}