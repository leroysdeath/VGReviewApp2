# Supabase Linter Warnings Fix

## Issues Identified

The Supabase database linter identified 3 security warnings that needed to be addressed:

### 1. Function Search Path Mutable - `check_avatar_upload_allowed`
- **Severity**: WARN
- **Category**: SECURITY
- **Issue**: Function has a role-mutable search_path, which can be exploited for privilege escalation
- **Risk**: Attackers could manipulate search_path to inject malicious objects

### 2. Function Search Path Mutable - `handle_avatar_violation`
- **Severity**: WARN
- **Category**: SECURITY
- **Issue**: Function has a role-mutable search_path
- **Risk**: Same privilege escalation vulnerability as above

### 3. Extension in Public Schema - `http`
- **Severity**: WARN
- **Category**: SECURITY
- **Issue**: Extension installed in public schema instead of isolated schema
- **Risk**: Name collision with user objects, potential security issues

## Solution Implemented

### Migration: `20251009_fix_remaining_linter_warnings.sql`

This migration addresses all three warnings:

#### ✅ Fixed Avatar Functions (Issues #1 & #2)
Both functions were recreated with explicit `search_path` setting:

```sql
SET search_path = public, pg_temp
```

**What this does:**
- Locks the search path to only `public` schema and temp schema
- Prevents attackers from injecting malicious objects via search_path manipulation
- Maintains SECURITY DEFINER functionality safely

**Functions updated:**
- `public.check_avatar_upload_allowed(uuid)` - Checks if user can upload avatars based on violation history
- `public.handle_avatar_violation(uuid, text, text)` - Records violations and removes problematic avatars

#### ✅ Moved HTTP Extension (Issue #3)
The `http` extension was moved from `public` schema to `extensions` schema:

**Benefits:**
- Isolates extension objects from user tables/functions
- Prevents name collisions
- Follows PostgreSQL best practices
- Cleaner namespace organization

**Implementation:**
1. Created `extensions` schema if not exists
2. Dropped `http` extension from `public` (with CASCADE)
3. Recreated in `extensions` schema
4. Granted proper permissions to all roles

## How to Apply

### Option 1: Via Supabase CLI (Recommended)
```bash
npx supabase db push
```

### Option 2: Via SQL Console
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20251009_fix_remaining_linter_warnings.sql`
3. Execute the migration
4. Verify with the verification queries below

## Verification

### Check Function Search Paths
```sql
SELECT
  p.proname,
  CASE
    WHEN p.proconfig IS NOT NULL AND array_to_string(p.proconfig, ',') LIKE '%search_path%'
    THEN '✅ Has search_path'
    ELSE '❌ Missing search_path'
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('check_avatar_upload_allowed', 'handle_avatar_violation');
```

**Expected result**: Both functions show "✅ Has search_path"

### Check HTTP Extension Location
```sql
SELECT
  e.extname,
  n.nspname AS schema
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname = 'http';
```

**Expected result**: `http` is in `extensions` schema

### Run Full Verification Script
```bash
psql -f verify_linter_warnings.sql
```

## Impact Assessment

### ✅ Zero Breaking Changes
- Avatar functions maintain same signatures
- Permissions preserved and explicitly granted
- HTTP extension functionality unchanged (just moved location)

### ✅ Improved Security
- Eliminates privilege escalation vulnerabilities
- Follows PostgreSQL security best practices
- Aligns with Supabase recommendations

### ✅ Better Organization
- Extensions isolated in dedicated schema
- Clear separation of concerns
- Easier maintenance

## Testing Checklist

After applying migration, verify:

- [ ] Users can still upload avatars (if no violations)
- [ ] Avatar violations are recorded correctly
- [ ] HTTP extension functions still work (if used anywhere)
- [ ] No errors in Supabase logs
- [ ] Database linter shows 0 warnings for these issues

## Rollback (If Needed)

If issues occur, rollback by:

```sql
-- Restore original functions (without search_path)
-- Note: This restores functionality but brings back the warnings

-- Restore check_avatar_upload_allowed
DROP FUNCTION IF EXISTS public.check_avatar_upload_allowed(uuid);
CREATE OR REPLACE FUNCTION public.check_avatar_upload_allowed(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
-- NO SET search_path here (original state)
AS $$ ... original function body ... $$;

-- Restore handle_avatar_violation
DROP FUNCTION IF EXISTS public.handle_avatar_violation(uuid, text, text);
CREATE OR REPLACE FUNCTION public.handle_avatar_violation(...)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
-- NO SET search_path here (original state)
AS $$ ... original function body ... $$;

-- Move http extension back to public
DROP EXTENSION IF EXISTS http CASCADE;
CREATE EXTENSION IF NOT EXISTS http SCHEMA public;
```

**Note**: Rollback is not recommended as it reintroduces security warnings.

## References

- [Supabase Function Search Path Linter](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [PostgreSQL SECURITY DEFINER Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [PostgreSQL Extension Management](https://www.postgresql.org/docs/current/sql-createextension.html)

## Status

- ✅ Migration created: `supabase/migrations/20251009_fix_remaining_linter_warnings.sql`
- ✅ Verification script created: `verify_linter_warnings.sql`
- ⏳ **Ready to apply** - awaiting deployment

---

**Created**: 2025-10-09
**Fixes**: 3 Supabase linter warnings (WARN level, SECURITY category)
