-- Migration: Fix duplicate foreign key constraints on rating table
-- Date: 2025-08-27
-- Purpose: Remove duplicate user_id foreign key constraints causing Supabase relationship ambiguity

-- First, check existing constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'rating'::regclass
AND contype = 'f'
AND pg_get_constraintdef(oid) LIKE '%user%';

-- Drop the duplicate constraints (keeping only one)
-- We'll keep fk_rating_user and drop the others
ALTER TABLE rating DROP CONSTRAINT IF EXISTS fk_rating_user_id;
ALTER TABLE rating DROP CONSTRAINT IF EXISTS rating_user_id_fkey;

-- Verify only one constraint remains
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'rating'::regclass
AND contype = 'f'
AND pg_get_constraintdef(oid) LIKE '%user%';