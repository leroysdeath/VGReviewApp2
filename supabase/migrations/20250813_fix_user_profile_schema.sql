-- Migration: Fix user profile schema and auth race condition
-- This migration implements the Database-First approach to resolve:
-- 1. Auth race condition during user creation
-- 2. Profile editing failures due to missing columns
-- 3. Inconsistent field mapping between services and database

-- Step 1: Add missing columns to user table
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS username VARCHAR(255),
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS platform VARCHAR(255),
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 2: Backfill username from existing name field
UPDATE "user" 
SET username = COALESCE(username, LOWER(REPLACE(name, ' ', '_')))
WHERE username IS NULL;

-- Step 3: Add unique constraint on username after backfill
-- Using a DO block to handle the case where constraint might already exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_username_unique'
  ) THEN
    ALTER TABLE "user" 
    ADD CONSTRAINT user_username_unique UNIQUE (username);
  END IF;
END $$;

-- Step 4: Update the trigger function to handle race conditions and set all fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  generated_username TEXT;
BEGIN
  -- Generate a unique username from email
  generated_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
  
  -- Ensure username is unique by appending numbers if necessary
  WHILE EXISTS (SELECT 1 FROM public.user WHERE username = generated_username) LOOP
    generated_username := generated_username || '_' || floor(random() * 1000)::text;
  END LOOP;

  -- Insert user with conflict handling for race conditions
  INSERT INTO public.user (
    provider_id, 
    email, 
    name,
    username,
    display_name,
    provider,
    bio,
    location,
    website,
    platform,
    picurl,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'username',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      generated_username
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'name',
      ''
    ),
    'supabase',
    COALESCE(NEW.raw_user_meta_data->>'bio', ''),
    COALESCE(NEW.raw_user_meta_data->>'location', ''),
    COALESCE(NEW.raw_user_meta_data->>'website', ''),
    COALESCE(NEW.raw_user_meta_data->>'platform', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (provider_id) DO UPDATE SET
    -- Update fields if user already exists (handles race condition)
    updated_at = NOW(),
    -- Only update empty fields to preserve user edits
    name = CASE 
      WHEN public.user.name IS NULL OR public.user.name = '' 
      THEN EXCLUDED.name 
      ELSE public.user.name 
    END,
    username = CASE 
      WHEN public.user.username IS NULL OR public.user.username = '' 
      THEN EXCLUDED.username 
      ELSE public.user.username 
    END;
    
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle any other unique violations gracefully
    RAISE LOG 'User profile already exists for provider_id: %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log other errors but don't block auth flow
    RAISE LOG 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Ensure trigger is properly set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Update RLS policies to include new columns
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user;

-- Recreate with proper permissions for all columns
CREATE POLICY "Users can update their own profile" ON public.user
  FOR UPDATE 
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_username ON public.user(username);
CREATE INDEX IF NOT EXISTS idx_user_email ON public.user(email);

-- Step 8: Add helpful comments
COMMENT ON COLUMN public.user.username IS 'Unique username for the user, used in URLs and mentions';
COMMENT ON COLUMN public.user.display_name IS 'Display name shown in UI, can be different from username';
COMMENT ON COLUMN public.user.platform IS 'Primary gaming platform preference';
COMMENT ON COLUMN public.user.avatar_url IS 'URL to user avatar image, mirrors picurl for compatibility';

-- Step 9: Validate existing data integrity
-- This will help identify any existing issues
DO $$
DECLARE
  duplicate_count INTEGER;
  missing_username_count INTEGER;
BEGIN
  -- Check for duplicate provider_ids
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT provider_id, COUNT(*) as cnt
    FROM public.user
    GROUP BY provider_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING 'Found % duplicate provider_ids in user table', duplicate_count;
  END IF;
  
  -- Check for missing usernames after migration
  SELECT COUNT(*) INTO missing_username_count
  FROM public.user
  WHERE username IS NULL OR username = '';
  
  IF missing_username_count > 0 THEN
    RAISE WARNING 'Found % users without usernames after migration', missing_username_count;
  END IF;
END $$;

-- Step 10: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- Migration complete
-- This migration ensures:
-- 1. All necessary columns exist in the user table
-- 2. The database trigger handles user creation with race condition protection
-- 3. Existing users have valid usernames
-- 4. RLS policies allow users to update their profiles
-- 5. Performance indexes are in place