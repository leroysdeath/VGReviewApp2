-- Avatar Moderation System Tables
-- For tracking avatar upload attempts, violations, and rate limits

-- Create avatar moderation logs table
CREATE TABLE IF NOT EXISTS avatar_moderation_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES "user"(id) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Moderation result
  approved BOOLEAN NOT NULL,
  violations TEXT[] DEFAULT '{}',
  confidence FLOAT,
  service VARCHAR(50) DEFAULT 'nsfwjs',

  -- Rate limiting tracking
  upload_type VARCHAR(20) DEFAULT 'avatar', -- avatar, banner, etc.

  -- Indexes for performance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_moderation_user_time ON avatar_moderation_logs(user_id, timestamp DESC);
CREATE INDEX idx_moderation_approved ON avatar_moderation_logs(approved, timestamp DESC);
CREATE INDEX idx_moderation_violations ON avatar_moderation_logs(user_id, approved, timestamp DESC);

-- Create violation tracking table for persistent bans
CREATE TABLE IF NOT EXISTS avatar_violations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES "user"(id) NOT NULL UNIQUE,

  -- Violation counts
  total_violations INTEGER DEFAULT 0,
  hourly_violations INTEGER DEFAULT 0,
  daily_violations INTEGER DEFAULT 0,

  -- Ban status
  upload_banned BOOLEAN DEFAULT FALSE,
  ban_type VARCHAR(20), -- 'temporary', 'permanent'
  banned_until TIMESTAMP WITH TIME ZONE,
  ban_reason TEXT,

  -- Tracking
  last_violation TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for violation lookups
CREATE INDEX idx_violations_user ON avatar_violations(user_id);
CREATE INDEX idx_violations_banned ON avatar_violations(upload_banned, banned_until);

-- Function to check if user can upload
CREATE OR REPLACE FUNCTION check_avatar_upload_allowed(p_user_id INTEGER)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  v_violations RECORD;
  v_hourly_count INTEGER;
  v_daily_count INTEGER;
  v_failed_count INTEGER;
BEGIN
  -- Check for permanent ban
  SELECT * INTO v_violations
  FROM avatar_violations
  WHERE user_id = p_user_id;

  IF v_violations.upload_banned THEN
    IF v_violations.ban_type = 'permanent' THEN
      RETURN QUERY SELECT FALSE, 'Avatar upload permanently disabled';
      RETURN;
    ELSIF v_violations.banned_until > NOW() THEN
      RETURN QUERY SELECT FALSE, 'Avatar upload temporarily disabled';
      RETURN;
    END IF;
  END IF;

  -- Check hourly limit (5 uploads per hour)
  SELECT COUNT(*) INTO v_hourly_count
  FROM avatar_moderation_logs
  WHERE user_id = p_user_id
    AND timestamp > NOW() - INTERVAL '1 hour';

  IF v_hourly_count >= 5 THEN
    RETURN QUERY SELECT FALSE, 'Hourly upload limit reached';
    RETURN;
  END IF;

  -- Check daily limit (10 uploads per day)
  SELECT COUNT(*) INTO v_daily_count
  FROM avatar_moderation_logs
  WHERE user_id = p_user_id
    AND timestamp > NOW() - INTERVAL '24 hours';

  IF v_daily_count >= 10 THEN
    RETURN QUERY SELECT FALSE, 'Daily upload limit reached';
    RETURN;
  END IF;

  -- Check failed attempts (5 per day)
  SELECT COUNT(*) INTO v_failed_count
  FROM avatar_moderation_logs
  WHERE user_id = p_user_id
    AND approved = FALSE
    AND timestamp > NOW() - INTERVAL '24 hours';

  IF v_failed_count >= 5 THEN
    RETURN QUERY SELECT FALSE, 'Too many failed attempts today';
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT TRUE, 'Upload allowed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle violations
CREATE OR REPLACE FUNCTION handle_avatar_violation(
  p_user_id INTEGER,
  p_violation_types TEXT[]
)
RETURNS VOID AS $$
DECLARE
  v_total_violations INTEGER;
  v_recent_violations INTEGER;
BEGIN
  -- Count recent violations
  SELECT COUNT(*) INTO v_recent_violations
  FROM avatar_moderation_logs
  WHERE user_id = p_user_id
    AND approved = FALSE
    AND timestamp > NOW() - INTERVAL '30 days';

  -- Update or insert violation record
  INSERT INTO avatar_violations (user_id, total_violations, last_violation)
  VALUES (p_user_id, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_violations = avatar_violations.total_violations + 1,
    last_violation = NOW(),
    updated_at = NOW();

  -- Get total violations
  SELECT total_violations INTO v_total_violations
  FROM avatar_violations
  WHERE user_id = p_user_id;

  -- Apply escalating punishments
  IF v_total_violations >= 6 THEN
    -- Permanent ban after 6 violations
    UPDATE avatar_violations
    SET
      upload_banned = TRUE,
      ban_type = 'permanent',
      ban_reason = 'Multiple violations of avatar policy'
    WHERE user_id = p_user_id;
  ELSIF v_total_violations >= 4 THEN
    -- 24 hour ban after 4 violations
    UPDATE avatar_violations
    SET
      upload_banned = TRUE,
      ban_type = 'temporary',
      banned_until = NOW() + INTERVAL '24 hours',
      ban_reason = 'Repeated violations - 24 hour suspension'
    WHERE user_id = p_user_id;
  ELSIF v_total_violations >= 2 THEN
    -- 1 hour cooldown after 2 violations
    UPDATE avatar_violations
    SET
      upload_banned = TRUE,
      ban_type = 'temporary',
      banned_until = NOW() + INTERVAL '1 hour',
      ban_reason = 'Multiple violations - 1 hour cooldown'
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add column to user table for email verification status (if not exists)
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

-- RLS Policies
ALTER TABLE avatar_moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE avatar_violations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own moderation logs
CREATE POLICY "Users can view own moderation logs"
  ON avatar_moderation_logs
  FOR SELECT
  USING (auth.uid()::text = (SELECT auth_id FROM "user" WHERE id = user_id));

-- Only admins can view violations
CREATE POLICY "Only admins can view violations"
  ON avatar_violations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "user"
      WHERE auth_id = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT ON avatar_moderation_logs TO authenticated;
GRANT SELECT ON avatar_violations TO authenticated;
GRANT EXECUTE ON FUNCTION check_avatar_upload_allowed TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE avatar_moderation_logs IS 'Tracks all avatar upload attempts and moderation results';
COMMENT ON TABLE avatar_violations IS 'Tracks user violations and ban status for avatar uploads';
COMMENT ON FUNCTION check_avatar_upload_allowed IS 'Checks if a user is allowed to upload an avatar based on rate limits and ban status';