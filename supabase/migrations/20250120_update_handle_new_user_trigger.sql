-- Migration: Update handle_new_user trigger function
-- Date: 2025-01-20
-- Priority 5: Improve the trigger to avoid duplicate values and use avatar_url

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  generated_username TEXT;
  base_username TEXT;
BEGIN
  -- Generate base username from email
  base_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
  generated_username := base_username;
  
  -- Ensure username is unique by appending numbers if necessary
  WHILE EXISTS (SELECT 1 FROM public.user WHERE username = generated_username) LOOP
    generated_username := base_username || '_' || floor(random() * 1000)::text;
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
    avatar_url,  -- Use avatar_url instead of picurl
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    LOWER(NEW.email),  -- Ensure email is lowercase
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'username',
      base_username  -- Use base username instead of generated to avoid duplication
    ),
    COALESCE(
      LOWER(NEW.raw_user_meta_data->>'username'),  -- Ensure username is lowercase
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
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),  -- Only use avatar_url
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
    END,
    display_name = CASE 
      WHEN public.user.display_name IS NULL OR public.user.display_name = '' 
      THEN EXCLUDED.display_name 
      ELSE public.user.display_name 
    END,
    avatar_url = CASE 
      WHEN public.user.avatar_url IS NULL OR public.user.avatar_url = '' 
      THEN EXCLUDED.avatar_url 
      ELSE public.user.avatar_url 
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
$$;