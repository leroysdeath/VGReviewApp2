-- Fix username for User 127 who signed up without username
-- This user has name "Ferrjimenez" but no username
-- Setting username to "ferrjimenez2" as requested

UPDATE "user" 
SET 
  username = 'ferrjimenez2',
  updated_at = NOW()
WHERE 
  id = 127 
  AND (username IS NULL OR username = '');

-- Verify the update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "user" 
    WHERE id = 127 AND username = 'ferrjimenez2'
  ) THEN
    RAISE NOTICE 'User 127 username was not updated - may already have a username';
  ELSE
    RAISE NOTICE 'User 127 username successfully set to ferrjimenez2';
  END IF;
END $$;