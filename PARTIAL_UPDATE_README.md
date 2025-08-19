# Partial Database Update Script

## ⚠️ IMPORTANT: This Script ONLY Updates 8 Specific Columns

This script performs **PARTIAL UPDATES** on your game table, modifying ONLY these columns:
- `summary` - Game description text
- `slug` - URL-friendly game identifier
- `cover_url` - Cover image URL
- `screenshots` - Array of screenshot URLs
- `developer` - Game developer name
- `publisher` - Game publisher name
- `platforms` - Array of platform names
- `igdb_link` - Link to IGDB page

**All other columns (id, name, release_date, genre, etc.) remain UNTOUCHED.**

## 🎮 Games Being Updated

The script updates these specific games by their database ID:
1. **55056** - Age of Empires II: Definitive Edition
2. **4152** - Skies of Arcadia Legends
3. **305152** - Clair Obscur: Expedition 33
4. **116** - Star Wars: Knights of the Old Republic
5. **338616** - Mario Kart Tour: Mario Bros. Tour
6. **45142** - The Legend of Zelda: Ocarina of Time - Master Quest
7. **222095** - Super Mario Bros.

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **IGDB API Credentials** (Twitch Developer account)
3. **Supabase Project** credentials
4. **Dependencies installed**: `npm install`

## 🔧 Setup

### 1. Configure Environment Variables

Copy `.env.partial_update_example` to `.env`:
```bash
cp .env.partial_update_example .env
```

Then edit `.env` and add your credentials:
```env
TWITCH_CLIENT_ID=your_client_id
TWITCH_APP_ACCESS_TOKEN=your_access_token
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Get IGDB Credentials

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Create an application
3. Get your Client ID and Client Secret
4. Generate an access token:
```bash
curl -X POST 'https://id.twitch.tv/oauth2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&grant_type=client_credentials'
```

## 🚀 Usage

### Dry Run Mode (Preview Changes)
```bash
node update_game_columns_partial.js --dry-run
```
This shows what would be updated WITHOUT making any changes.

### Execute Updates
```bash
node update_game_columns_partial.js
```
You'll be prompted to confirm before any updates are made.

## 🔍 Verification

### Before Running: Check Current State
```sql
-- Run verify_partial_update.sql in your database
-- This shows current values for the 8 columns being updated
```

### After Running: Verify Updates
```sql
SELECT 
    id,
    name,
    CASE WHEN summary IS NOT NULL THEN '✓' ELSE '✗' END as has_summary,
    CASE WHEN slug IS NOT NULL THEN '✓' ELSE '✗' END as has_slug,
    CASE WHEN cover_url IS NOT NULL THEN '✓' ELSE '✗' END as has_cover,
    array_length(screenshots, 1) as screenshots,
    developer,
    publisher,
    array_length(platforms, 1) as platforms
FROM game
WHERE id IN (55056, 4152, 305152, 116, 338616, 45142, 222095);
```

## 🛡️ Safety Features

1. **Confirmation Prompt**: Requires explicit confirmation before updating
2. **Partial Updates Only**: Uses specific column UPDATE, not full row replacement
3. **Dry Run Mode**: Preview changes without executing
4. **ID-based Targeting**: Updates only specific rows by ID
5. **Skip on Error**: If IGDB lookup fails, game is skipped (not deleted)
6. **Detailed Logging**: Every action is logged for audit trail

## 📊 Update Behavior

- **NULL Handling**: NULL values from IGDB are properly handled
- **Array Fields**: Empty arrays are stored as `[]`, not NULL
- **Missing Games**: Games not found in IGDB are skipped with warning
- **Existing Data**: The script overwrites existing values in the 8 columns
- **Other Columns**: All other columns remain exactly as they were

## 🔄 Rollback Option

If you need to rollback, you can create a backup first:
```sql
-- Create backup before running script
CREATE TABLE game_backup_YYYYMMDD AS
SELECT * FROM game
WHERE id IN (55056, 4152, 305152, 116, 338616, 45142, 222095);

-- Restore from backup if needed
UPDATE game g
SET 
    summary = b.summary,
    slug = b.slug,
    cover_url = b.cover_url,
    screenshots = b.screenshots,
    developer = b.developer,
    publisher = b.publisher,
    platforms = b.platforms,
    igdb_link = b.igdb_link
FROM game_backup_YYYYMMDD b
WHERE g.id = b.id;
```

## ⚠️ Important Notes

1. **This is NOT a full sync** - Only updates the 8 specified columns
2. **IDs must match** - The script uses YOUR database IDs, not IGDB IDs
3. **One-way update** - Data flows from IGDB → Database only
4. **No insertion** - Only updates existing rows, never creates new ones
5. **Rate limiting** - Script includes delays to respect IGDB rate limits

## 📝 Logs

The script provides detailed logging:
- 🔍 Searching IGDB for game
- ✅ Successfully found and updated
- ⚠️ Warnings for missing games
- ❌ Errors with details
- 📊 Final summary of all operations

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing IGDB API credentials" | Add credentials to `.env` file |
| "No game found with ID X" | Verify the ID exists in your database |
| "IGDB API error: 401" | Regenerate your access token |
| "Not found in IGDB" | Game name might differ, will be skipped |
| No changes visible | Check dry-run mode isn't enabled |

## 📧 Support

If you encounter issues:
1. Check the logs for specific error messages
2. Verify your credentials are correct
3. Run the verification SQL to check database state
4. Use dry-run mode to test without changes