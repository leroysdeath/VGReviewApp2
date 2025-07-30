-- Username change tracking table
CREATE TABLE IF NOT EXISTS username_changes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  old_username VARCHAR(50),
  new_username VARCHAR(50) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for performance
  INDEX(user_id, changed_at)
);

-- Add username uniqueness constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_username_unique'
    ) THEN
        ALTER TABLE "user" ADD CONSTRAINT user_username_unique UNIQUE (username);
    END IF;
END $$;

-- Function to check username change limit (3 per day)
CREATE OR REPLACE FUNCTION check_username_change_limit(p_user_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    change_count INTEGER;
BEGIN
    -- Count username changes in the last 24 hours
    SELECT COUNT(*) INTO change_count
    FROM username_changes
    WHERE user_id = p_user_id
    AND changed_at >= NOW() - INTERVAL '24 hours';
    
    -- Return true if under the limit (3 changes per day)
    RETURN change_count < 3;
END;
$$ LANGUAGE plpgsql;

-- Function to log username change
CREATE OR REPLACE FUNCTION log_username_change(
    p_user_id INTEGER,
    p_old_username VARCHAR(50),
    p_new_username VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO username_changes (user_id, old_username, new_username)
    VALUES (p_user_id, p_old_username, p_new_username);
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on username_changes table
ALTER TABLE username_changes ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see their own username changes
CREATE POLICY "Users can view their own username changes" ON username_changes
    FOR SELECT USING (user_id IN (
        SELECT id FROM "user" WHERE provider_id = auth.uid()
    ));

-- RLS policy: users can insert their own username changes
CREATE POLICY "Users can insert their own username changes" ON username_changes
    FOR INSERT WITH CHECK (user_id IN (
        SELECT id FROM "user" WHERE provider_id = auth.uid()
    ));