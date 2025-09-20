-- Migration: Add username length constraint (21 characters max)
-- Date: 2025-09-12
-- Purpose: Enforce maximum username length of 21 characters at database level

-- First, verify no existing usernames exceed 21 characters
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user WHERE LENGTH(username) > 21
  ) THEN
    RAISE EXCEPTION 'Cannot add constraint: Some usernames exceed 21 characters';
  END IF;
END $$;

-- Add the length constraint
-- This ensures usernames are between 3 and 21 characters
ALTER TABLE public.user 
DROP CONSTRAINT IF EXISTS user_username_length;

ALTER TABLE public.user 
ADD CONSTRAINT user_username_length 
CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 21);

-- Verify the constraint is working
-- The lowercase constraint already exists from previous migration
COMMENT ON CONSTRAINT user_username_length ON public.user 
IS 'Ensures usernames are between 3 and 21 characters long';