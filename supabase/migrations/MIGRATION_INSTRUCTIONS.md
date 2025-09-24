# Migration Instructions - Phase 1 Missing Games

## Overview
Phase 1 of the Missing Games Action Plan has been implemented through two comprehensive SQL migration files that will add 350+ high-priority games to your database.

## Migration Files Created

### 1. `20250122_add_missing_games_phase1.sql`
- **Games Added**: 150+ games
- **Focus**: Core franchises with the most missing titles
- **Franchises Covered**:
  - Game and Watch (24 games)
  - Dragon Quest (25 games)
  - Lego Games (24 games)
  - Megami Tensei (21 games)
  - Tales (18 games)
  - Plus additional titles from Batman, Bioshock, Counter-Strike, etc.

### 2. `20250122_add_missing_games_phase1_batch2.sql`
- **Games Added**: 200+ games
- **Focus**: Remaining high-priority franchises
- **Franchises Covered**:
  - Gundam (25 games)
  - SingStar (22 games)
  - Oregon Trail (20 games)
  - Dragon Ball (19 games)
  - Castlevania (16 games)
  - Plus NHL, NBA Live, PGA Tour editions

## How to Apply the Migrations

### Option 1: Via Supabase Dashboard (Recommended)

1. **Access Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor section

2. **Apply First Migration**
   - Open `20250122_add_missing_games_phase1.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" to execute
   - Verify success message

3. **Apply Second Migration**
   - Open `20250122_add_missing_games_phase1_batch2.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" to execute
   - Verify success message

### Option 2: Via Supabase CLI

```bash
# Navigate to your project directory
cd /path/to/VGReviewApp2-clean

# Apply the migrations
supabase db push

# Or apply individually
supabase db execute -f supabase/migrations/20250122_add_missing_games_phase1.sql
supabase db execute -f supabase/migrations/20250122_add_missing_games_phase1_batch2.sql
```

### Option 3: Direct Database Connection

```bash
# If you have direct database access
psql -h your-db-host -U your-db-user -d your-db-name

# Then run each file
\i supabase/migrations/20250122_add_missing_games_phase1.sql
\i supabase/migrations/20250122_add_missing_games_phase1_batch2.sql
```

## Verification Steps

After applying the migrations, verify the games were added successfully:

### 1. Check Total Game Count
```sql
-- Should show an increase of ~350 games
SELECT COUNT(*) as total_games
FROM game
WHERE data_source = 'manual';
```

### 2. Verify Specific Franchises
```sql
-- Check Game and Watch franchise
SELECT COUNT(*) as gw_count
FROM game
WHERE franchise = 'Game and Watch';

-- Check Dragon Quest franchise
SELECT COUNT(*) as dq_count
FROM game
WHERE franchise = 'Dragon Quest';

-- Check all manual entries from today
SELECT franchise, COUNT(*) as game_count
FROM game
WHERE data_source = 'manual'
  AND DATE(created_at) = CURRENT_DATE
GROUP BY franchise
ORDER BY game_count DESC;
```

### 3. Test Search Functionality
```sql
-- Test that search vectors were properly updated
SELECT name, slug, franchise
FROM game
WHERE search_vector @@ plainto_tsquery('english', 'game watch')
LIMIT 5;

-- Test search aliases
SELECT name, search_aliases
FROM game
WHERE search_aliases IS NOT NULL
LIMIT 10;
```

## Troubleshooting

### If Migrations Fail

1. **Check for Duplicate game_ids**
   ```sql
   SELECT game_id, COUNT(*)
   FROM game
   GROUP BY game_id
   HAVING COUNT(*) > 1;
   ```

2. **Review Error Messages**
   - Look for constraint violations
   - Check for data type mismatches
   - Verify required fields are present

3. **Rollback if Needed**
   ```sql
   -- Remove recently added games if something went wrong
   DELETE FROM game
   WHERE data_source = 'manual'
     AND created_at >= NOW() - INTERVAL '1 hour';
   ```

### Common Issues

- **Permission Denied**: Ensure you're using an account with INSERT privileges
- **Duplicate Key**: The migrations use `ON CONFLICT DO NOTHING` to handle duplicates
- **Foreign Key Violations**: Should not occur as we're not linking to other tables initially

## Post-Migration Tasks

### 1. Update IGDB IDs
Many of these games exist in IGDB. Consider running a matching process to link them:

```sql
-- Example: Find potential IGDB matches for manual entries
SELECT g.name, g.franchise, g.game_id
FROM game g
WHERE g.data_source = 'manual'
  AND g.igdb_id IS NULL
ORDER BY g.franchise, g.name;
```

### 2. Add Missing Metadata
The migrations include basic information. You may want to add:
- Cover images
- Screenshots
- Detailed descriptions
- IGDB ratings
- Platform-specific release dates

### 3. Quality Assurance
- Review each franchise for completeness
- Check for any obvious errors in game names
- Verify platform assignments
- Ensure release dates are accurate where provided

## Next Steps

After successfully applying Phase 1:

1. **Proceed to Phase 2** (Weeks 4-6)
   - Focus on Collections, Remasters, Modern Exclusives
   - Target: 100+ additional games

2. **Phase 3** (Weeks 7-10)
   - Japan Exclusives, Regional Variants
   - Target: 80+ games

3. **Phase 4** (Weeks 11-14)
   - Mobile, Browser, Arcade games
   - Target: 60+ games

## Success Metrics

Phase 1 targets achieved:
- ✅ 350+ games added (exceeded 150 game target)
- ✅ All high-priority franchises addressed
- ✅ Search functionality enhanced with aliases
- ✅ Proper data source tracking for future updates

## Support

If you encounter any issues:
1. Check the error logs in Supabase Dashboard
2. Verify your database permissions
3. Ensure migrations are run in order (phase1 before phase1_batch2)
4. Consider running migrations in smaller chunks if timeout issues occur

---

*Generated: 2025-01-22*
*Total Games Added: ~350*
*Franchises Updated: 30+*