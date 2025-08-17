# IGDB Sync System

This system syncs new games from IGDB to your local Supabase database for optimization. It checks IGDB for recently updated games and adds any new ones to your database that aren't already there.

## How it Works

1. **Check IGDB** - Query for games updated in the last N days
2. **Check Local DB** - See which games are already in your Supabase database
3. **Find New Games** - Filter to only games not in your database
4. **Add to Database** - Insert new games into your local Supabase

## Usage

### Prerequisites

1. Make sure `netlify dev` is running (for IGDB API access)
2. Have your Supabase environment variables set

### Running the Sync

```bash
# Dry run (see what would be synced without making changes)
npm run sync-igdb:dry

# Run actual sync (adds games to database)
npm run sync-igdb

# Custom options
node scripts/sync-igdb.js --days 14 --limit 100

# See all options
npm run sync-igdb:help
```

### Options

- `--dry-run, -d` - Test run without adding to database
- `--days N, -n N` - Number of days back to check (default: 7)
- `--limit N, -l N` - Maximum games to process (default: 50)
- `--help, -h` - Show help

## Examples

```bash
# Test sync for last 7 days
npm run sync-igdb:dry

# Sync last 14 days, up to 100 games
node scripts/sync-igdb.js --days 14 --limit 100

# Just sync last 3 days with 20 game limit
node scripts/sync-igdb.js --days 3 --limit 20
```

## What Gets Synced

For each new game found in IGDB, the following data is added to your database:

- **Basic Info**: Name, summary/description
- **Dates**: Release date, created/updated timestamps
- **Ratings**: IGDB rating
- **Images**: Cover URL (high quality)
- **Metadata**: Genre, developer, publisher, platforms
- **IGDB ID**: For future reference and avoiding duplicates

## Database Schema

The sync expects your `game` table to have these fields:

```sql
- igdb_id (integer, unique)
- name (text)
- summary (text)
- description (text)
- release_date (timestamp)
- igdb_rating (numeric)
- cover_url (text)
- pic_url (text)
- genre (text)
- genres (jsonb array)
- developer (text)
- publisher (text)
- platforms (jsonb array)
- created_at (timestamp)
- updated_at (timestamp)
```

## Sync Logging

The system can optionally log sync operations to a `igdb_sync_log` table for tracking:

- When syncs ran
- How many games were checked/added
- Any errors that occurred
- Success/failure status

## Safety Features

- **Dry Run Mode** - Test without making changes
- **Duplicate Prevention** - Won't add games that already exist (by IGDB ID)
- **Error Handling** - Continues processing even if individual games fail
- **Batch Processing** - Adds games one at a time with delays
- **Local Only** - Runs against your local database only

## Monitoring

The script provides detailed console output:

```
🔄 Starting IGDB sync (LIVE)
📅 Checking games updated in last 7 days
🎯 Max games to process: 50
🔍 Fetching recent games from IGDB...
📦 Found 15 recently updated games in IGDB
🔍 Checking existing games in database...
📊 Found 8 existing games in database
🆕 Found 7 new games not in our database

📋 New games to add:
  1. The Legend of Zelda: Tears of the Kingdom (ID: 119133)
  2. Spider-Man 2 (ID: 152355)
  ...

💾 Adding 7 games to database...
  Adding 1/7: The Legend of Zelda: Tears of the Kingdom...
    ✅ Added successfully

🎉 Sync completed!
   📊 Total checked: 15
   🆕 New games found: 7
   ✅ Games added: 7
   ❌ Errors: 0
```

## Troubleshooting

### "Netlify dev server is not running"
- Make sure you run `netlify dev` first
- The IGDB function needs to be available at `localhost:8888`

### "Supabase connection failed"
- Check your environment variables
- Make sure your database is accessible

### "IGDB API error"
- Check your IGDB API credentials in Netlify environment
- Make sure you have valid TWITCH_CLIENT_ID and TWITCH_APP_ACCESS_TOKEN

### Games not being found
- Try increasing the `--days` parameter
- IGDB's `updated_at` field tracks when game data was modified
- New releases might not show up immediately in the "updated" list

## Best Practices

1. **Start with dry runs** to see what would be synced
2. **Use reasonable limits** (50-100 games) to avoid overwhelming your database
3. **Run regularly** (daily/weekly) to keep your database current
4. **Monitor the logs** to track sync success/failures
5. **Keep local only** during testing to avoid affecting production data