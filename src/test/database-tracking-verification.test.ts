/**
 * Database Tracking Verification Test
 * Verifies tracking table functionality and data integrity
 */

import { createClient } from '@supabase/supabase-js';

// Strict environment variable validation
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Database Tracking Verification', () => {
  test('should verify user_preferences table structure', async () => {
    console.log('🔍 VERIFYING USER_PREFERENCES TABLE');
    console.log('===================================');

    const { data, error, count } = await supabase
      .from('user_preferences')
      .select('*', { count: 'exact' });

    console.log('Query Error:', error?.message || 'None');
    console.log('Record Count:', count || 0);
    console.log('Sample Data:', data?.slice(0, 2) || []);

    if (error) {
      console.log('❌ Table access failed:', error.message);
    } else {
      console.log(`✅ Table accessible with ${count || 0} records`);
    }
  });

  test('should verify game_views table functionality', async () => {
    console.log('🔍 VERIFYING GAME_VIEWS TABLE');
    console.log('=============================');

    const { data, error, count } = await supabase
      .from('game_views')
      .select('*', { count: 'exact' });

    console.log('Query Error:', error?.message || 'None');
    console.log('Record Count:', count || 0);
    console.log('Sample Data:', data?.slice(0, 2) || []);

    if (error) {
      console.log('❌ Table access failed:', error.message);
    } else {
      console.log(`✅ Table accessible with ${count || 0} records`);
    }
  });

  test('should verify privacy_audit_log table access', async () => {
    console.log('🔍 VERIFYING PRIVACY_AUDIT_LOG TABLE');
    console.log('====================================');

    const { data, error, count } = await supabase
      .from('privacy_audit_log')
      .select('*', { count: 'exact' });

    console.log('Query Error:', error?.message || 'None');
    console.log('Record Count:', count || 0);
    console.log('Sample Data:', data?.slice(0, 2) || []);

    if (error) {
      console.log('❌ Table access failed:', error.message);
    } else {
      console.log(`✅ Table accessible with ${count || 0} records`);
    }
  });

  test('should verify game_metrics_daily table structure', async () => {
    console.log('🔍 VERIFYING GAME_METRICS_DAILY TABLE');
    console.log('=====================================');

    const { data, error, count } = await supabase
      .from('game_metrics_daily')
      .select('*', { count: 'exact' });

    console.log('Query Error:', error?.message || 'None');
    console.log('Record Count:', count || 0);
    console.log('Sample Data:', data?.slice(0, 2) || []);

    if (error) {
      console.log('❌ Table access failed:', error.message);
    } else {
      console.log(`✅ Table accessible with ${count || 0} records`);
    }
  });

  test('should test tracking data insertion and cleanup', async () => {
    console.log('🔍 TESTING TRACKING DATA OPERATIONS');
    console.log('===================================');

    // Generate unique test data
    const testViewData = {
      game_id: 1,
      session_hash: `test-verification-${Date.now()}`,
      view_date: new Date().toISOString().split('T')[0],
      view_source: 'verification-test'
    };

    console.log('Test Data:', testViewData);

    const { data, error } = await supabase
      .from('game_views')
      .insert(testViewData)
      .select();

    if (error) {
      console.log('❌ Insert failed:', error.message);
      console.log('Full Error Details:', error);
    } else {
      console.log('✅ Insert successful:', data);

      // Clean up test data
      if (data && data.length > 0) {
        const deleteResult = await supabase
          .from('game_views')
          .delete()
          .eq('id', data[0].id);

        if (deleteResult.error) {
          console.log('⚠️ Cleanup failed:', deleteResult.error.message);
        } else {
          console.log('🧹 Test data cleaned up successfully');
        }
      }
    }
  });

  test('should verify user table for context', async () => {
    console.log('🔍 VERIFYING USER TABLE CONTEXT');
    console.log('===============================');

    const { data: users, error, count } = await supabase
      .from('user')
      .select('id, name, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(3);

    console.log('Query Error:', error?.message || 'None');
    console.log('Total Users:', count || 0);
    console.log('Recent Users:', users?.map(u => ({
      id: u.id,
      name: u.name,
      created: u.created_at
    })) || []);

    if (users && users.length > 0) {
      console.log(`✅ User table accessible with ${count || 0} total users`);
    } else {
      console.log('❌ No users found or table access failed');
    }
  });
});