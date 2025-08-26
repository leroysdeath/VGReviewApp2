# Follower Count Synchronization Issue

## Problem Summary

The follower count displayed in the UserPage header shows 0 for user "leroysdeath" when the actual value should be 1. The `user_follow` table contains the correct follower relationship data, but the computed `follower_count` column in the `user` table is not synchronized.

## Investigation Findings

### Data Layer Analysis

- **Source Data**: `user_follow` table has correct follower relationships
- **Computed Data**: `user.follower_count` column shows 0 (incorrect)
- **UI Display**: UserPage correctly reads from `userData.follower_count` and displays 0

### Code Analysis

The UserPage.tsx component is functioning correctly:

```typescript
// Line 149-151: Fetching computed columns
const followerCount = userData.follower_count || 0;
const followingCount = userData.following_count || 0;

// Line 201-202: Stats calculation
following: user._followingCount || 0, // Real following count from database
followers: user._followerCount || 0  // Real follower count from database
```

## Root Cause Analysis

This is a **database synchronization issue** between the source table (`user_follow`) and the denormalized computed column (`user.follower_count`).

### Likely Causes

1. **Missing Database Triggers**
   - Triggers that should update `user.follower_count` when `user_follow` rows are inserted/deleted may not exist
   - Trigger functions may be present but not properly attached to the table

2. **Broken Trigger Logic**
   - Triggers exist but contain bugs preventing proper count updates
   - Triggers may not handle edge cases (deletes, duplicate follows, etc.)

3. **Permission Issues**
   - Triggers may lack proper permissions to update the `user` table
   - Row Level Security (RLS) policies may be blocking trigger execution

4. **Transaction Isolation Problems**
   - Follower relationships are being added successfully
   - Count update operations are failing or rolling back
   - Partial transaction commits leaving data in inconsistent state

## Investigation Steps Required

### 1. Verify Trigger Existence
```sql
-- Check if triggers exist on user_follow table
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'user_follow';
```

### 2. Manual Count Verification
```sql
-- Verify actual follower count for leroysdeath
SELECT COUNT(*) as actual_follower_count 
FROM user_follow 
WHERE followed_user_id = (SELECT id FROM "user" WHERE username = 'leroysdeath');

-- Check computed column value
SELECT follower_count, following_count 
FROM "user" 
WHERE username = 'leroysdeath';
```

### 3. Trigger Function Analysis
```sql
-- Check trigger functions (if they exist)
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname LIKE '%follower%' OR proname LIKE '%follow%';
```

### 4. Check Database Logs
- Review PostgreSQL logs for trigger execution errors
- Look for RLS policy violations
- Check for constraint violations or permission denied errors

## Resolution Strategy

### Option 1: Fix Existing Triggers
- Debug and repair existing trigger logic
- Ensure proper permissions and RLS policy compatibility

### Option 2: Create New Triggers
- Implement proper `AFTER INSERT` and `AFTER DELETE` triggers on `user_follow`
- Update both `follower_count` and `following_count` columns appropriately

### Option 3: Manual Sync + Prevention
- Run one-time manual sync to fix existing discrepancies
- Implement proper triggers to prevent future sync issues

### Example Trigger Implementation
```sql
-- Trigger function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        UPDATE "user" SET follower_count = follower_count + 1 
        WHERE id = NEW.followed_user_id;
        UPDATE "user" SET following_count = following_count + 1 
        WHERE id = NEW.follower_user_id;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        UPDATE "user" SET follower_count = follower_count - 1 
        WHERE id = OLD.followed_user_id;
        UPDATE "user" SET following_count = following_count - 1 
        WHERE id = OLD.follower_user_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER follower_count_trigger
    AFTER INSERT OR DELETE ON user_follow
    FOR EACH ROW
    EXECUTE FUNCTION update_follower_counts();
```

## Impact Assessment

- **User Experience**: Incorrect follower counts displayed in profiles
- **Data Integrity**: Source data is correct, only computed columns affected
- **Code Impact**: No changes needed to React components
- **Database Impact**: Requires trigger implementation or repair

## Next Steps

1. Execute investigation queries to identify specific issue
2. Implement or repair database triggers
3. Run manual synchronization to fix existing discrepancies
4. Test trigger functionality with follow/unfollow operations
5. Monitor for future synchronization issues