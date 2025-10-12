# How to Fix Supabase Linter Warnings (Step-by-Step)

## Current Issues (2 remaining)

1. ❌ `check_avatar_upload_allowed` - missing search_path
2. ❌ `handle_avatar_violation` - missing search_path
3. ⏸️ `http` extension in public schema (optional - lower priority)

## Quick Fix (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Fix
1. Open the file: `QUICK_FIX_linter_warnings.sql`
2. **Copy the entire contents** (Ctrl+A, Ctrl+C)
3. **Paste into the SQL Editor** (Ctrl+V)
4. Click **RUN** (or press Ctrl+Enter)

### Step 3: Verify Success
You should see output like:
```
✅ Has search_path | check_avatar_upload_allowed
✅ Has search_path | handle_avatar_violation
```

### Step 4: Check Database Linter Again
1. Go to **Database** → **Advisors** in Supabase Dashboard
2. Run the linter check
3. The 2 function warnings should be **GONE** ✅

---

## What This Does

The script adds one line to each function:
```sql
SET search_path = public, pg_temp
```

This line:
- ✅ Locks the search path to prevent privilege escalation attacks
- ✅ Maintains all existing functionality
- ✅ Fixes the security warning
- ✅ Zero breaking changes

---

## Optional: Fix HTTP Extension Warning

If you want to fix the 3rd warning (http extension in public schema), follow these additional steps:

### Option A: Live in SQL Editor
```sql
-- Create extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move http extension
DROP EXTENSION IF EXISTS http CASCADE;
CREATE EXTENSION IF NOT EXISTS http SCHEMA extensions;

-- Grant permissions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, service_role;
```

### Option B: Use the Full Migration
Run `supabase/migrations/20251009_fix_remaining_linter_warnings.sql` which includes both fixes.

---

## Troubleshooting

### "Function does not exist"
If you get this error, the functions might not exist in your database yet. In that case:
1. Skip this fix - the warnings won't apply to non-existent functions
2. The functions will be created with proper search_path when needed

### "Permission denied"
Make sure you're logged in as the project owner or have sufficient permissions in the Supabase dashboard.

### Warnings Still Show After Fix
1. Wait 30 seconds and refresh the Advisors page
2. The linter cache may need to update
3. Re-run the linter check manually

---

## Expected Results

### Before:
- ❌ 2-3 WARN level security issues

### After:
- ✅ 0 WARN level security issues (or 1 if you skip the http extension fix)
- ✅ All functions secured against search_path attacks
- ✅ Zero functionality changes

---

## Need Help?

1. **Check the verification query** in `QUICK_FIX_linter_warnings.sql` - it shows current status
2. **Re-run the script** - it's safe to run multiple times (uses CREATE OR REPLACE)
3. **Check Supabase logs** if errors occur

---

**Time Required**: 5 minutes
**Risk Level**: Very Low (non-breaking change)
**Recommendation**: Apply immediately
