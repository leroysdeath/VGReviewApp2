-- ============================================
-- Fix Empty Strings in User Table
-- ============================================
-- This script converts empty strings ('') to NULL values
-- Empty strings can cause display issues and should be NULL for optional fields

-- First, let's see which users have empty strings
SELECT 
  id,
  email,
  name,
  username,
  CASE WHEN picurl = '' THEN '❌ Empty String' ELSE '✅ OK' END as picurl_status,
  CASE WHEN bio = '' THEN '❌ Empty String' ELSE '✅ OK' END as bio_status,
  CASE WHEN website = '' THEN '❌ Empty String' ELSE '✅ OK' END as website_status,
  CASE WHEN location = '' THEN '❌ Empty String' ELSE '✅ OK' END as location_status
FROM "user"
WHERE picurl = '' OR bio = '' OR website = '' OR location = '';

-- Fix empty strings by converting them to NULL
UPDATE "user"
SET 
  picurl = NULLIF(picurl, ''),
  bio = NULLIF(bio, ''),
  website = NULLIF(website, ''),
  location = NULLIF(location, ''),
  updated_at = now()
WHERE 
  picurl = '' OR 
  bio = '' OR 
  website = '' OR 
  location = '';

-- Verify the fix
SELECT 
  id,
  email,
  name,
  username,
  CASE 
    WHEN picurl IS NULL THEN '✅ NULL (correct)'
    WHEN picurl = '' THEN '❌ Still empty string'
    ELSE '✅ Has value'
  END as picurl_status,
  CASE 
    WHEN bio IS NULL THEN '✅ NULL (correct)'
    WHEN bio = '' THEN '❌ Still empty string'
    ELSE '✅ Has value'
  END as bio_status,
  CASE 
    WHEN website IS NULL THEN '✅ NULL (correct)'
    WHEN website = '' THEN '❌ Still empty string'
    ELSE '✅ Has value'
  END as website_status,
  CASE 
    WHEN location IS NULL THEN '✅ NULL (correct)'
    WHEN location = '' THEN '❌ Still empty string'
    ELSE '✅ Has value'
  END as location_status
FROM "user"
ORDER BY id;

-- Optional: Add a CHECK constraint to prevent empty strings in the future
-- This will ensure that these fields are either NULL or have actual content
ALTER TABLE "user" 
ADD CONSTRAINT check_no_empty_strings 
CHECK (
  (picurl IS NULL OR length(picurl) > 0) AND
  (bio IS NULL OR length(bio) > 0) AND
  (website IS NULL OR length(website) > 0) AND
  (location IS NULL OR length(location) > 0)
);

-- If you also want to fix other potential empty string fields:
UPDATE "user"
SET
  platform = NULLIF(platform, ''),
  display_name = NULLIF(display_name, ''),
  avatar_url = NULLIF(avatar_url, ''),
  updated_at = now()
WHERE 
  platform = '' OR 
  display_name = '' OR 
  avatar_url = '';