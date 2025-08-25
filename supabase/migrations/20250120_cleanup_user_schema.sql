-- Migration: Clean up user schema and remove redundancies
-- Date: 2025-01-20

-- Priority 4: Data Migration - Migrate picurl data to avatar_url first
UPDATE public.user 
SET avatar_url = picurl 
WHERE avatar_url IS NULL AND picurl IS NOT NULL;

-- Ensure all users have usernames
UPDATE public.user 
SET username = LOWER(COALESCE(username, name, SPLIT_PART(email, '@', 1)))
WHERE username IS NULL OR username = '';

-- Priority 1: Remove duplicate RLS policies
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.user;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user;

-- Priority 1: Remove duplicate indexes (keep the unique constraints)
DROP INDEX IF EXISTS idx_user_provider_id;
DROP INDEX IF EXISTS idx_user_email;
DROP INDEX IF EXISTS idx_user_username;

-- Priority 1: Drop the redundant picurl column after data migration
ALTER TABLE public.user DROP COLUMN IF EXISTS picurl;

-- Priority 2: Add missing constraints for data consistency
-- First clean existing data to be lowercase
UPDATE public.user SET email = LOWER(email) WHERE email != LOWER(email);
UPDATE public.user SET username = LOWER(username) WHERE username != LOWER(username);

-- Now add the constraints
ALTER TABLE public.user DROP CONSTRAINT IF EXISTS user_email_lowercase;
ALTER TABLE public.user ADD CONSTRAINT user_email_lowercase CHECK (email = LOWER(email));

ALTER TABLE public.user DROP CONSTRAINT IF EXISTS user_username_lowercase;
ALTER TABLE public.user ADD CONSTRAINT user_username_lowercase CHECK (username = LOWER(username));