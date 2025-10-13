# How to Apply the V2 Performance Fix

## What Went Wrong?

The first migration failed because your database uses:
- **Integer IDs** for users (1, 2, 3...)
- **UUID** for auth (`auth.uid()` returns uuid like 'abc-123-def')

Can't compare integer = uuid directly!

## The Fix

Use **v2 migration** which properly maps UUID → Integer via the `user.provider_id` column.

---

## Steps to Apply

### Step 1: Run V2 Migration
1. Open Supabase SQL Editor
2. Copy **entire contents** of:
   ```
   supabase/migrations/20251009_fix_performance_warnings_v2.sql
   ```
3. Paste and click **RUN**

### Step 2: Add Performance Index (Recommended)
After v2 migration succeeds, run:
```
OPTIONAL_add_provider_id_index.sql
```

This index speeds up the UUID→Integer lookups dramatically.

---

## What V2 Changes

### Before (broken):
```sql
USING (user_id = auth.uid())  -- ❌ Type mismatch!
```

### After (works):
```sql
USING (
  user_id IN (
    SELECT id FROM user WHERE provider_id = (SELECT auth.uid())
  )
)  -- ✅ Proper type handling
```

---

## Expected Results

### After V2 Migration:
```
✅ Performance optimization migration complete!

Fixed:
  - 5 auth RLS initplan issues (with type-safe uuid->integer mapping)
  - 6 multiple permissive policy issues
  - 1 duplicate index issue
```

### After Optional Index:
```
✅ Created index on user.provider_id for RLS performance
```

---

## Verification

1. Go to **Database → Advisors → Performance**
2. All 12 warnings should be **gone** ✅

---

## Performance Notes

The v2 solution adds a join to the `user` table for auth checks.

**Without the optional index**: Works but slower on large user tables
**With the optional index**: Fast even with millions of users

**Recommendation**: Apply both migrations for best performance.

---

## Files to Use

1. **Main fix**: `20251009_fix_performance_warnings_v2.sql` ← Use this one
2. **Performance boost**: `OPTIONAL_add_provider_id_index.sql` ← Run after
3. **Don't use**: `20251009_fix_performance_warnings.sql` ← Old version (has type errors)

---

## Total Time

- V2 migration: ~5 seconds
- Optional index: ~1 second (instant on small tables)
- Total: **~10 seconds**

---

## More Info

See `TYPE_MISMATCH_FIX.md` for detailed explanation of the integer vs uuid issue.
