# Leroy Account Diagnosis & Fix Guide

## Step 1: Run Diagnostic Queries

Run the queries in `COMPARE_LEROY_ACCOUNT.sql` in your Supabase SQL Editor to identify the specific issue.

## Common Issues & Fixes

### Issue 1: Email Not Confirmed
**Symptoms:** `email_confirmed_at IS NULL` in auth.users
**Fix:**
```sql
-- Force confirm email
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmation_sent_at = NOW()
WHERE email = 'leroysdeath@example.com';
```

### Issue 2: ID Mismatch Between Tables
**Symptoms:** `user.id != auth.users.id`
**Fix:** Must recreate account (see below)

### Issue 3: Missing Auth Record
**Symptoms:** User exists but no auth.users record
**Fix:** Must recreate account (see below)

### Issue 4: Account Status Issues
**Symptoms:** `account_status = 'suspended'` or `banned_until IS NOT NULL`
**Fix:**
```sql
-- Unban account
UPDATE "user"
SET account_status = 'active'
WHERE username = 'leroysdeath';

UPDATE auth.users
SET banned_until = NULL
WHERE id = (SELECT id FROM "user" WHERE username = 'leroysdeath');
```

### Issue 5: Corrupted JSON Fields
**Symptoms:** Invalid JSON type in preferences/settings
**Fix:**
```sql
-- Reset to default JSON objects
UPDATE "user"
SET
  preferences = '{}'::jsonb,
  notification_settings = '{}'::jsonb,
  privacy_settings = '{}'::jsonb
WHERE username = 'leroysdeath';
```

### Issue 6: RLS Policy Issues
**Symptoms:** Queries work with service_role but not authenticated role
**Fix:** Check RLS policies and ensure proper authentication context

## When to Recreate the Account

**RECREATE if:**
- ❌ ID mismatch between user and auth.users tables
- ❌ Missing auth.users record entirely
- ❌ Corrupted data that can't be fixed with simple updates
- ❌ Multiple cascading issues across related tables

**FIX IN PLACE if:**
- ✅ Simple field issues (NULL values, incorrect status)
- ✅ Email confirmation missing
- ✅ Corrupted JSON that can be reset
- ✅ RLS policy configuration issues
- ✅ Account has significant data you want to preserve

## Safe Account Recreation Process

### Before You Start
1. **Backup all data:**
```sql
-- Export all leroy's data
CREATE TEMP TABLE leroy_backup AS
SELECT * FROM rating WHERE user_id = (SELECT id FROM "user" WHERE username = 'leroysdeath');

CREATE TEMP TABLE leroy_comments AS
SELECT * FROM comment WHERE user_id = (SELECT id FROM "user" WHERE username = 'leroysdeath');

CREATE TEMP TABLE leroy_collection AS
SELECT * FROM user_collection WHERE user_id = (SELECT id FROM "user" WHERE username = 'leroysdeath');
```

2. **Save the old user ID:**
```sql
SELECT id FROM "user" WHERE username = 'leroysdeath';
-- Save this ID for reference: ________
```

### Recreation Steps

#### Option A: Clean Slate (Lose All Data)
```sql
-- 1. Delete from auth (this cascades to user table via trigger)
DELETE FROM auth.users
WHERE id = (SELECT id FROM "user" WHERE username = 'leroysdeath');

-- 2. Sign up again through the app UI
-- Use the same email: leroysdeath@example.com
-- New password: (whatever you choose)

-- 3. Verify it works
SELECT * FROM "user" WHERE username = 'leroysdeath';
SELECT * FROM auth.users WHERE email = 'leroysdeath@example.com';
```

#### Option B: Preserve Data (More Complex)
```sql
-- 1. Create a temporary account to hold the data
-- Sign up through UI with temp email: leroy_temp@example.com

-- 2. Transfer all data to temp account
BEGIN;

UPDATE rating
SET user_id = (SELECT id FROM "user" WHERE username = 'leroy_temp')
WHERE user_id = (SELECT id FROM "user" WHERE username = 'leroysdeath');

UPDATE comment
SET user_id = (SELECT id FROM "user" WHERE username = 'leroy_temp')
WHERE user_id = (SELECT id FROM "user" WHERE username = 'leroysdeath');

UPDATE user_collection
SET user_id = (SELECT id FROM "user" WHERE username = 'leroy_temp')
WHERE user_id = (SELECT id FROM "user" WHERE username = 'leroysdeath');

-- Add similar updates for:
-- - user_wishlist
-- - notification
-- - content_like
-- - user_follow (both follower and following)
-- - user_top_games
-- - game_progress
-- etc.

COMMIT;

-- 3. Delete old leroy account
DELETE FROM auth.users
WHERE id = (SELECT id FROM "user" WHERE username = 'leroysdeath');

-- 4. Create new leroy account through UI
-- Email: leroysdeath@example.com

-- 5. Transfer data back
BEGIN;

UPDATE rating
SET user_id = (SELECT id FROM "user" WHERE username = 'leroysdeath')
WHERE user_id = (SELECT id FROM "user" WHERE username = 'leroy_temp');

-- ... repeat for all tables ...

COMMIT;

-- 6. Delete temp account
DELETE FROM auth.users
WHERE id = (SELECT id FROM "user" WHERE username = 'leroy_temp');
```

## Recommended Approach

### Based on Your Situation:

**If leroy account has minimal data (< 10 reviews/ratings):**
- ✅ **Recreate clean** (Option A)
- Takes 2 minutes
- No risk of data corruption
- Fresh start

**If leroy account has significant data (many reviews, collections, etc.):**
- ✅ **Try fixing first** using the diagnostic queries
- Only recreate if fixes don't work
- Use Option B to preserve data if recreation is necessary

## Post-Fix Verification

After any fix or recreation, run these checks:

```sql
-- 1. Verify account structure
SELECT id, username, email, created_at, account_status
FROM "user"
WHERE username = 'leroysdeath';

-- 2. Verify auth sync
SELECT u.id as user_id, au.id as auth_id, u.email = au.email as email_match
FROM "user" u
JOIN auth.users au ON u.id = au.id
WHERE u.username = 'leroysdeath';

-- 3. Test data access
SELECT COUNT(*) as rating_count FROM rating
WHERE user_id = (SELECT id FROM "user" WHERE username = 'leroysdeath');

-- 4. Test authentication
-- Log in through the app and verify:
-- - Can view profile
-- - Can create/edit reviews
-- - Can see notifications
-- - All features work normally
```

## Prevention

To avoid this in the future:

1. **Never manually modify auth.users** without updating user table
2. **Use triggers** for automatic sync between auth and user tables
3. **Monitor for orphaned records** regularly
4. **Test in development** before making production auth changes
5. **Always use Supabase Auth APIs** rather than direct SQL for auth operations

## Need Help?

If none of these solutions work:
1. Check Supabase logs for specific error messages
2. Review RLS policies for overly restrictive rules
3. Consider reaching out to Supabase support with diagnostic query results
4. Check if there are pending migrations that need to be applied
