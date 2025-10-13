# Critical Migration Fix Required

## Problem Identified

There are **TWO different versions** of the `get_or_create_user` function with **incompatible parameter types**:

### Version 1: `supabase/migrations/20250822_create_get_or_create_user_function.sql`
```sql
CREATE OR REPLACE FUNCTION get_or_create_user(
  auth_id UUID,          -- ✅ CORRECT - UUID type
  user_email TEXT,
  user_name TEXT,
  user_provider TEXT DEFAULT 'supabase'
)
RETURNS INTEGER
```

### Version 2: `get_or_create_user_function.sql` (Root directory)
```sql
CREATE OR REPLACE FUNCTION get_or_create_user(
  auth_id text,          -- ❌ WRONG - TEXT type
  user_email text,
  user_name text,
  user_provider text DEFAULT 'supabase'
) RETURNS integer
```

## Why This Matters

1. **Type Safety**: Supabase auth IDs are UUIDs, not arbitrary text
2. **Performance**: UUID type is more efficient than TEXT for this use case
3. **Validation**: PostgreSQL validates UUID format automatically
4. **Permission Grants**: The two versions have different signatures, so grants might not match

## Additional Issues Found

### Missing `anon` Permission
The migration in `supabase/migrations/` only grants to `authenticated`:
```sql
-- ❌ Missing anon grant
GRANT EXECUTE ON FUNCTION get_or_create_user(UUID, TEXT, TEXT, TEXT) TO authenticated;
```

But the root version grants to both (correct):
```sql
-- ✅ Both roles granted
GRANT EXECUTE ON FUNCTION get_or_create_user(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_user(text, text, text, text) TO anon;
```

### Why `anon` Permission is Critical

New users during signup are in the `anon` role **before** their profile is created. Without `anon` permission:
- ❌ 404 errors during signup
- ❌ Users can't be created
- ❌ Landing page fails for new visitors

## Correct Migration

Use this corrected version that combines the best of both:

```sql
-- Corrected get_or_create_user function
-- Combines UUID type safety with proper permission grants

CREATE OR REPLACE FUNCTION get_or_create_user(
  auth_id UUID,                    -- ✅ UUID type for type safety
  user_email TEXT,
  user_name TEXT,
  user_provider TEXT DEFAULT 'supabase'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public         -- ✅ Security best practice
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
    auth_id::TEXT,               -- Cast UUID to TEXT for storage
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

-- ✅ Grant to BOTH roles (critical for signup flow)
GRANT EXECUTE ON FUNCTION get_or_create_user(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_user(UUID, TEXT, TEXT, TEXT) TO anon;

-- Add documentation
COMMENT ON FUNCTION get_or_create_user IS 'Atomically gets or creates a user based on their auth provider ID. Grants to both authenticated and anon roles to support signup flow.';
```

## How TypeScript Calls It

The TypeScript code in `userService.ts:229` calls it correctly:

```typescript
const { data: functionResult, error: functionError } = await supabase
  .rpc('get_or_create_user', {
    auth_id: authUser.id,        // ✅ UUID string from Supabase Auth
    user_email: authUser.email || '',
    user_name: authUser.user_metadata?.name || 'User',
    user_provider: 'supabase'
  });
```

Supabase automatically converts the UUID string to the PostgreSQL UUID type.

## Action Required

1. **Drop the incorrect TEXT version** (if it exists):
   ```sql
   DROP FUNCTION IF EXISTS get_or_create_user(text, text, text, text);
   ```

2. **Apply the corrected UUID version** with both permission grants (see above)

3. **Verify permissions**:
   ```sql
   -- Check function exists with correct signature
   SELECT proname, proargtypes
   FROM pg_proc
   WHERE proname = 'get_or_create_user';

   -- Check permissions
   SELECT grantee, privilege_type
   FROM information_schema.routine_privileges
   WHERE routine_name = 'get_or_create_user';
   ```

4. **Test both roles**:
   - Test with authenticated user (existing users)
   - Test with anon user (signup flow)

## Files to Update

1. ✅ Delete or archive: `get_or_create_user_function.sql` (root directory - wrong version)
2. ✅ Update: `supabase/migrations/20250822_create_get_or_create_user_function.sql` (add anon grant)
3. ✅ Keep: `src/services/userService.ts` (TypeScript code is correct)
4. ✅ Keep: `src/services/authService.ts` (now calls correct method)

## Testing Checklist

- [ ] Existing users can log in without errors
- [ ] New users can sign up successfully
- [ ] Landing page loads without 404 errors
- [ ] Database user ID is retrieved correctly
- [ ] No CSP violations for ipapi.co
- [ ] Function works with both authenticated and anon roles
