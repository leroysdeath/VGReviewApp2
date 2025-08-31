# Rollback Procedure for Game State Exclusivity

## When to Use This Rollback

Use this rollback procedure if:
- The exclusivity triggers are causing issues in production
- You need to temporarily disable the exclusivity enforcement
- You want to restore the original data with conflicts

## Rollback Steps

### Step 1: Remove Triggers (Keep Data)

If you only want to disable the exclusivity enforcement but keep the cleaned data:

```sql
-- Run this file in Supabase SQL Editor
rollback_triggers.sql
```

This will:
- Remove all exclusivity triggers
- Remove state history tracking (if enabled)
- Keep all current data intact
- Allow games to exist in multiple states again

### Step 2: Restore Original Data (Optional)

If you need to restore the original conflicting data:

**WARNING: This will replace current data with the backup!**

```sql
-- First, remove triggers
rollback_triggers.sql

-- Then restore original data
rollback_cleanup.sql
```

This will:
- Restore all collection and wishlist entries from backup
- Bring back any conflicts that existed before cleanup
- Reset the system to its original state

## Partial Rollback Options

### Option 1: Disable Triggers Temporarily

To temporarily disable triggers without removing them:

```sql
-- Disable triggers
ALTER TABLE user_collection DISABLE TRIGGER enforce_state_exclusivity_on_collection;
ALTER TABLE user_wishlist DISABLE TRIGGER enforce_state_exclusivity_on_wishlist;
ALTER TABLE game_progress DISABLE TRIGGER enforce_state_exclusivity_on_progress;

-- Re-enable when ready
ALTER TABLE user_collection ENABLE TRIGGER enforce_state_exclusivity_on_collection;
ALTER TABLE user_wishlist ENABLE TRIGGER enforce_state_exclusivity_on_wishlist;
ALTER TABLE game_progress ENABLE TRIGGER enforce_state_exclusivity_on_progress;
```

### Option 2: Keep Triggers but Allow Specific Operations

Modify the trigger function to add exceptions:

```sql
-- Add a session variable to bypass triggers
SET LOCAL app.bypass_exclusivity = 'true';

-- Then modify trigger function to check this variable
-- (Would require modifying the manage_game_state_exclusivity function)
```

## Verification After Rollback

After rollback, verify the state:

```sql
-- Check if triggers are removed
SELECT COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'enforce_state_exclusivity%';

-- Check for conflicts (should be allowed after rollback)
SELECT COUNT(*) as conflicts
FROM user_collection c
INNER JOIN user_wishlist w ON c.user_id = w.user_id AND c.igdb_id = w.igdb_id;
```

## Re-applying After Rollback

To re-apply the exclusivity system after a rollback:

1. Run the migrations again in order:
   - `01_cleanup_game_state_conflicts.sql`
   - `02_add_igdb_id_to_game_progress.sql`
   - `03_create_state_exclusivity_triggers.sql`
   - `04_create_state_history_table.sql` (optional)
   - `05_add_game_state_indexes.sql`

## Important Notes

1. **Backup data is kept**: The backup tables in `backup_game_states` schema are not deleted
2. **Indexes remain**: Performance indexes are kept by default (they don't hurt)
3. **Application code**: Remember to handle errors in the application if triggers are removed
4. **User communication**: Inform users if allowing conflicting states again

## Emergency Quick Rollback

For immediate rollback in production:

```sql
-- Quick disable all triggers
DROP FUNCTION IF EXISTS manage_game_state_exclusivity() CASCADE;
```

This single command will remove the function and all associated triggers immediately.