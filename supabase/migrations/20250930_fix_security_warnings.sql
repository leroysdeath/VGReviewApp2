-- =====================================================
-- Fix Security Warnings from Database Linter
-- =====================================================
-- This migration addresses all security warnings:
-- 1. Function Search Path Mutable (8 functions)
-- 2. Materialized View in API (popular_searches)
--
-- Created: 2025-09-30
-- =====================================================

-- =====================================================
-- PART 1: Fix Function Search Path Issues
-- =====================================================
-- Adding SET search_path to all SECURITY DEFINER functions
-- prevents search path attacks by fixing the schema resolution

-- 1. Fix get_or_create_user function
CREATE OR REPLACE FUNCTION get_or_create_user(
  auth_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_provider TEXT DEFAULT 'supabase'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_id INTEGER;
BEGIN
  -- First try to get existing user
  SELECT id INTO user_id
  FROM "user"
  WHERE provider_id = auth_id::TEXT;

  -- If user exists, return their ID
  IF user_id IS NOT NULL THEN
    RETURN user_id;
  END IF;

  -- Otherwise, create new user
  INSERT INTO "user" (
    provider_id,
    email,
    name,
    provider,
    created_at,
    updated_at
  ) VALUES (
    auth_id::TEXT,
    user_email,
    user_name,
    user_provider,
    NOW(),
    NOW()
  )
  ON CONFLICT (provider_id) DO UPDATE
    SET updated_at = NOW()
  RETURNING id INTO user_id;

  RETURN user_id;

EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition - another transaction created the user
    SELECT id INTO user_id
    FROM "user"
    WHERE provider_id = auth_id::TEXT;

    RETURN user_id;
END;
$$;

COMMENT ON FUNCTION get_or_create_user IS 'Atomically gets or creates a user based on their auth provider ID. SET search_path prevents injection attacks.';

-- 2. Fix validate_referral_code function
CREATE OR REPLACE FUNCTION validate_referral_code(code_input VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM referral_codes
    WHERE UPPER(code) = UPPER(code_input)
    AND is_active = true
  );
END;
$$;

COMMENT ON FUNCTION validate_referral_code IS 'Case-insensitive referral code validation. SET search_path prevents injection attacks.';

-- 3. Fix get_referral_code_info function
CREATE OR REPLACE FUNCTION get_referral_code_info(code_input VARCHAR)
RETURNS TABLE (
  code VARCHAR,
  owner_name VARCHAR,
  type VARCHAR
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT rc.code, rc.owner_name, rc.type
  FROM referral_codes rc
  WHERE UPPER(rc.code) = UPPER(code_input)
  AND rc.is_active = true;
END;
$$;

COMMENT ON FUNCTION get_referral_code_info IS 'Retrieves referral code information. SET search_path prevents injection attacks.';

-- 4. Fix record_referral function
CREATE OR REPLACE FUNCTION record_referral(
  p_user_id INTEGER,
  p_referral_code VARCHAR,
  p_signup_method VARCHAR,
  p_signup_url VARCHAR DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_referral_id INTEGER;
  v_valid_code VARCHAR;
BEGIN
  -- Validate code exists (case-insensitive)
  SELECT code INTO v_valid_code
  FROM referral_codes
  WHERE UPPER(code) = UPPER(p_referral_code)
  AND is_active = true;

  IF v_valid_code IS NULL THEN
    RETURN NULL;
  END IF;

  -- Insert referral record
  INSERT INTO referrals (user_id, referral_code, signup_method, signup_url)
  VALUES (p_user_id, v_valid_code, p_signup_method, p_signup_url)
  RETURNING id INTO v_referral_id;

  -- Create empty conversion tracking record
  INSERT INTO referral_conversions (referral_id)
  VALUES (v_referral_id);

  RETURN v_referral_id;
END;
$$;

COMMENT ON FUNCTION record_referral IS 'Records a new referral at user signup. SET search_path prevents injection attacks.';

-- 5. Fix check_all_conversions_completed function
CREATE OR REPLACE FUNCTION check_all_conversions_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check if all 12 metrics are completed (including paid conversion)
  IF NEW.email_verified = true
    AND NEW.profile_photo_uploaded = true
    AND NEW.bio_completed = true
    AND NEW.review_1_completed_at IS NOT NULL
    AND NEW.review_5_completed_at IS NOT NULL
    AND NEW.review_10_completed_at IS NOT NULL
    AND NEW.comment_1_completed_at IS NOT NULL
    AND NEW.top5_selected = true
    AND NEW.following_3plus = true
    AND NEW.likes_3_completed_at IS NOT NULL
    AND NEW.active_3_days_week1 = true
    AND NEW.converted_to_paid = true
    AND NEW.all_completed = false
  THEN
    NEW.all_completed := true;
    NEW.all_completed_at := NOW();
  END IF;

  NEW.last_updated := NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION check_all_conversions_completed IS 'Trigger function to check referral conversion completion. SET search_path prevents injection attacks.';

-- 6. Fix update_review_milestones function
CREATE OR REPLACE FUNCTION update_review_milestones(p_user_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_review_count INTEGER;
  v_referral_id INTEGER;
BEGIN
  -- Get review count for user
  SELECT COUNT(*) INTO v_review_count
  FROM rating
  WHERE user_id = p_user_id
  AND review IS NOT NULL
  AND LENGTH(TRIM(review)) > 0;

  -- Get referral_id if exists
  SELECT id INTO v_referral_id
  FROM referrals
  WHERE user_id = p_user_id;

  IF v_referral_id IS NOT NULL THEN
    -- Update conversion metrics
    UPDATE referral_conversions
    SET
      reviews_count = v_review_count,
      review_1_completed_at = CASE
        WHEN v_review_count >= 1 AND review_1_completed_at IS NULL
        THEN NOW()
        ELSE review_1_completed_at
      END,
      review_5_completed_at = CASE
        WHEN v_review_count >= 5 AND review_5_completed_at IS NULL
        THEN NOW()
        ELSE review_5_completed_at
      END,
      review_10_completed_at = CASE
        WHEN v_review_count >= 10 AND review_10_completed_at IS NULL
        THEN NOW()
        ELSE review_10_completed_at
      END
    WHERE referral_id = v_referral_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION update_review_milestones IS 'Updates review milestone tracking for referred users. SET search_path prevents injection attacks.';

-- 7. Fix track_paid_conversion function
CREATE OR REPLACE FUNCTION track_paid_conversion(
  p_user_id INTEGER,
  p_subscription_tier VARCHAR DEFAULT 'pro',
  p_subscription_amount DECIMAL DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_referral_id INTEGER;
BEGIN
  -- Get referral_id if exists
  SELECT id INTO v_referral_id
  FROM referrals
  WHERE user_id = p_user_id;

  IF v_referral_id IS NOT NULL THEN
    -- Update conversion metrics
    UPDATE referral_conversions
    SET
      converted_to_paid = true,
      converted_to_paid_at = NOW(),
      subscription_tier = p_subscription_tier,
      subscription_amount = p_subscription_amount,
      last_updated = NOW()
    WHERE referral_id = v_referral_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION track_paid_conversion IS 'Tracks when a referred user converts to paid subscription. SET search_path prevents injection attacks.';

-- 8. Fix secure_game_search function
CREATE OR REPLACE FUNCTION secure_game_search(
    search_query text,
    search_limit integer DEFAULT 20,
    use_phrase_search boolean DEFAULT false,
    genre_filters text[] DEFAULT NULL,
    platform_filters text[] DEFAULT NULL,
    release_year_filter integer DEFAULT NULL,
    min_rating_filter numeric DEFAULT NULL
)
RETURNS TABLE(
    id integer,
    name varchar,
    summary text,
    description text,
    release_date date,
    cover_url text,
    genres text[],
    platforms text[],
    igdb_id integer,
    search_rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    query_ts tsquery;
    safe_limit integer;
BEGIN
    -- Input validation and sanitization
    IF search_query IS NULL OR trim(search_query) = '' THEN
        RETURN;
    END IF;

    IF length(trim(search_query)) < 1 OR length(trim(search_query)) > 100 THEN
        RETURN;
    END IF;

    -- Sanitize limit
    safe_limit := LEAST(GREATEST(search_limit, 1), 100);

    -- Convert search query to tsquery (completely safe from injection)
    BEGIN
        IF use_phrase_search THEN
            query_ts := phraseto_tsquery('english', trim(search_query));
        ELSE
            query_ts := plainto_tsquery('english', trim(search_query));
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- If query parsing fails, return no results
            RETURN;
    END;

    -- Return ranked results using full-text search with filters
    RETURN QUERY
    SELECT
        g.id,
        g.name,
        g.summary,
        g.description,
        g.release_date,
        g.pic_url as cover_url,
        g.genres,
        g.platforms,
        g.igdb_id,
        ts_rank(g.search_vector, query_ts)::real as search_rank
    FROM game g
    WHERE g.search_vector @@ query_ts
        AND (genre_filters IS NULL OR g.genres && genre_filters)
        AND (platform_filters IS NULL OR g.platforms && platform_filters)
        AND (release_year_filter IS NULL OR EXTRACT(YEAR FROM g.release_date) = release_year_filter)
    ORDER BY ts_rank(g.search_vector, query_ts) DESC, g.name ASC
    LIMIT safe_limit;
END;
$$;

COMMENT ON FUNCTION secure_game_search IS 'Secure full-text game search with filters. SET search_path prevents injection attacks.';

-- =====================================================
-- PART 2: Secure Materialized View
-- =====================================================
-- Materialized views don't support RLS in Postgres
-- Solution: Revoke direct access and provide controlled access via function

-- Step 1: Revoke all direct access to the materialized view
REVOKE ALL ON popular_searches FROM anon;
REVOKE ALL ON popular_searches FROM authenticated;
REVOKE ALL ON popular_searches FROM public;

-- Grant SELECT only to postgres/service_role (for refresh operations)
GRANT SELECT ON popular_searches TO postgres;

-- Step 2: Create a secure function to access the data
CREATE OR REPLACE FUNCTION get_popular_searches(
  result_limit integer DEFAULT 20
)
RETURNS TABLE(
  normalized_query text,
  search_count bigint,
  avg_results integer,
  avg_time_ms integer,
  last_searched timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  safe_limit integer;
BEGIN
  -- Sanitize limit
  safe_limit := LEAST(GREATEST(result_limit, 1), 100);

  -- Return data from materialized view
  RETURN QUERY
  SELECT
    ps.normalized_query,
    ps.search_count,
    ps.avg_results,
    ps.avg_time_ms,
    ps.last_searched
  FROM popular_searches ps
  ORDER BY ps.search_count DESC
  LIMIT safe_limit;
END;
$$;

-- Grant execute permission to both authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_popular_searches(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_searches(integer) TO anon;

-- Add comments explaining the security model
COMMENT ON MATERIALIZED VIEW popular_searches IS
'Materialized view of popular searches. Direct access revoked - use get_popular_searches() function instead for controlled access.';

COMMENT ON FUNCTION get_popular_searches IS
'Secure function to access popular searches data. Provides controlled access to popular_searches materialized view with input validation.';

-- =====================================================
-- Verification Queries
-- =====================================================
-- These queries help verify the fixes were applied correctly

-- Verify all functions now have search_path set
DO $$
DECLARE
    function_count INTEGER;
    functions_with_search_path INTEGER;
BEGIN
    -- Count total functions we fixed
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'get_or_create_user',
        'validate_referral_code',
        'get_referral_code_info',
        'record_referral',
        'check_all_conversions_completed',
        'update_review_milestones',
        'track_paid_conversion',
        'secure_game_search'
    );

    -- Count functions with search_path set
    SELECT COUNT(*) INTO functions_with_search_path
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'get_or_create_user',
        'validate_referral_code',
        'get_referral_code_info',
        'record_referral',
        'check_all_conversions_completed',
        'update_review_milestones',
        'track_paid_conversion',
        'secure_game_search'
    )
    AND p.proconfig IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM unnest(p.proconfig) AS config
        WHERE config LIKE 'search_path=%'
    );

    IF functions_with_search_path = 8 THEN
        RAISE NOTICE '✓ SUCCESS: All 8 functions now have search_path configured';
    ELSE
        RAISE WARNING '⚠ WARNING: Only % out of 8 functions have search_path configured', functions_with_search_path;
    END IF;
END $$;

-- Verify popular_searches is secured via function
DO $$
DECLARE
    function_exists BOOLEAN;
    anon_has_direct_access BOOLEAN;
    auth_has_direct_access BOOLEAN;
BEGIN
    -- Check if get_popular_searches function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'get_popular_searches'
    ) INTO function_exists;

    -- Check if anon has direct access to materialized view
    SELECT has_table_privilege('anon', 'popular_searches', 'SELECT') INTO anon_has_direct_access;

    -- Check if authenticated has direct access to materialized view
    SELECT has_table_privilege('authenticated', 'popular_searches', 'SELECT') INTO auth_has_direct_access;

    IF function_exists AND NOT anon_has_direct_access AND NOT auth_has_direct_access THEN
        RAISE NOTICE '✓ SUCCESS: popular_searches secured - direct access revoked, function created';
    ELSE
        RAISE WARNING '⚠ WARNING: Function exists: %, Anon direct access: %, Auth direct access: %',
            function_exists, anon_has_direct_access, auth_has_direct_access;
    END IF;
END $$;

-- =====================================================
-- Migration Complete
-- =====================================================
-- All security warnings should now be resolved:
-- ✓ Function Search Path Mutable: Fixed (8 functions)
-- ✓ Materialized View in API: Fixed (popular_searches secured via function)
--
-- IMPORTANT: If you were using popular_searches directly via API:
-- Update your code to use the new function instead:
--
-- OLD: SELECT * FROM popular_searches
-- NEW: SELECT * FROM get_popular_searches(20)
--
-- The function provides the same data with input validation.
--
-- Next steps:
-- 1. Enable leaked password protection in Supabase Dashboard
-- 2. Schedule Postgres version upgrade
-- =====================================================
