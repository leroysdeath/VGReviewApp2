# Type Mismatch Fix Explained

## The Problem

Your database has two different ID systems:
1. **Auth UUID** (`auth.uid()` returns `uuid`) - Supabase auth system
2. **Database Integer** (`user.id` is `integer`) - Your app's internal ID

This causes the error:
```
ERROR: operator does not exist: integer = uuid
```

## Your Schema

```sql
-- Auth system (Supabase)
auth.users.id → uuid

-- Your database
public.user.id → integer (primary key)
public.user.provider_id → uuid (links to auth.users.id)

-- Other tables
public.user_analytics.user_id → integer (links to user.id)
public.rating.user_id → integer (links to user.id)
public.game_views.user_id → integer (links to user.id)
```

## The Solution

Map `auth.uid()` (uuid) to `user.id` (integer) via the `user.provider_id` column:

### Before (causes error):
```sql
USING (user_id = auth.uid())  -- ❌ integer = uuid (type mismatch!)
```

### After (works):
```sql
USING (
  user_id IN (
    SELECT id FROM public.user WHERE provider_id = (SELECT auth.uid())
  )
)  -- ✅ integer = integer (types match!)
```

## How It Works

1. `auth.uid()` returns logged-in user's UUID (e.g., `'abc-123-def'`)
2. Join to `user` table to find matching `provider_id`
3. Get the `user.id` (integer) for that user
4. Compare with `user_id` column (also integer)

## Updated Migration

The v2 migration (`20251009_fix_performance_warnings_v2.sql`) fixes all policies:

### user_analytics
```sql
-- Maps auth UUID → user integer ID
USING (
  user_id IN (
    SELECT id FROM public.user WHERE provider_id = (SELECT auth.uid())
  )
)
```

### rating
```sql
-- Same pattern for managing own ratings
USING (
  user_id IN (
    SELECT id FROM public.user WHERE provider_id = (SELECT auth.uid())
  )
)
```

### game_views
```sql
-- More complex but same principle
USING (
  user_id IN (
    SELECT id FROM public.user WHERE provider_id = (SELECT auth.uid())
  )
)
```

## Performance Note

The subquery `SELECT id FROM user WHERE provider_id = ?` adds a join to the user table.

**To optimize**, ensure you have an index on `user.provider_id`:

```sql
CREATE INDEX IF NOT EXISTS idx_user_provider_id ON public.user(provider_id);
```

This index makes the lookup near-instant even with millions of users.

## Why This Happened

Your app uses integer IDs internally (simpler, faster, auto-increment) but Supabase Auth uses UUIDs (required for distributed auth). This is a common pattern and totally fine - just need to map between them in RLS policies.

## Apply the Fix

Use the **v2** migration file:
```
supabase/migrations/20251009_fix_performance_warnings_v2.sql
```

This version handles all type conversions properly.

---

**Result**: All RLS policies work correctly with proper type handling! ✅
