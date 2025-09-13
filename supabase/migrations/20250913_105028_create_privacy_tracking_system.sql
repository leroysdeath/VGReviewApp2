-- Migration: Privacy-Compliant Game View Tracking System
-- Date: 2025-09-13
-- Purpose: Implement privacy-first analytics with GDPR compliance

-- ============================================
-- 1. USER PREFERENCES TABLE
-- ============================================
-- Stores user consent and tracking preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES public.user(id) ON DELETE CASCADE,
  analytics_opted_in BOOLEAN DEFAULT false,
  tracking_level TEXT DEFAULT 'anonymous' CHECK (tracking_level IN ('none', 'anonymous', 'full')),
  consent_date TIMESTAMPTZ,
  consent_ip_country TEXT, -- Store only country, not full IP
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- ============================================
-- 2. GAME VIEWS TABLE
-- ============================================
-- Minimal data collection for privacy compliance
CREATE TABLE IF NOT EXISTS public.game_views (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL,
  user_id INTEGER REFERENCES public.user(id) ON DELETE SET NULL, -- NULL for anonymous users
  session_hash TEXT NOT NULL, -- SHA-256 hash of session ID, never store raw session
  view_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Date only, no timestamps for privacy
  view_source TEXT CHECK (view_source IN ('search', 'direct', 'recommendation', 'list', 'review', 'profile')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_views_date ON public.game_views(view_date);
CREATE INDEX IF NOT EXISTS idx_game_views_game_date ON public.game_views(game_id, view_date);
CREATE INDEX IF NOT EXISTS idx_game_views_user ON public.game_views(user_id) WHERE user_id IS NOT NULL;
-- Note: Removed the cleanup index with date calculation as it causes IMMUTABLE function error
-- The cleanup will still work efficiently using idx_game_views_date

-- ============================================
-- 3. AGGREGATED METRICS TABLE
-- ============================================
-- Pre-computed daily metrics for performance
CREATE TABLE IF NOT EXISTS public.game_metrics_daily (
  game_id INTEGER NOT NULL,
  metric_date DATE NOT NULL,
  total_views INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  authenticated_views INTEGER DEFAULT 0,
  anonymous_views INTEGER DEFAULT 0,
  view_sources JSONB DEFAULT '{}', -- {"search": 10, "direct": 5, etc}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (game_id, metric_date)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_game_metrics_date ON public.game_metrics_daily(metric_date);
CREATE INDEX IF NOT EXISTS idx_game_metrics_game ON public.game_metrics_daily(game_id);

-- ============================================
-- 4. PRIVACY AUDIT LOG
-- ============================================
-- Track consent changes and data requests for compliance
CREATE TABLE IF NOT EXISTS public.privacy_audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.user(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('consent_given', 'consent_withdrawn', 'data_exported', 'data_deleted', 'preferences_updated')),
  details JSONB,
  ip_country TEXT, -- Country only for compliance
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_privacy_audit_user ON public.privacy_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_audit_date ON public.privacy_audit_log(created_at);

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_audit_log ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (user_id IN (SELECT id FROM public.user WHERE provider_id = auth.uid()));

CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (user_id IN (SELECT id FROM public.user WHERE provider_id = auth.uid()));

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.user WHERE provider_id = auth.uid()));

-- Game views policies (more restrictive)
CREATE POLICY "Users can view own game views" ON public.game_views
  FOR SELECT USING (user_id IS NULL OR user_id IN (SELECT id FROM public.user WHERE provider_id = auth.uid()));

-- Public can view aggregated metrics
CREATE POLICY "Public can view metrics" ON public.game_metrics_daily
  FOR SELECT USING (true);

-- Privacy audit log - users can only see their own
CREATE POLICY "Users can view own audit log" ON public.privacy_audit_log
  FOR SELECT USING (user_id IS NULL OR user_id IN (SELECT id FROM public.user WHERE provider_id = auth.uid()));

-- ============================================
-- 6. FUNCTIONS FOR DATA CLEANUP
-- ============================================

-- Auto-cleanup function for 90-day retention
CREATE OR REPLACE FUNCTION cleanup_old_tracking_data()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete game views older than 90 days
  DELETE FROM public.game_views 
  WHERE view_date < CURRENT_DATE - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete aggregated metrics older than 180 days
  DELETE FROM public.game_metrics_daily 
  WHERE metric_date < CURRENT_DATE - INTERVAL '180 days';
  
  -- Clean up old audit logs (keep for 2 years for compliance)
  DELETE FROM public.privacy_audit_log
  WHERE created_at < NOW() - INTERVAL '2 years';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. GDPR COMPLIANCE FUNCTIONS
-- ============================================

-- Export user's tracking data
CREATE OR REPLACE FUNCTION export_user_tracking_data(p_user_id INTEGER)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user_id', p_user_id,
    'export_date', NOW(),
    'preferences', (
      SELECT row_to_json(up) 
      FROM public.user_preferences up 
      WHERE up.user_id = p_user_id
    ),
    'game_views', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'game_id', gv.game_id,
          'view_date', gv.view_date,
          'view_source', gv.view_source
        )
      ), '[]'::json)
      FROM public.game_views gv 
      WHERE gv.user_id = p_user_id
    ),
    'audit_log', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'action', pal.action,
          'details', pal.details,
          'created_at', pal.created_at
        )
      ), '[]'::json)
      FROM public.privacy_audit_log pal
      WHERE pal.user_id = p_user_id
    )
  ) INTO result;
  
  -- Log the export
  INSERT INTO public.privacy_audit_log (user_id, action, details)
  VALUES (p_user_id, 'data_exported', json_build_object('exported_at', NOW()));
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete user's tracking data
CREATE OR REPLACE FUNCTION delete_user_tracking_data(p_user_id INTEGER)
RETURNS JSON AS $$
DECLARE
  deleted_views INTEGER;
  result JSON;
BEGIN
  -- Count views to be deleted
  SELECT COUNT(*) INTO deleted_views 
  FROM public.game_views 
  WHERE user_id = p_user_id;
  
  -- Delete user's tracking data
  DELETE FROM public.game_views WHERE user_id = p_user_id;
  
  -- Anonymize preferences (keep record that they opted out)
  UPDATE public.user_preferences 
  SET 
    analytics_opted_in = false, 
    tracking_level = 'none',
    consent_date = NULL,
    consent_ip_country = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log the deletion
  INSERT INTO public.privacy_audit_log (user_id, action, details)
  VALUES (
    p_user_id, 
    'data_deleted', 
    json_build_object(
      'deleted_at', NOW(),
      'views_deleted', deleted_views
    )
  );
  
  SELECT json_build_object(
    'success', true,
    'deleted_views', deleted_views,
    'deleted_at', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. AGGREGATE METRICS FUNCTION
-- ============================================

-- Function to aggregate daily metrics (run via cron)
CREATE OR REPLACE FUNCTION aggregate_daily_metrics(p_date DATE DEFAULT NULL)
RETURNS void AS $$
DECLARE
  target_date DATE;
BEGIN
  -- Use provided date or default to yesterday
  target_date := COALESCE(p_date, (CURRENT_DATE - INTERVAL '1 day')::DATE);
  
  -- Simplified aggregation query
  INSERT INTO public.game_metrics_daily (
    game_id,
    metric_date,
    total_views,
    unique_sessions,
    authenticated_views,
    anonymous_views,
    view_sources,
    updated_at
  )
  SELECT 
    game_id,
    target_date as metric_date,
    COUNT(*) as total_views,
    COUNT(DISTINCT session_hash) as unique_sessions,
    COUNT(user_id) as authenticated_views,
    COUNT(*) - COUNT(user_id) as anonymous_views,
    jsonb_build_object(
      'search', SUM(CASE WHEN view_source = 'search' THEN 1 ELSE 0 END),
      'direct', SUM(CASE WHEN view_source = 'direct' THEN 1 ELSE 0 END),
      'recommendation', SUM(CASE WHEN view_source = 'recommendation' THEN 1 ELSE 0 END),
      'list', SUM(CASE WHEN view_source = 'list' THEN 1 ELSE 0 END),
      'review', SUM(CASE WHEN view_source = 'review' THEN 1 ELSE 0 END),
      'profile', SUM(CASE WHEN view_source = 'profile' THEN 1 ELSE 0 END)
    ) as view_sources,
    NOW() as updated_at
  FROM public.game_views
  WHERE view_date = target_date
  GROUP BY game_id
  ON CONFLICT (game_id, metric_date) 
  DO UPDATE SET
    total_views = EXCLUDED.total_views,
    unique_sessions = EXCLUDED.unique_sessions,
    authenticated_views = EXCLUDED.authenticated_views,
    anonymous_views = EXCLUDED.anonymous_views,
    view_sources = EXCLUDED.view_sources,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Check if user has consented to tracking
CREATE OR REPLACE FUNCTION user_has_tracking_consent(p_user_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_preferences 
    WHERE user_id = p_user_id 
      AND analytics_opted_in = true
      AND tracking_level != 'none'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Get user's tracking level
CREATE OR REPLACE FUNCTION get_user_tracking_level(p_user_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  level TEXT;
BEGIN
  SELECT tracking_level INTO level
  FROM public.user_preferences
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(level, 'anonymous');
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 10. TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_metrics_daily_updated_at
  BEFORE UPDATE ON public.game_metrics_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.user_preferences IS 'Stores user privacy preferences and consent status for GDPR compliance';
COMMENT ON TABLE public.game_views IS 'Privacy-compliant game view tracking with minimal data collection';
COMMENT ON TABLE public.game_metrics_daily IS 'Pre-aggregated daily metrics to avoid querying raw tracking data';
COMMENT ON TABLE public.privacy_audit_log IS 'Audit trail for privacy-related actions for compliance';

COMMENT ON COLUMN public.game_views.session_hash IS 'SHA-256 hash of session ID - never store raw session data';
COMMENT ON COLUMN public.game_views.view_date IS 'Date only (no timestamp) for enhanced privacy';
COMMENT ON COLUMN public.user_preferences.consent_ip_country IS 'Country code only - never store full IP addresses';

-- Grant necessary permissions for functions
GRANT EXECUTE ON FUNCTION cleanup_old_tracking_data() TO authenticated;
GRANT EXECUTE ON FUNCTION export_user_tracking_data(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_tracking_data(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_tracking_consent(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tracking_level(INTEGER) TO authenticated;