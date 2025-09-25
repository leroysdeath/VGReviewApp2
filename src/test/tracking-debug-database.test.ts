/**
 * Tracking Debug Database Test
 * Debug test to check what's actually in the tracking tables
 */

import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Tracking Database Debug', () => {
  test('should check if user_preferences table exists and has data', async () => {
    console.log('🔍 CHECKING USER_PREFERENCES TABLE');
    console.log('=====================================');
    
    const { data, error, count } = await supabase
      .from('user_preferences')
      .select('*', { count: 'exact' });

    console.log('Error:', error);
    console.log('Count:', count);
    console.log('Data sample:', data?.slice(0, 3));
    
    if (error) {
      console.log('❌ Error accessing user_preferences:', error.message);
    } else {
      console.log(`✅ Found ${count || 0} records in user_preferences`);
    }
  });

  test('should check if game_views table exists and has data', async () => {
    console.log('🔍 CHECKING GAME_VIEWS TABLE');
    console.log('==============================');
    
    const { data, error, count } = await supabase
      .from('game_views')
      .select('*', { count: 'exact' });

    console.log('Error:', error);
    console.log('Count:', count);
    console.log('Data sample:', data?.slice(0, 3));
    
    if (error) {
      console.log('❌ Error accessing game_views:', error.message);
    } else {
      console.log(`✅ Found ${count || 0} records in game_views`);
    }
  });

  test('should check if privacy_audit_log table exists and has data', async () => {
    console.log('🔍 CHECKING PRIVACY_AUDIT_LOG TABLE');
    console.log('====================================');
    
    const { data, error, count } = await supabase
      .from('privacy_audit_log')
      .select('*', { count: 'exact' });

    console.log('Error:', error);
    console.log('Count:', count);
    console.log('Data sample:', data?.slice(0, 3));
    
    if (error) {
      console.log('❌ Error accessing privacy_audit_log:', error.message);
    } else {
      console.log(`✅ Found ${count || 0} records in privacy_audit_log`);
    }
  });

  test('should check if game_metrics_daily table exists and has data', async () => {
    console.log('🔍 CHECKING GAME_METRICS_DAILY TABLE');
    console.log('=====================================');
    
    const { data, error, count } = await supabase
      .from('game_metrics_daily')
      .select('*', { count: 'exact' });

    console.log('Error:', error);
    console.log('Count:', count);
    console.log('Data sample:', data?.slice(0, 3));
    
    if (error) {
      console.log('❌ Error accessing game_metrics_daily:', error.message);
    } else {
      console.log(`✅ Found ${count || 0} records in game_metrics_daily`);
    }
  });

  test('should test basic tracking service functionality', async () => {
    console.log('🔍 TESTING BASIC TRACKING FUNCTIONALITY');
    console.log('========================================');
    
    // Try to insert a test game view
    const testData = {
      game_id: 1,
      session_hash: 'test-session-hash-' + Date.now(),
      view_date: new Date().toISOString().split('T')[0],
      view_source: 'test'
    };

    console.log('Attempting to insert test data:', testData);
    
    const { data, error } = await supabase
      .from('game_views')
      .insert(testData)
      .select();

    if (error) {
      console.log('❌ Error inserting test data:', error.message);
      console.log('Full error:', error);
    } else {
      console.log('✅ Successfully inserted test data:', data);
      
      // Clean up the test data
      if (data && data.length > 0) {
        await supabase
          .from('game_views')
          .delete()
          .eq('id', data[0].id);
        console.log('🧹 Cleaned up test data');
      }
    }
  });

  test('should check recent users table for context', async () => {
    console.log('🔍 CHECKING RECENT USERS FOR CONTEXT');
    console.log('=====================================');
    
    const { data: users, error, count } = await supabase
      .from('user')
      .select('id, name, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('Error:', error);
    console.log('Total user count:', count);
    console.log('Recent users:', users?.map(u => ({ id: u.id, name: u.name, created: u.created_at })));
    
    if (users && users.length > 0) {
      console.log(`✅ Found ${count || 0} total users, showing 5 most recent`);
    } else {
      console.log('❌ No users found or error accessing user table');
    }
  });
});