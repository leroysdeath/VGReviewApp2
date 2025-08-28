-- Debug migration: Check for triggers on rating table
-- Date: 2025-08-27
-- Purpose: Find triggers that might be blocking updates

-- Step 1: Check for triggers on rating table
SELECT 
  t.tgname as trigger_name,
  t.tgtype as trigger_type,
  t.tgenabled as enabled,
  p.proname as function_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'rating'
AND t.tgisinternal = false;

-- Step 2: Check for any rules on rating table  
SELECT 
  r.rulename as rule_name,
  r.ev_type as event_type,
  r.ev_enabled as enabled,
  pg_get_ruledef(r.oid) as rule_definition
FROM pg_rewrite r
JOIN pg_class c ON r.ev_class = c.oid
WHERE c.relname = 'rating';

-- Step 3: Try updating with different conditions
-- Test: Update a record that already has a matching slug
UPDATE rating 
SET slug = 'age-of-empires-ii-definitive-edition'
WHERE id = 1 
AND game_id = 34;

-- Check if this worked
SELECT 
  'Direct slug update test' as test,
  id, 
  game_id,
  slug,
  CASE 
    WHEN slug = 'age-of-empires-ii-definitive-edition' THEN 'SUCCESS'
    ELSE 'FAILED'
  END as result
FROM rating 
WHERE id = 1;