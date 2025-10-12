-- Optional: Add index on user.provider_id for better RLS performance
--
-- This index dramatically speeds up the uuid→integer ID mapping
-- used in the RLS policies after the performance optimization migration.
--
-- Run this AFTER applying the v2 performance warnings fix

-- Check if index already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'user'
      AND indexname = 'idx_user_provider_id'
  ) THEN
    -- Create the index
    CREATE INDEX idx_user_provider_id ON public.user(provider_id);
    RAISE NOTICE '✅ Created index on user.provider_id for RLS performance';
  ELSE
    RAISE NOTICE 'ℹ️  Index idx_user_provider_id already exists';
  END IF;
END $$;

-- Verify the index
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'user'
  AND indexname = 'idx_user_provider_id';

-- Expected output: Shows the new index definition
-- CREATE INDEX idx_user_provider_id ON public."user" USING btree (provider_id)

-- Performance benefit:
-- Without index: Full table scan on user table for every RLS check (slow!)
-- With index: Instant lookup by provider_id (fast!)
--
-- Impact: 10-100x faster RLS policy evaluation, especially on large user tables
