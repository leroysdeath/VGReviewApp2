#!/usr/bin/env node

// Test Enhanced Search Service
// Usage: node scripts/test-enhanced-search.js [search-term]

// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Make fetch global for the services
global.fetch = fetch;

// Configuration - Load from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: false
  }
});

// Simple test implementation mimicking the enhanced search service
class TestSearchService {
  async testDatabaseSearch(query) {
    try {
      console.log(`🔍 Testing database search for: "${query}"`);
      
      const { data: games, error } = await supabase
        .from('game')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(10);

      if (error) {
        console.error('❌ Database search error:', error);
        return [];
      }

      console.log(`📊 Database results: ${games?.length || 0} games found`);
      if (games && games.length > 0) {
        games.slice(0, 3).forEach((game, index) => {
          console.log(`  ${index + 1}. ${game.name} (ID: ${game.id}, IGDB: ${game.igdb_id})`);
        });
      }

      return games || [];
    } catch (error) {
      console.error('❌ Database search failed:', error);
      return [];
    }
  }

  async testIGDBSearch(query) {
    try {
      console.log(`🌐 Testing IGDB search for: "${query}"`);
      
      const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerm: query,
          limit: 10
        })
      });

      if (!response.ok) {
        console.error(`❌ IGDB API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      
      if (!data.success) {
        console.error('❌ IGDB API returned error:', data.error);
        return [];
      }

      const games = data.games || [];
      console.log(`📊 IGDB results: ${games.length} games found`);
      if (games.length > 0) {
        games.slice(0, 3).forEach((game, index) => {
          console.log(`  ${index + 1}. ${game.name} (ID: ${game.id})`);
        });
      }

      return games;
    } catch (error) {
      console.error('❌ IGDB search failed:', error);
      return [];
    }
  }

  async testEnhancedSearch(query) {
    console.log(`\n🚀 Testing Enhanced Search for: "${query}"`);
    console.log('=' .repeat(60));

    const dbResults = await this.testDatabaseSearch(query);
    const igdbResults = await this.testIGDBSearch(query);

    console.log(`\n📈 Summary:`);
    console.log(`  Database: ${dbResults.length} results`);
    console.log(`  IGDB API: ${igdbResults.length} results`);

    // Simulate fallback logic
    const fallbackThreshold = 3;
    if (dbResults.length < fallbackThreshold && igdbResults.length > 0) {
      console.log(`\n💡 Fallback triggered! Database had < ${fallbackThreshold} results`);
      console.log(`   Would combine ${dbResults.length} DB + ${igdbResults.length} IGDB results`);
      
      // Show which IGDB games would be added
      const dbIgdbIds = new Set(dbResults.map(g => g.igdb_id).filter(Boolean));
      const newGames = igdbResults.filter(game => !dbIgdbIds.has(game.id));
      
      if (newGames.length > 0) {
        console.log(`\n📋 New games from IGDB that would be added:`);
        newGames.slice(0, 5).forEach((game, index) => {
          console.log(`  ${index + 1}. ${game.name} (IGDB ID: ${game.id})`);
        });
      }
    } else if (dbResults.length >= fallbackThreshold) {
      console.log(`\n✅ Database search sufficient (>= ${fallbackThreshold} results)`);
    } else {
      console.log(`\n❌ No results from either source`);
    }

    return {
      database: dbResults,
      igdb: igdbResults,
      fallbackTriggered: dbResults.length < fallbackThreshold && igdbResults.length > 0
    };
  }
}

// Test specific games that were mentioned as missing
const testGames = [
  'Mega Man X2',
  'Mega Man X3', 
  'MMX2',
  'MMX3',
  'Final Fantasy VII',
  'Zelda',
  'Mario',
  'Cyberpunk'
];

async function runTests() {
  const service = new TestSearchService();
  
  // Check if Netlify dev is running
  try {
    console.log('🔍 Checking if Netlify dev server is running...');
    const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchTerm: 'test', limit: 1 })
    });
    
    if (!response.ok && response.status !== 400) {
      throw new Error(`Server responded with ${response.status}`);
    }
    console.log('✅ Netlify dev server is running');
  } catch (error) {
    console.error('❌ Netlify dev server is not running on localhost:8888');
    console.error('   Please run "netlify dev" first to test IGDB functions');
    process.exit(1);
  }

  // Test database connection
  try {
    console.log('🔍 Testing database connection...');
    const { data, error } = await supabase
      .from('game')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Database connection working');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }

  // Test specific game if provided as argument
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const testQuery = args.join(' ');
    await service.testEnhancedSearch(testQuery);
    return;
  }

  // Run tests for all predefined games
  console.log('\n🧪 Running Enhanced Search Tests');
  console.log('=' .repeat(60));

  for (const game of testGames) {
    try {
      await service.testEnhancedSearch(game);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Test failed for "${game}":`, error.message);
    }
  }

  console.log('\n🎉 All tests completed!');
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test suite failed:', error.message);
  process.exit(1);
});