# Automated IGDB Sync Improvement Plan

## Executive Summary

Instead of implementing IGDB API fallback in the search flow (which would add 500-2000ms latency to every failed search), we'll **proactively sync missing games** using automated background processes. This keeps search fast while improving database coverage.

---

## Current State Analysis

### What Works ✅
- **Manual sync script** (`scripts/sync-igdb.js`) - Well-structured, tested, reliable
- **185K+ games in DB** - Good baseline coverage
- **Fast database searches** - No API latency, instant results
- **Comprehensive filtering** - Content protection, quality scoring, deduplication

### What's Missing ❌
- **No automation** - Requires manual `npm run sync-igdb` execution
- **Coverage gaps** - Recent games (2023+: 1,069 vs expected 3,000+)
- **Single sync strategy** - Only uses `updated_at`, misses new releases
- **No user-driven sync** - Can't request missing games easily

---

## Automation Strategy

### Option 1: Netlify Scheduled Functions (Recommended)
**Best for: Simple, serverless, zero-config automation**

#### How It Works
Netlify supports scheduled functions using the `@netlify/functions` package. These run as cron jobs directly in your deployment environment.

#### Implementation Steps

**Step 1: Create Scheduled Function**
Create `netlify/functions/scheduled-sync.js`:

```javascript
// netlify/functions/scheduled-sync.js
const { schedule } = require('@netlify/functions');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Sync logic (extracted from scripts/sync-igdb.js)
async function performSync() {
  console.log('🔄 Starting automated IGDB sync...');

  try {
    // Step 1: Fetch recently updated games from IGDB
    const recentGames = await fetchRecentGames(7, 50); // Last 7 days, max 50 games

    // Step 2: Check which are already in DB
    const existingIds = await checkExistingGames(recentGames.map(g => g.id));

    // Step 3: Filter to new games only
    const newGames = recentGames.filter(g => !existingIds.has(g.id));

    // Step 4: Add new games to database
    let addedCount = 0;
    for (const game of newGames) {
      const success = await addGameToDatabase(game);
      if (success) addedCount++;
    }

    console.log(`✅ Sync complete: Added ${addedCount}/${newGames.length} new games`);
    return { success: true, added: addedCount, checked: recentGames.length };
  } catch (error) {
    console.error('❌ Sync failed:', error);
    return { success: false, error: error.message };
  }
}

// Helper functions (same as sync-igdb.js)
async function fetchRecentGames(daysBack, limit) {
  const timestamp = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60);

  const response = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${process.env.TWITCH_APP_ACCESS_TOKEN}`,
      'Content-Type': 'text/plain'
    },
    body: `fields name, summary, first_release_date, rating, cover.url, genres.name, platforms.name, involved_companies.company.name; where updated_at > ${timestamp}; sort updated_at desc; limit ${limit};`
  });

  if (!response.ok) throw new Error(`IGDB API error: ${response.status}`);
  return response.json();
}

async function checkExistingGames(igdbIds) {
  const { data } = await supabase
    .from('game')
    .select('igdb_id')
    .in('igdb_id', igdbIds);

  return new Set(data?.map(g => g.igdb_id) || []);
}

async function addGameToDatabase(igdbGame) {
  const gameData = {
    game_id: igdbGame.id.toString(),
    igdb_id: igdbGame.id,
    name: igdbGame.name,
    slug: igdbGame.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    summary: igdbGame.summary || null,
    release_date: igdbGame.first_release_date
      ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
      : null,
    igdb_rating: igdbGame.rating ? Math.round(parseFloat(igdbGame.rating)) : null,
    cover_url: igdbGame.cover?.url?.replace('t_thumb', 't_cover_big').replace('//', 'https://') || null,
    genre: igdbGame.genres?.[0]?.name || null,
    genres: igdbGame.genres?.map(g => g.name) || null,
    developer: igdbGame.involved_companies?.find(c => c.developer)?.company?.name || null,
    platforms: igdbGame.platforms?.map(p => p.name) || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('game').insert([gameData]);
  return !error;
}

// Schedule: Run daily at 3 AM UTC
const handler = schedule('0 3 * * *', async () => {
  const result = await performSync();

  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
});

module.exports = { handler };
```

**Step 2: Install Dependencies**
```bash
npm install @netlify/functions
```

**Step 3: Configure Environment Variables**
In Netlify Dashboard → Site Settings → Environment Variables:
- `TWITCH_CLIENT_ID` (already set)
- `TWITCH_APP_ACCESS_TOKEN` (already set)
- `VITE_SUPABASE_URL` (already set)
- `VITE_SUPABASE_ANON_KEY` (already set)

**Step 4: Deploy**
```bash
git add netlify/functions/scheduled-sync.js
git commit -m "Add automated daily IGDB sync"
git push
```

#### Cron Schedule Options
```javascript
'0 3 * * *'      // Daily at 3 AM UTC
'0 */6 * * *'    // Every 6 hours
'0 0 * * 0'      // Weekly on Sundays at midnight
'0 3 * * 1,4'    // Twice weekly: Mondays and Thursdays at 3 AM
```

#### Pros
- ✅ Zero infrastructure - runs on Netlify
- ✅ Uses existing API credentials
- ✅ Direct database access (Supabase client)
- ✅ Automatic retries and logging
- ✅ Free tier supports 125K function invocations/month

#### Cons
- ❌ Function timeout: 10 seconds (background functions: 15 min on paid plan)
- ❌ Requires Netlify paid plan for background functions ($19/month)
- ❌ Limited monitoring (manual log checking)

---

### Option 2: GitHub Actions (Alternative)
**Best for: Free automation, more control, better logging**

#### Implementation Steps

**Step 1: Create Workflow File**
Create `.github/workflows/sync-igdb.yml`:

```yaml
name: Sync IGDB Games
on:
  schedule:
    # Run daily at 3 AM UTC
    - cron: '0 3 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run IGDB sync
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          TWITCH_CLIENT_ID: ${{ secrets.TWITCH_CLIENT_ID }}
          TWITCH_APP_ACCESS_TOKEN: ${{ secrets.TWITCH_APP_ACCESS_TOKEN }}
        run: |
          # Create a production-ready sync script
          node scripts/sync-igdb-production.js --days 7 --limit 100

      - name: Upload sync logs
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: sync-logs-${{ github.run_number }}
          path: logs/sync-*.log
          retention-days: 30
```

**Step 2: Create Production Sync Script**
Create `scripts/sync-igdb-production.js` (modified version that works without `netlify dev`):

```javascript
#!/usr/bin/env node

// Production IGDB Sync - Calls IGDB API directly without Netlify dev
// This script is designed to run in CI/CD environments like GitHub Actions

import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

global.fetch = fetch;

// Configuration from environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_ACCESS_TOKEN = process.env.TWITCH_APP_ACCESS_TOKEN;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

if (!TWITCH_CLIENT_ID || !TWITCH_ACCESS_TOKEN) {
  console.error('❌ Missing IGDB/Twitch credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class ProductionIGDBSync {
  async syncNewGames(options = {}) {
    const { daysBack = 7, limit = 50 } = options;

    console.log(`🔄 Starting production IGDB sync`);
    console.log(`📅 Days back: ${daysBack}, Limit: ${limit}`);

    try {
      // Fetch directly from IGDB API (no Netlify proxy)
      const recentGames = await this.fetchFromIGDB(daysBack, limit);
      console.log(`📦 Found ${recentGames.length} recently updated games`);

      // Check existing
      const existingIds = await this.checkExisting(recentGames.map(g => g.id));
      const newGames = recentGames.filter(g => !existingIds.has(g.id));
      console.log(`🆕 Found ${newGames.length} new games to add`);

      // Add to database
      let addedCount = 0;
      for (const game of newGames) {
        const success = await this.addGame(game);
        if (success) addedCount++;
        await new Promise(r => setTimeout(r, 100)); // Rate limiting
      }

      console.log(`✅ Sync complete: ${addedCount}/${newGames.length} games added`);
      return { success: true, added: addedCount, checked: recentGames.length };
    } catch (error) {
      console.error('❌ Sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  async fetchFromIGDB(daysBack, limit) {
    const timestamp = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60);

    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${TWITCH_ACCESS_TOKEN}`,
        'Content-Type': 'text/plain'
      },
      body: `fields name, summary, first_release_date, rating, cover.url, genres.name, platforms.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher; where updated_at > ${timestamp}; sort updated_at desc; limit ${limit};`
    });

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status}`);
    }

    return response.json();
  }

  async checkExisting(igdbIds) {
    const { data } = await supabase
      .from('game')
      .select('igdb_id')
      .in('igdb_id', igdbIds);

    return new Set(data?.map(g => g.igdb_id) || []);
  }

  async addGame(igdbGame) {
    const gameData = {
      game_id: igdbGame.id.toString(),
      igdb_id: igdbGame.id,
      name: igdbGame.name,
      slug: igdbGame.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      summary: igdbGame.summary || null,
      release_date: igdbGame.first_release_date
        ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
        : null,
      igdb_rating: igdbGame.rating ? Math.round(parseFloat(igdbGame.rating)) : null,
      cover_url: igdbGame.cover?.url?.replace('t_thumb', 't_cover_big').replace('//', 'https://') || null,
      genre: igdbGame.genres?.[0]?.name || null,
      genres: igdbGame.genres?.map(g => g.name) || null,
      developer: igdbGame.involved_companies?.find(c => c.developer)?.company?.name || null,
      platforms: igdbGame.platforms?.map(p => p.name) || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('game').insert([gameData]);
    return !error;
  }
}

// CLI execution
const args = process.argv.slice(2);
const options = {
  daysBack: 7,
  limit: 100
};

const daysIndex = args.indexOf('--days');
if (daysIndex >= 0 && args[daysIndex + 1]) {
  options.daysBack = parseInt(args[daysIndex + 1]);
}

const limitIndex = args.indexOf('--limit');
if (limitIndex >= 0 && args[limitIndex + 1]) {
  options.limit = parseInt(args[limitIndex + 1]);
}

async function main() {
  const syncService = new ProductionIGDBSync();
  const result = await syncService.syncNewGames(options);
  process.exit(result.success ? 0 : 1);
}

main();
```

**Step 3: Add GitHub Secrets**
In GitHub repo → Settings → Secrets and variables → Actions:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `TWITCH_CLIENT_ID`
- `TWITCH_APP_ACCESS_TOKEN`

**Step 4: Deploy**
```bash
git add .github/workflows/sync-igdb.yml scripts/sync-igdb-production.js
git commit -m "Add automated GitHub Actions sync"
git push
```

#### Cron Schedule Options
```yaml
'0 3 * * *'      # Daily at 3 AM UTC
'0 */6 * * *'    # Every 6 hours
'0 0 * * 0'      # Weekly on Sundays
'0 3 * * 1,4'    # Twice weekly: Mon/Thu at 3 AM
```

#### Pros
- ✅ **Completely free** (2,000 minutes/month)
- ✅ Better logging and monitoring
- ✅ Manual trigger via GitHub UI
- ✅ Artifact storage for logs
- ✅ Slack/Discord notifications possible
- ✅ No function timeouts (30 min default)

#### Cons
- ❌ Requires GitHub repo (already have)
- ❌ Slightly more complex setup
- ❌ Uses separate credentials store

---

### Option 3: Supabase Edge Functions + pg_cron (Advanced)
**Best for: Maximum control, database-native scheduling**

#### How It Works
Use Supabase's built-in `pg_cron` extension to schedule database operations.

#### Implementation Steps

**Step 1: Enable pg_cron Extension**
In Supabase Dashboard → Database → Extensions:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

**Step 2: Create Sync Function**
```sql
-- Function to trigger sync via HTTP request to your Netlify function
CREATE OR REPLACE FUNCTION trigger_igdb_sync()
RETURNS void AS $$
DECLARE
  response TEXT;
BEGIN
  -- Call Netlify function to perform sync
  SELECT content::TEXT INTO response
  FROM http((
    'POST',
    'https://your-app.netlify.app/.netlify/functions/igdb-sync',
    ARRAY[http_header('Content-Type', 'application/json')],
    'application/json',
    '{}'
  )::http_request);

  RAISE NOTICE 'Sync triggered: %', response;
END;
$$ LANGUAGE plpgsql;
```

**Step 3: Schedule the Function**
```sql
-- Run daily at 3 AM UTC
SELECT cron.schedule(
  'igdb-daily-sync',
  '0 3 * * *',
  'SELECT trigger_igdb_sync();'
);
```

#### Pros
- ✅ Database-native scheduling
- ✅ No external services required
- ✅ Direct database access
- ✅ Reliable execution

#### Cons
- ❌ Requires `pg_cron` extension (Supabase Pro: $25/month)
- ❌ More complex debugging
- ❌ Requires HTTP extension setup

---

## Recommended Implementation Timeline

### Phase 1: Quick Win (1 hour)
**Goal: Get automated sync running today**

1. ✅ Choose Option 2 (GitHub Actions) - free and reliable
2. ✅ Create `.github/workflows/sync-igdb.yml`
3. ✅ Create `scripts/sync-igdb-production.js`
4. ✅ Add GitHub secrets
5. ✅ Push and verify first run

### Phase 2: Monitoring (2 hours)
**Goal: Track sync health and results**

1. Create `logs/` directory for sync logs
2. Add logging to sync script:
   ```javascript
   const fs = require('fs');
   const logFile = `logs/sync-${Date.now()}.log`;
   console.log = (msg) => {
     fs.appendFileSync(logFile, msg + '\n');
     process.stdout.write(msg + '\n');
   };
   ```
3. Add Slack/Discord webhook for notifications:
   ```javascript
   async function notifySlack(message) {
     await fetch(process.env.SLACK_WEBHOOK_URL, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ text: message })
     });
   }
   ```

### Phase 3: Enhanced Coverage (4 hours)
**Goal: Fill coverage gaps with multi-strategy sync**

Add additional sync strategies to catch missing games:

**Strategy 1: Franchise-Based Sync**
```javascript
// Sync all games in popular franchises
const franchises = ['Zelda', 'Mario', 'Pokemon', 'Final Fantasy', 'Call of Duty'];
for (const franchise of franchises) {
  await syncFranchise(franchise);
}

async function syncFranchise(name) {
  const response = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: { /* auth headers */ },
    body: `fields *; where franchises.name ~ *"${name}"*; limit 500;`
  });
  // Add missing games...
}
```

**Strategy 2: Recent Releases Sync**
```javascript
// Sync games released in last 90 days
const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
const response = await fetch('https://api.igdb.com/v4/games', {
  method: 'POST',
  headers: { /* auth headers */ },
  body: `fields *; where first_release_date > ${ninetyDaysAgo} & category = 0; limit 500;`
});
```

**Strategy 3: Highly Anticipated Games**
```javascript
// Sync games with high hype count
const response = await fetch('https://api.igdb.com/v4/games', {
  method: 'POST',
  headers: { /* auth headers */ },
  body: `fields *; where hypes > 50; sort hypes desc; limit 500;`
});
```

### Phase 4: User-Driven Sync (Optional, 6 hours)
**Goal: Let users request missing games**

1. Add "Request Game" button to empty search results
2. Create game request queue table:
   ```sql
   CREATE TABLE game_requests (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id),
     game_name TEXT NOT NULL,
     igdb_id INTEGER,
     status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
3. Create request handler function
4. Process requests in daily sync job

---

## Monitoring and Maintenance

### Key Metrics to Track
1. **Sync Success Rate** - % of syncs that complete successfully
2. **Games Added Per Sync** - Trend over time
3. **Error Rate** - Failed game additions
4. **Coverage Growth** - Total games in DB over time

### Monitoring Dashboard (Supabase SQL)
```sql
-- Sync statistics view
CREATE OR REPLACE VIEW sync_stats AS
SELECT
  DATE(created_at) as sync_date,
  COUNT(*) as games_added,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as added_today
FROM game
GROUP BY DATE(created_at)
ORDER BY sync_date DESC
LIMIT 30;
```

### Alerting Rules
Set up alerts for:
- ❌ Sync fails 3 times in a row
- ❌ Zero games added for 7+ days
- ⚠️ Error rate > 10%
- ℹ️ Weekly summary report

---

## Cost Analysis

| Option | Setup Time | Monthly Cost | Pros | Cons |
|--------|-----------|--------------|------|------|
| **GitHub Actions** | 1 hour | **$0** | Free, reliable, great logs | Requires GitHub |
| **Netlify Scheduled** | 2 hours | $19 | Integrated, simple | Requires paid plan |
| **Supabase pg_cron** | 4 hours | $25 | Database-native | Complex, Pro plan |

**Recommendation: Start with GitHub Actions** (Option 2)
- Free forever
- Easy to set up
- Can migrate to Netlify later if needed

---

## Expected Results

### After 1 Week
- ✅ 350-500 new games synced
- ✅ Recent releases coverage improved
- ✅ Zero search slowdown (still database-only)

### After 1 Month
- ✅ 1,500-2,000 new games synced
- ✅ Coverage gaps reduced by 60%
- ✅ Consistent daily updates

### After 3 Months
- ✅ 4,500-6,000 new games synced
- ✅ 95%+ coverage of major releases
- ✅ User requests handled automatically

---

## Next Steps

1. **Review this plan** - Any concerns or questions?
2. **Choose automation option** - GitHub Actions recommended
3. **Set aside 1-2 hours** - Initial setup time
4. **Deploy and monitor** - Verify first sync runs successfully
5. **Iterate** - Add monitoring, enhance strategies over time

This approach gives you the benefits of IGDB API coverage WITHOUT slowing down your search. Best of both worlds!
