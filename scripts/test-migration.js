#!/usr/bin/env node

/**
 * Migration Test Script
 * 
 * Tests the IGDB metrics migration in a safe way before applying to production.
 * Verifies schema changes, constraints, triggers, and functions work as expected.
 */

import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class MigrationTester {
  async runTests() {
    console.log('🧪 Testing IGDB Metrics Migration');
    console.log('=====================================\n');

    const tests = [
      () => this.testSchemaExists(),
      () => this.testConstraints(),
      () => this.testTriggers(),
      () => this.testFunctions(),
      () => this.testIndexes(),
      () => this.testView(),
      () => this.testDataInsertion()
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        await test();
        passed++;
      } catch (error) {
        console.error(`❌ Test failed: ${error.message}`);
        failed++;
      }
    }

    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${passed + failed}`);

    if (failed > 0) {
      console.log('\n⚠️  Some tests failed. Review the migration before applying to production.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed! Migration looks good.');
    }
  }

  async testSchemaExists() {
    console.log('🔍 Testing schema changes...');
    
    // Test that new columns exist
    const { data, error } = await supabase
      .from('game')
      .select('total_rating, rating_count, follows, hypes, popularity_score')
      .limit(1);

    if (error) {
      throw new Error(`Schema test failed: ${error.message}`);
    }

    console.log('   ✅ New columns exist');
  }

  async testConstraints() {
    console.log('🔒 Testing constraints...');
    
    // Test that negative values are rejected
    const testGame = {
      igdb_id: 999999,
      name: 'Constraint Test Game',
      total_rating: -5, // Should fail
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('game')
      .insert([testGame]);

    if (!error) {
      throw new Error('Constraint test failed: negative values should be rejected');
    }

    if (!error.message.includes('check constraint') && !error.message.includes('violates')) {
      throw new Error(`Unexpected constraint error: ${error.message}`);
    }

    console.log('   ✅ Check constraints working');
  }

  async testTriggers() {
    console.log('⚡ Testing triggers...');
    
    const testGame = {
      igdb_id: 999998,
      name: 'Trigger Test Game',
      follows: 1000,
      hypes: 500,
      rating_count: 50,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('game')
      .insert([testGame])
      .select()
      .single();

    if (error) {
      throw new Error(`Trigger test failed: ${error.message}`);
    }

    // Check that popularity_score was auto-calculated
    if (!data.popularity_score || data.popularity_score <= 0) {
      throw new Error('Trigger test failed: popularity_score not calculated');
    }

    // Expected: 1000*0.6 + 500*0.3 + 50*10*0.1 = 600 + 150 + 50 = 800
    const expected = Math.round(1000 * 0.6 + 500 * 0.3 + 50 * 10 * 0.1);
    if (data.popularity_score !== expected) {
      throw new Error(`Trigger calculation incorrect: expected ${expected}, got ${data.popularity_score}`);
    }

    // Cleanup
    await supabase.from('game').delete().eq('igdb_id', 999998);

    console.log('   ✅ Triggers working correctly');
  }

  async testFunctions() {
    console.log('⚙️  Testing functions...');
    
    // Test popularity score calculation function
    const { data, error } = await supabase.rpc('calculate_popularity_score', {
      p_follows: 10000,
      p_hypes: 1000,
      p_rating_count: 100
    });

    if (error) {
      throw new Error(`Function test failed: ${error.message}`);
    }

    const expected = Math.round(10000 * 0.6 + 1000 * 0.3 + 100 * 10 * 0.1);
    if (data !== expected) {
      throw new Error(`Function calculation incorrect: expected ${expected}, got ${data}`);
    }

    // Test metrics completion stats function
    const { data: stats, error: statsError } = await supabase.rpc('get_metrics_completion_stats');

    if (statsError) {
      throw new Error(`Stats function test failed: ${statsError.message}`);
    }

    if (!stats || !Array.isArray(stats) || stats.length === 0) {
      throw new Error('Stats function returned invalid data');
    }

    const stat = stats[0];
    if (typeof stat.total_games !== 'number' || typeof stat.completion_percentage !== 'number') {
      throw new Error('Stats function returned invalid format');
    }

    console.log('   ✅ Functions working correctly');
  }

  async testIndexes() {
    console.log('📇 Testing indexes...');
    
    // Test that queries using the new columns work efficiently
    const queries = [
      supabase.from('game').select('name').gt('total_rating', 80).limit(1),
      supabase.from('game').select('name').gt('follows', 1000).limit(1),
      supabase.from('game').select('name').order('popularity_score', { ascending: false }).limit(1)
    ];

    for (const query of queries) {
      const { error } = await query;
      if (error) {
        throw new Error(`Index test failed: ${error.message}`);
      }
    }

    console.log('   ✅ Indexes working (queries successful)');
  }

  async testView() {
    console.log('👁️  Testing view...');
    
    const { data, error } = await supabase
      .from('game_metrics_summary')
      .select('name, popularity_tier, metrics_status')
      .limit(1);

    if (error) {
      throw new Error(`View test failed: ${error.message}`);
    }

    console.log('   ✅ View accessible');
  }

  async testDataInsertion() {
    console.log('💾 Testing data insertion...');
    
    const testGame = {
      igdb_id: 999997,
      name: 'Data Test Game',
      total_rating: 85,
      rating_count: 100,
      follows: 5000,
      hypes: 200,
      igdb_rating: 87,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert
    const { data, error } = await supabase
      .from('game')
      .insert([testGame])
      .select()
      .single();

    if (error) {
      throw new Error(`Data insertion failed: ${error.message}`);
    }

    // Verify all fields were stored
    if (data.total_rating !== 85 || data.rating_count !== 100 || 
        data.follows !== 5000 || data.hypes !== 200) {
      throw new Error('Data insertion failed: values not stored correctly');
    }

    // Verify popularity_score was calculated
    if (!data.popularity_score || data.popularity_score <= 0) {
      throw new Error('Data insertion failed: popularity_score not calculated');
    }

    // Update test
    const { error: updateError } = await supabase
      .from('game')
      .update({ follows: 10000 })
      .eq('igdb_id', 999997);

    if (updateError) {
      throw new Error(`Data update failed: ${updateError.message}`);
    }

    // Verify trigger updated popularity_score
    const { data: updated } = await supabase
      .from('game')
      .select('popularity_score')
      .eq('igdb_id', 999997)
      .single();

    if (!updated || updated.popularity_score === data.popularity_score) {
      throw new Error('Data update failed: popularity_score not recalculated');
    }

    // Cleanup
    await supabase.from('game').delete().eq('igdb_id', 999997);

    console.log('   ✅ Data insertion and updates working');
  }
}

// Main execution
async function main() {
  try {
    const tester = new MigrationTester();
    await tester.runTests();
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }
}

main();