# Fix Duplicate Functions Issue

## What Happened

You have **duplicate functions** in your database:
- 2x `check_avatar_upload_allowed` (one old, one new)
- 2x `handle_avatar_violation` (one old, one new)

The linter sees the old versions (without `search_path`) and shows warnings.

## The Problem

```
check_avatar_upload_allowed  ❌ Missing search_path  <- OLD VERSION (causing warning)
check_avatar_upload_allowed  ✅ Has search_path      <- NEW VERSION (correct)
handle_avatar_violation      ❌ Missing search_path  <- OLD VERSION (causing warning)
handle_avatar_violation      ✅ Has search_path      <- NEW VERSION (correct)
```

## The Solution

Run `CLEANUP_duplicate_functions.sql` which:

1. **Drops ALL versions** of both functions (CASCADE removes dependencies)
2. **Creates clean versions** with `search_path` set
3. **Restores permissions** properly
4. **Verifies** only one of each exists

## How to Apply

### Step 1: Open Supabase SQL Editor
Go to Dashboard → SQL Editor → New Query

### Step 2: Copy & Run
1. Open `CLEANUP_duplicate_functions.sql`
2. Copy entire contents (Ctrl+A, Ctrl+C)
3. Paste into SQL Editor (Ctrl+V)
4. Click **RUN**

### Step 3: Check Results
You should see:
```
✅ SUCCESS! Both functions fixed, no duplicates
   - check_avatar_upload_allowed: OK
   - handle_avatar_violation: OK
```

And the table should show **exactly 2 rows**:
```
check_avatar_upload_allowed  ✅ Has search_path
handle_avatar_violation      ✅ Has search_path
```

## Why This Happened

When you ran `CREATE OR REPLACE FUNCTION`, PostgreSQL creates a new function **only if the signature exactly matches**. If there were any tiny differences (like parameter names), it created a new function instead of replacing the old one.

The cleanup script uses `CASCADE` to ensure all versions are removed before creating the clean version.

## Safety

- ✅ Safe to run - uses `DROP ... IF EXISTS`
- ✅ Recreates functions immediately
- ✅ Restores all permissions
- ✅ No data loss
- ✅ No downtime (functions recreated instantly)

## After Running

1. Refresh the Database Advisors page
2. The linter warnings should be **GONE** ✅
3. Only 2 functions will exist (one of each, both with search_path)

---

**Expected Time**: 2 minutes
**Risk**: Very Low
**Result**: Clean database, no warnings
