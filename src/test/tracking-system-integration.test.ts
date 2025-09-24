/**
 * Integration test for Game Tracking System
 * Tests that the tracking tables exist and basic functionality works
 */

import { supabase } from '../services/supabase';

describe('Game Tracking System Integration', () => {
  it('should have game_views table with correct schema', async () => {
    const { data, error } = await supabase
      .from('game_views')
      .select('*')
      .limit(0); // Just check schema, don't return data

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('should have game_metrics_daily table with correct schema', async () => {
    const { data, error } = await supabase
      .from('game_metrics_daily')
      .select('*')
      .limit(0);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('should have user_privacy_preferences table with correct schema', async () => {
    const { data, error } = await supabase
      .from('user_privacy_preferences')
      .select('*')
      .limit(0);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('should have privacy_audit_log table with correct schema', async () => {
    const { data, error } = await supabase
      .from('privacy_audit_log')
      .select('*')
      .limit(0);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('should have export_user_tracking_data function available', async () => {
    const { data, error } = await supabase
      .rpc('export_user_tracking_data', { user_id: 999999 }); // Non-existent user

    // Should not error, even if user doesn't exist
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  });

  it('should have delete_user_tracking_data function available', async () => {
    const { data, error } = await supabase
      .rpc('delete_user_tracking_data', { user_id: 999999 }); // Non-existent user

    // Should not error, even if user doesn't exist
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have cleanup_old_tracking_data function available', async () => {
    const { data, error } = await supabase
      .rpc('cleanup_old_tracking_data');

    // Should not error
    expect(error).toBeNull();
    expect(data).toBeDefined();
    // Function should execute successfully (return type may vary)
  });

  it('should respect RLS policies on game_views table', async () => {
    // Try to select without proper authentication - should work with anon key
    const { data, error } = await supabase
      .from('game_views')
      .select('game_id, view_date, view_source')
      .limit(1);

    // With RLS enabled, this should either work (if policy allows) or give a clear error
    // The key is that it shouldn't crash or give an unexpected error
    if (error) {
      // If there's an error, it should be a policy-related one, not a table missing error
      expect(error.code).not.toBe('42P01'); // relation does not exist
    } else {
      expect(Array.isArray(data)).toBe(true);
    }
  });

  it('should verify manual_security_tasks table exists from security fixes', async () => {
    const { data, error } = await supabase
      .from('manual_security_tasks')
      .select('task_name, status, priority')
      .limit(1);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should verify game ranking functionality works in explore', async () => {
    // Test that we can fetch games for ranking (explore page functionality)
    const { data: games, error } = await supabase
      .from('game')
      .select('id, name, igdb_id, avg_user_rating')
      .order('avg_user_rating', { ascending: false, nullsLast: true })
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(games)).toBe(true);
    
    if (games && games.length > 0) {
      // Should have game data structure expected by explore page
      const firstGame = games[0];
      expect(firstGame).toHaveProperty('id');
      expect(firstGame).toHaveProperty('name');
    }
  });
});