# Security Warnings Fix Guide

This guide walks you through fixing all security warnings from the Supabase Database Linter.

## ✅ Part 1: Database Migration (Complete)

The migration file `20250930_fix_security_warnings.sql` has been created and fixes:
- ✓ **8 Function Search Path Issues** - Added `SET search_path = public, pg_temp` to all SECURITY DEFINER functions
- ✓ **Materialized View Security** - Enabled RLS on `popular_searches` view

### Apply the Migration

**Option A: Via Supabase Dashboard (Recommended)**
1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `supabase/migrations/20250930_fix_security_warnings.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run**

**What This Fixes:**
```
✓ get_or_create_user - Search path secured
✓ validate_referral_code - Search path secured
✓ get_referral_code_info - Search path secured
✓ record_referral - Search path secured
✓ check_all_conversions_completed - Search path secured
✓ update_review_milestones - Search path secured
✓ track_paid_conversion - Search path secured
✓ secure_game_search - Search path secured
✓ popular_searches - RLS enabled
```

---

## 🔐 Part 2: Enable Leaked Password Protection

**Priority:** Medium
**Time Required:** 2 minutes
**Risk:** None (only improves security)

### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to your project: https://supabase.com/dashboard/project/[YOUR-PROJECT-ID]

2. **Open Authentication Settings**
   - Click **Authentication** in the left sidebar
   - Click **Policies** (or **Settings** depending on UI version)

3. **Enable Password Protection**
   - Look for **"Password Security"** or **"Leaked Password Protection"** section
   - Find the toggle for **"Check against HaveIBeenPwned.org"**
   - Enable the toggle ✓

4. **Verify**
   - Try creating a test account with a common password like "password123"
   - The system should reject it with an error message

### What This Does:
- Checks user passwords against 847+ million compromised passwords
- Prevents users from using passwords exposed in data breaches
- Works through HaveIBeenPwned.org's k-anonymity API (no passwords sent, completely private)
- No code changes required

### Alternative Location:
If you don't see it under Authentication → Policies, try:
- **Project Settings** → **Authentication** → **Password Policies**
- Look for **"Leaked password protection"** setting

---

## 📦 Part 3: Postgres Version Upgrade

**Priority:** Low-Medium
**Time Required:** 5-15 minutes (mostly waiting)
**Risk:** Low (but test in staging first!)

### Current Version:
`supabase-postgres-17.4.1.054`

### Available Updates:
Security patches and improvements are available in newer versions.

### Steps:

#### 1. Check Your Current Environment

**Production Database:**
```bash
# DO NOT upgrade production first!
# Always test in staging/development
```

**Staging/Development Database:**
```bash
# Start here if you have one
```

#### 2. Navigate to Infrastructure Settings

1. Go to **Supabase Dashboard**
2. Click **Project Settings** (gear icon) in left sidebar
3. Click **Infrastructure** or **General**

#### 3. Check for Upgrade Availability

Look for one of these:
- **"Database Version"** section
- **"Postgres Version"** section
- **"Upgrade Available"** banner

You should see:
```
Current: supabase-postgres-17.4.1.054
Latest: supabase-postgres-17.x.x.xxx (or newer)
```

#### 4. Schedule the Upgrade

**IMPORTANT: Choose a low-traffic time window!**

1. Click **"Upgrade"** or **"Schedule Upgrade"**
2. Choose upgrade time:
   - **Immediate** - If in development/staging
   - **Scheduled** - If in production (choose 2-4 AM your timezone)

3. Review what will happen:
   ```
   ✓ Database will be temporarily unavailable (1-5 minutes)
   ✓ Connection strings remain the same
   ✓ All data is preserved
   ✓ Automatic rollback if issues occur
   ```

4. Click **"Confirm Upgrade"**

#### 5. Monitor the Upgrade

Watch for these stages:
```
1. Preparing upgrade... (30 sec)
2. Creating snapshot... (1 min)
3. Upgrading Postgres... (2-5 min)
4. Running post-upgrade checks... (30 sec)
5. Complete ✓
```

#### 6. Verify After Upgrade

Run these checks in **SQL Editor**:

```sql
-- Check Postgres version
SELECT version();

-- Check database is responding
SELECT COUNT(*) FROM game;

-- Test a function
SELECT * FROM secure_game_search('mario', 5);

-- Check RLS is still enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;
```

#### 7. Test Application

After upgrade, test these critical paths:
- ✓ User authentication
- ✓ Game search
- ✓ Creating/viewing reviews
- ✓ Profile pages
- ✓ Real-time features

### Rollback Plan

If issues occur:
1. Supabase automatically keeps a snapshot before upgrade
2. Contact Supabase support with project ID
3. They can rollback within 24 hours

### Best Practices

**Before Production Upgrade:**
1. ✓ Test in staging/development first
2. ✓ Backup your database (Supabase does this automatically, but double-check)
3. ✓ Schedule during low-traffic hours
4. ✓ Have team available to monitor
5. ✓ Notify users of potential brief downtime

**After Production Upgrade:**
1. ✓ Monitor error logs for 24 hours
2. ✓ Check application performance metrics
3. ✓ Verify all critical features work
4. ✓ Update staging to match production version

---

## 🎯 Summary Checklist

Use this checklist to track your progress:

### Database Security (Critical)
- [ ] Applied migration `20250930_fix_security_warnings.sql`
- [ ] Verified all 8 functions have search_path set
- [ ] Verified RLS enabled on popular_searches
- [ ] Re-run Database Linter to confirm fixes

### Password Protection (Medium Priority)
- [ ] Enabled leaked password protection
- [ ] Tested with a compromised password
- [ ] Documented setting location for team

### Postgres Upgrade (Low Priority)
- [ ] Checked current version
- [ ] Tested upgrade in staging (if available)
- [ ] Scheduled production upgrade
- [ ] Completed upgrade
- [ ] Verified application functionality
- [ ] Monitored for 24 hours post-upgrade

---

## 📊 Expected Results

After completing all steps, you should see:

**Database Linter:**
```
✓ 0 errors
✓ 0 warnings  (down from 11)
```

**Security Posture:**
```
✓ All SECURITY DEFINER functions have fixed search_path
✓ Materialized views protected with RLS
✓ Password protection against leaked credentials
✓ Up-to-date Postgres with latest security patches
```

---

## 🆘 Troubleshooting

### Migration Fails
```
Error: function "xxx" does not exist
```
**Solution:** The function might have been modified. Check the migration file and update function signatures if needed.

### Can't Find Password Protection Setting
**Solution:** Setting location varies by Supabase plan:
- Free/Pro: Authentication → Policies
- Enterprise: Contact support for configuration

### Postgres Upgrade Not Available
**Solution:**
- Check if you're on the latest version already
- Some regions roll out updates gradually
- Contact Supabase support if urgent

### Application Issues After Upgrade
**Solution:**
1. Check Supabase Status Page
2. Review error logs in Dashboard → Logs
3. Roll back if critical (contact support)
4. Most issues resolve within 15-30 minutes

---

## 📚 Additional Resources

- [Supabase Database Linter Docs](https://supabase.com/docs/guides/database/database-linter)
- [Function Search Path Security](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3#PwnedPasswords)
- [Postgres Upgrade Guide](https://supabase.com/docs/guides/platform/upgrading)

---

## ✅ Verification Commands

Run these in SQL Editor after completing all fixes:

```sql
-- 1. Verify function search_path
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  p.proconfig AS search_path_setting,
  CASE
    WHEN p.proconfig IS NOT NULL
      AND EXISTS (SELECT 1 FROM unnest(p.proconfig) AS config WHERE config LIKE 'search_path=%')
    THEN '✓ Secured'
    ELSE '✗ Missing'
  END AS status
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
ORDER BY p.proname;

-- 2. Verify RLS on materialized view
SELECT
  schemaname,
  matviewname AS view_name,
  'Materialized View' AS type
FROM pg_matviews
WHERE schemaname = 'public'
AND matviewname = 'popular_searches';

-- Then check RLS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'popular_searches'
ORDER BY policyname;

-- 3. Check Postgres version
SELECT version();

-- Expected output should include Postgres 17 or higher
```

---

**Questions?** Check the Supabase Dashboard → Support or the Discord community.
