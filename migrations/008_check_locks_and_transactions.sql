-- Debug migration: Check for locks and active transactions
-- Date: 2025-08-27
-- Purpose: Find any locks or transactions blocking updates

-- Step 1: Check for active locks on rating table
SELECT 
    l.locktype,
    l.database,
    l.relation,
    l.page,
    l.tuple,
    l.virtualxid,
    l.transactionid,
    l.classid,
    l.objid,
    l.objsubid,
    l.virtualtransaction,
    l.pid,
    l.mode,
    l.granted,
    l.fastpath
FROM pg_locks l
LEFT JOIN pg_class c ON l.relation = c.oid
WHERE c.relname = 'rating' OR l.relation IS NULL;

-- Step 2: Check for active transactions
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE state != 'idle'
AND query NOT LIKE '%pg_stat_activity%';

-- Step 3: Try the simplest possible update
UPDATE rating 
SET slug = slug 
WHERE id = 1;

-- Step 4: Get affected row count
SELECT 
    'Update with same value' as test,
    @@rowcount as rows_affected;