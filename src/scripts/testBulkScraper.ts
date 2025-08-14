#!/usr/bin/env node

// Test script for IGDB Bulk Scraper
// This performs a minimal test to verify the scraper is working

import { IGDBBulkScraper } from '../services/igdbBulkScraper';

async function testScraper() {
  console.log('🧪 Testing IGDB Bulk Scraper');
  console.log('============================\n');

  // Create a test configuration with minimal data
  const testConfig = {
    batchSize: 10, // Very small batch for testing
    maxConcurrentRequests: 2,
    requestsPerSecond: 1, // Slow rate for testing
    outputDirectory: './test-igdb-data',
    endpoints: ['genres'], // Start with smallest dataset
  };

  const scraper = new IGDBBulkScraper(testConfig);

  console.log('📋 Test Configuration:');
  console.log('  - Batch Size: 10 records');
  console.log('  - Rate: 1 request/second');
  console.log('  - Endpoint: genres (smallest dataset)');
  console.log('  - Output: ./test-igdb-data');
  console.log();

  try {
    console.log('🚀 Starting test scrape...');
    
    // Test scraping just the genres endpoint (should be quick)
    const results = await scraper.startBulkScraping();
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n📊 Test Results:');
    console.log('================');
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = Math.round(result.duration / 1000);
      
      console.log(`${status} ${result.endpoint}:`);
      console.log(`   Records: ${result.totalRecords}`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Output: ${result.outputFile}`);
      
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length}`);
        result.errors.forEach(error => {
          console.log(`     - ${error}`);
        });
      }
    });

    const totalRecords = results.reduce((sum, r) => sum + r.totalRecords, 0);
    const allSuccessful = results.every(r => r.success);

    if (allSuccessful && totalRecords > 0) {
      console.log('\n🎉 Test PASSED!');
      console.log(`   Successfully scraped ${totalRecords} records`);
      console.log('   The bulk scraper is working correctly');
      console.log('\n💡 Next steps:');
      console.log('   • Check the test output in ./test-igdb-data/');
      console.log('   • Run the full scraper with: npm run scrape-igdb');
      console.log('   • Start with: npm run scrape-igdb -- --endpoints games,platforms,genres');
    } else {
      console.log('\n❌ Test FAILED!');
      console.log('   Some operations were unsuccessful');
      console.log('   Check the errors above and verify your API credentials');
    }

  } catch (error) {
    console.error('\n💥 Test failed with error:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      
      if (error.message.includes('401') || error.message.includes('authentication')) {
        console.error('\n🔐 Authentication Error:');
        console.error('   • Check your TWITCH_CLIENT_ID environment variable');
        console.error('   • Check your TWITCH_APP_ACCESS_TOKEN environment variable');
        console.error('   • Verify your Twitch app has IGDB API access');
        console.error('\n   These should be set in your .env file or Netlify environment variables');
      }
      
      if (error.message.includes('fetch') || error.message.includes('network')) {
        console.error('\n🌐 Network Error:');
        console.error('   • Check your internet connection');
        console.error('   • Verify the Netlify function is deployed and working');
        console.error('   • Test the function directly at /.netlify/functions/igdb-search');
      }
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure your Netlify development server is running (npm run dev)');
    console.log('   2. Check your .env file has the correct Twitch API credentials');
    console.log('   3. Verify the IGDB API credentials are working in the main app');
    console.log('   4. Check the console for more detailed error messages');
    
    process.exit(1);
  }
}

// Run the test
testScraper().catch(error => {
  console.error('Unhandled error in test:', error);
  process.exit(1);
});