-- Apply manual flags migration directly
-- Add manual flag columns to game table
ALTER TABLE game 
ADD COLUMN IF NOT EXISTS greenlight_flag BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS redlight_flag BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS flag_reason TEXT,
ADD COLUMN IF NOT EXISTS flagged_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN game.greenlight_flag IS 'Admin override: game should never be filtered (true = always show)';
COMMENT ON COLUMN game.redlight_flag IS 'Admin override: game should always be filtered (true = always hide)';
COMMENT ON COLUMN game.flag_reason IS 'Reason for manual flagging';
COMMENT ON COLUMN game.flagged_by IS 'User ID who set the flag';
COMMENT ON COLUMN game.flagged_at IS 'Timestamp when flag was set';

-- Create indexes for flag queries
CREATE INDEX IF NOT EXISTS idx_game_greenlight_flag ON game(greenlight_flag) WHERE greenlight_flag = true;
CREATE INDEX IF NOT EXISTS idx_game_redlight_flag ON game(redlight_flag) WHERE redlight_flag = true;
CREATE INDEX IF NOT EXISTS idx_game_flagged_at ON game(flagged_at DESC) WHERE flagged_at IS NOT NULL;

-- Add constraint to prevent conflicting flags
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_flag_conflict'
    ) THEN
        ALTER TABLE game ADD CONSTRAINT check_flag_conflict 
        CHECK (NOT (greenlight_flag = true AND redlight_flag = true));
    END IF;
END $$;

-- Function to set manual flags
CREATE OR REPLACE FUNCTION set_game_flag(
  p_game_id INTEGER,
  p_flag_type TEXT, -- 'greenlight', 'redlight', or 'clear'
  p_reason TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Validate flag type
  IF p_flag_type NOT IN ('greenlight', 'redlight', 'clear') THEN
    RAISE EXCEPTION 'Invalid flag type. Must be greenlight, redlight, or clear';
  END IF;
  
  -- Check if game exists
  SELECT COUNT(*) INTO v_count FROM game WHERE id = p_game_id;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Game with id % does not exist', p_game_id;
  END IF;
  
  -- Update the flags based on flag type
  IF p_flag_type = 'greenlight' THEN
    UPDATE game SET 
      greenlight_flag = true,
      redlight_flag = false,
      flag_reason = p_reason,
      flagged_by = p_user_id,
      flagged_at = NOW()
    WHERE id = p_game_id;
  ELSIF p_flag_type = 'redlight' THEN
    UPDATE game SET 
      greenlight_flag = false,
      redlight_flag = true,
      flag_reason = p_reason,
      flagged_by = p_user_id,
      flagged_at = NOW()
    WHERE id = p_game_id;
  ELSIF p_flag_type = 'clear' THEN
    UPDATE game SET 
      greenlight_flag = false,
      redlight_flag = false,
      flag_reason = NULL,
      flagged_by = NULL,
      flagged_at = NULL
    WHERE id = p_game_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to get flagged games summary
CREATE OR REPLACE FUNCTION get_flagged_games_summary()
RETURNS TABLE (
  total_flagged BIGINT,
  greenlight_count BIGINT,
  redlight_count BIGINT,
  recent_flags_24h BIGINT,
  most_recent_flag TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(CASE WHEN greenlight_flag = true OR redlight_flag = true THEN 1 END)::BIGINT as total_flagged,
    COUNT(CASE WHEN greenlight_flag = true THEN 1 END)::BIGINT as greenlight_count,
    COUNT(CASE WHEN redlight_flag = true THEN 1 END)::BIGINT as redlight_count,
    COUNT(CASE WHEN flagged_at > NOW() - INTERVAL '24 hours' THEN 1 END)::BIGINT as recent_flags_24h,
    MAX(flagged_at) as most_recent_flag
  FROM game;
END;
$$ LANGUAGE plpgsql;

-- View for admin flag management
CREATE OR REPLACE VIEW game_flags_admin AS
SELECT 
  g.id,
  g.name,
  g.developer,
  g.publisher,
  g.category,
  g.greenlight_flag,
  g.redlight_flag,
  g.flag_reason,
  g.flagged_by,
  g.flagged_at,
  u.email as flagged_by_email,
  -- Flag status summary
  CASE 
    WHEN g.greenlight_flag = true THEN 'greenlight'
    WHEN g.redlight_flag = true THEN 'redlight'
    ELSE 'none'
  END as flag_status,
  -- Potential filter conflicts
  CASE 
    WHEN g.greenlight_flag = true AND (g.category = 5 OR g.developer ILIKE '%fan%' OR g.publisher ILIKE '%fan%') THEN 'potential_conflict'
    WHEN g.redlight_flag = true AND g.developer ILIKE '%nintendo%' THEN 'potential_conflict'
    ELSE 'normal'
  END as conflict_status
FROM game g
LEFT JOIN auth.users u ON g.flagged_by = u.id
WHERE g.greenlight_flag = true OR g.redlight_flag = true
ORDER BY g.flagged_at DESC NULLS LAST;

-- Grant permissions for admin functions
GRANT EXECUTE ON FUNCTION set_game_flag(INTEGER, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_flagged_games_summary() TO authenticated;
GRANT SELECT ON game_flags_admin TO authenticated;

-- RLS policies for flag management
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'game_flags_admin_select'
    ) THEN
        EXECUTE 'CREATE POLICY game_flags_admin_select ON game FOR SELECT USING (true)';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'game_flags_admin_update'
    ) THEN
        EXECUTE 'CREATE POLICY game_flags_admin_update ON game FOR UPDATE USING (true)';
    END IF;
END $$;