# Bulk Game Import System - Implementation Plan

## Overview
A safe, rate-limited system to import specific games from IGDB by ID into your Supabase database.

---

## API & Database Limits

### IGDB API Constraints (Verified 2024)
- **Rate Limit**: 4 requests per second
- **Concurrent Limit**: Maximum 8 simultaneous requests
- **Query Limit**: 500 results per request maximum
- **Recommended**: 3 req/sec with delays to stay under limit
- **Penalty**: 429 Too Many Requests (temporary ban)

### Supabase Database Constraints
- **Statement Timeout**: 30 seconds (you're experiencing this)
- **Connection Pooling**: Limited concurrent connections
- **Batch Insert**: Recommended 50-100 records per batch
- **RLS Overhead**: Row Level Security adds query time

### Safe Operating Parameters
```
IGDB API:
- 3 requests/second (safer than 4)
- 250ms delay between requests
- 50 games per batch request
- 10 second timeout per request

Supabase:
- 50 games per insert batch
- 5 second timeout per batch
- Check for duplicates in memory first
- Use upsert for safety
```

---

## System Architecture

### Option 1: CLI Script (Recommended for Manual Use)
```
scripts/import-games-by-id.cjs

Features:
- Accept game IDs via file, arguments, or stdin
- Rate limiting (3 req/sec)
- Progress tracking
- Retry logic for failures
- Dry-run mode
- Duplicate detection
```

### Option 2: Background Service (Future Enhancement)
```
src/services/bulkImportService.ts

Features:
- Queue system for pending imports
- Scheduled batch processing
- Status tracking per game
- Admin UI integration
```

---

## Implementation Plan - Phase 1: CLI Script

### File Structure
```
scripts/
  ├── import-games-by-id.cjs        # Main import script
  ├── game-ids/
  │   ├── pikmin-series.txt         # Curated lists
  │   ├── switch-ports.txt
  │   ├── n64-classics.txt
  │   └── template.txt
  └── import-games-by-id.md         # Documentation
```

### Script Features

#### 1. Input Methods
```bash
# Method A: From file
node scripts/import-games-by-id.cjs --file scripts/game-ids/pikmin-series.txt

# Method B: Direct IDs
node scripts/import-games-by-id.cjs --ids 1638,2239,119171

# Method C: Interactive (search then import)
node scripts/import-games-by-id.cjs --interactive

# Method D: From STDIN
echo "1638\n2239" | node scripts/import-games-by-id.cjs --stdin
```

#### 2. Safety Controls
```bash
# Dry run (show what would be imported)
node scripts/import-games-by-id.cjs --file games.txt --dry-run

# Limit batch size
node scripts/import-games-by-id.cjs --file games.txt --batch-size 25

# Adjust rate limit (default: 3 req/sec)
node scripts/import-games-by-id.cjs --file games.txt --rate-limit 2

# Skip duplicates check (faster but may error)
node scripts/import-games-by-id.cjs --file games.txt --skip-dup-check
```

#### 3. Progress Tracking
```
🎮 Bulk Game Import Starting...

📊 Summary:
   - Total IDs: 150
   - Checking for duplicates...
   - Found 42 already in database
   - Will import: 108 new games

🔄 Processing in batches of 50...

Batch 1/3 (50 games):
   Fetching from IGDB... ⏳
   ✅ Fetched 50 games in 16.7s (3 req/sec)
   💾 Inserting to database...
   ✅ Inserted 50 games successfully

Batch 2/3 (50 games):
   Fetching from IGDB... ⏳
   ✅ Fetched 50 games in 16.8s
   💾 Inserting to database...
   ✅ Inserted 48 games (2 duplicates skipped)

Batch 3/3 (8 games):
   Fetching from IGDB... ⏳
   ✅ Fetched 8 games in 2.7s
   💾 Inserting to database...
   ✅ Inserted 8 games successfully

✅ Import Complete!
   📊 Total: 150 IDs processed
   ✅ Successfully imported: 106 games
   ⚠️  Skipped (duplicates): 42 games
   ❌ Failed: 2 games

Failed IDs:
   - 999999 (Not found in IGDB)
   - 888888 (Invalid game data)

⏱️  Total time: 52.3 seconds
📈 Rate: 2.03 games/second
```

---

## Code Architecture

### Class Structure
```javascript
class BulkGameImporter {
  constructor(options) {
    this.rateLimit = options.rateLimit || 3; // req/sec
    this.batchSize = options.batchSize || 50;
    this.dryRun = options.dryRun || false;
    this.delay = 1000 / this.rateLimit;
  }

  async import(gameIds) {
    // 1. Validate IDs
    // 2. Check for duplicates
    // 3. Split into batches
    // 4. Process each batch
    // 5. Report results
  }

  async fetchBatchFromIGDB(ids) {
    // Rate-limited IGDB fetch
    // Returns game data
  }

  async insertBatchToDatabase(games) {
    // Batch insert with duplicate handling
    // Returns success/failure counts
  }

  async checkDuplicates(ids) {
    // Query DB for existing igdb_ids
    // Returns array of existing IDs
  }
}
```

### Rate Limiting Implementation
```javascript
class RateLimiter {
  constructor(requestsPerSecond = 3) {
    this.delay = 1000 / requestsPerSecond;
    this.lastRequest = 0;
    this.queue = [];
    this.activeRequests = 0;
    this.maxConcurrent = 4; // Lower than IGDB's 8 for safety
  }

  async throttle(fn) {
    // Wait for rate limit
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < this.delay) {
      await sleep(this.delay - timeSinceLastRequest);
    }

    // Wait for concurrent slot
    while (this.activeRequests >= this.maxConcurrent) {
      await sleep(100);
    }

    this.lastRequest = Date.now();
    this.activeRequests++;

    try {
      return await fn();
    } finally {
      this.activeRequests--;
    }
  }
}
```

### IGDB Query Optimization
```javascript
// Fetch multiple games in single request (up to 500)
async function fetchGamesByIds(ids) {
  const idsString = ids.join(',');

  const query = `
    fields name, summary, slug, first_release_date, rating,
           cover.url, genres.name, platforms.name, platforms.id,
           involved_companies.company.name,
           involved_companies.developer,
           involved_companies.publisher,
           category;
    where id = (${idsString});
    limit ${ids.length};
  `;

  // This fetches up to 500 games in ONE request
  return await igdbRequest(query);
}
```

### Database Batch Insert with Safety
```javascript
async function insertGames(games) {
  const BATCH_SIZE = 50;
  const results = { success: 0, failed: 0, duplicates: 0 };

  for (let i = 0; i < games.length; i += BATCH_SIZE) {
    const batch = games.slice(i, i + BATCH_SIZE);

    try {
      // Use upsert to handle duplicates gracefully
      const { data, error } = await supabase
        .from('game')
        .upsert(batch, {
          onConflict: 'igdb_id',
          ignoreDuplicates: true
        })
        .select();

      if (error) {
        console.error(`Batch ${i}-${i+BATCH_SIZE} failed:`, error);
        results.failed += batch.length;
      } else {
        results.success += data.length;
        results.duplicates += batch.length - data.length;
      }

      // Small delay between batches to avoid overwhelming DB
      await sleep(500);

    } catch (err) {
      console.error(`Batch insert error:`, err);
      results.failed += batch.length;
    }
  }

  return results;
}
```

---

## Curated Game ID Lists

### Pikmin Series
```txt
# scripts/game-ids/pikmin-series.txt
# Pikmin games for import

# Main series
2239      # Pikmin (GameCube)
1656      # Pikmin 2 (GameCube)
11266     # Pikmin 3 (Wii U)
147320    # Pikmin 3 Deluxe (Switch)
113073    # Pikmin 4 (Switch)

# Ports & Remasters
27744     # New Play Control! Pikmin (Wii)
27745     # New Play Control! Pikmin 2 (Wii)
119171    # Pikmin 1+2 (Switch) - IF IT EXISTS
```

### N64 Classics
```txt
# scripts/game-ids/n64-classics.txt
1638      # GoldenEye 007
1074      # The Legend of Zelda: Ocarina of Time
1193      # Super Mario 64
1036      # Mario Kart 64
1009      # Star Fox 64
2551      # Banjo-Kazooie
1030      # Perfect Dark
```

### Switch Ports (Category 11)
```txt
# scripts/game-ids/switch-ports.txt
# Major Switch ports that were previously filtered

# Will need to identify these from IGDB
# Can generate this list via:
# where platforms = 130 & category = 11; limit 500;
```

---

## Usage Examples

### Example 1: Import Specific Games
```bash
# Create a file with game IDs
cat > my-games.txt <<EOF
1638   # GoldenEye 007
2239   # Pikmin
1656   # Pikmin 2
EOF

# Dry run first
node scripts/import-games-by-id.cjs --file my-games.txt --dry-run

# Actual import
node scripts/import-games-by-id.cjs --file my-games.txt
```

### Example 2: Import Entire Franchise
```bash
# Use curated list
node scripts/import-games-by-id.cjs --file scripts/game-ids/pikmin-series.txt

# Or search and import
node scripts/import-games-by-id.cjs --search "pikmin" --limit 20
```

### Example 3: Import Missing Switch Ports
```bash
# Generate list of Switch ports from IGDB
node scripts/find-switch-ports.cjs > switch-ports.txt

# Import them
node scripts/import-games-by-id.cjs --file switch-ports.txt --batch-size 100
```

---

## Error Handling & Recovery

### Retry Strategy
```javascript
async function fetchWithRetry(ids, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchGamesByIds(ids);
    } catch (error) {
      if (error.status === 429) {
        // Rate limited - exponential backoff
        const backoff = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Rate limited, waiting ${backoff}ms...`);
        await sleep(backoff);
      } else if (attempt === maxRetries) {
        throw error;
      }
    }
  }
}
```

### Progress Persistence
```javascript
// Save progress to file
function saveProgress(state) {
  fs.writeFileSync('.import-progress.json', JSON.stringify(state));
}

// Resume from file
function loadProgress() {
  if (fs.existsSync('.import-progress.json')) {
    return JSON.parse(fs.readFileSync('.import-progress.json'));
  }
  return null;
}

// Usage
node scripts/import-games-by-id.cjs --file games.txt --resume
```

---

## Testing Strategy

### Test Modes
```bash
# 1. Dry run (no API calls, no DB writes)
node scripts/import-games-by-id.cjs --ids 1638 --dry-run

# 2. Fetch only (test IGDB API)
node scripts/import-games-by-id.cjs --ids 1638 --fetch-only

# 3. Insert only (test DB with existing data)
node scripts/import-games-by-id.cjs --file test-data.json --insert-only

# 4. Small batch test (1-5 games)
node scripts/import-games-by-id.cjs --ids 1638,2239 --verbose
```

### Validation
- ✅ Verify game data completeness (name, slug, required fields)
- ✅ Check for duplicate detection accuracy
- ✅ Confirm rate limiting (should take ~16.7s per 50 games)
- ✅ Test error handling (invalid IDs, network failures)
- ✅ Verify database constraints (unique slugs, foreign keys)

---

## Performance Estimates

### Import Time Calculator
```
Games to import: N
Batch size: 50
Rate limit: 3 req/sec

Batches needed: ceil(N / 50)
IGDB fetch time: (50 / 3) = 16.7 seconds per batch
DB insert time: ~1-2 seconds per batch

Total time per batch: ~18-19 seconds
Total time: (N / 50) * 19 seconds

Examples:
- 100 games:  ~38 seconds
- 500 games:  ~3 minutes
- 1000 games: ~6 minutes
- 5000 games: ~30 minutes
```

### Throughput Limits
```
Maximum safe throughput:
- Per minute: ~180 games (3 req/sec * 60 sec)
- Per hour: ~10,800 games
- Per day: ~259,200 games

Practical throughput (with overhead):
- Per minute: ~150 games
- Per hour: ~9,000 games
```

---

## Phase 2: Future Enhancements (Optional)

### 1. Interactive Mode
```bash
node scripts/import-games-by-id.cjs --interactive

> Search for games: pikmin
> Found 20 results. Select games to import:
  [x] 1. Pikmin (GameCube)
  [x] 2. Pikmin 2 (GameCube)
  [ ] 3. Pikmin Puzzle Card...
  [x] 4. Pikmin 3 Deluxe (Switch)

> Import 3 selected games? (y/n): y
> Importing...
```

### 2. Smart Discovery
```javascript
// Find related games automatically
node scripts/import-games-by-id.cjs --franchise "pikmin" --include-dlc

// Find all games by developer
node scripts/import-games-by-id.cjs --developer "Rare" --platforms n64

// Find missing ports
node scripts/import-games-by-id.cjs --find-ports --base-game 2239
```

### 3. Admin UI Integration
- Web interface for bulk imports
- Upload CSV/JSON with game IDs
- Real-time progress tracking
- Import history and rollback

---

## Security & Safety

### Input Validation
```javascript
function validateGameId(id) {
  const parsed = parseInt(id);
  if (isNaN(parsed) || parsed < 1 || parsed > 1000000000) {
    throw new Error(`Invalid game ID: ${id}`);
  }
  return parsed;
}
```

### Database Protection
- Use transactions where possible
- Implement rollback on critical failures
- Log all operations for audit trail
- Rate limit DB operations separately from API

### Error Boundaries
- Fail one batch without stopping entire import
- Collect failed IDs for retry
- Save partial progress
- Graceful degradation

---

## Monitoring & Logging

### Log Levels
```
INFO:  High-level progress
DEBUG: Detailed operation info
WARN:  Recoverable issues
ERROR: Failures requiring attention

# Enable verbose logging
node scripts/import-games-by-id.cjs --file games.txt --verbose
```

### Metrics to Track
- Total games processed
- Success/failure rate
- Average processing time per game
- API rate limit hits (should be 0)
- Database errors
- Duplicate detection accuracy

---

## Next Steps to Implement

1. ✅ Review and approve this plan
2. 🔄 Create `scripts/import-games-by-id.cjs` with core functionality
3. 🔄 Add rate limiting class
4. 🔄 Implement batch processing
5. 🔄 Add CLI argument parsing
6. 🔄 Create curated game ID lists
7. 🔄 Test with small batch (5-10 games)
8. 🔄 Test with medium batch (50-100 games)
9. 🔄 Document usage in README
10. 🔄 Optional: Create helper script to search/discover IDs

**Estimated Development Time**: 2-3 hours for basic version

---

## Questions to Resolve

1. **Priority game lists**: Which game collections do you want to import first?
   - [ ] N64 classics
   - [ ] Switch ports
   - [ ] Pikmin series
   - [ ] Specific franchises

2. **Import strategy**: One-time bulk import or ongoing tool?
   - [ ] One-time to fill gaps
   - [ ] Recurring tool for community requests
   - [ ] Both

3. **UI preferences**: CLI only or future admin panel?
   - [ ] CLI is fine
   - [ ] Want web UI eventually

4. **Discovery tools**: Need help finding game IDs?
   - [ ] Yes, create search helper
   - [ ] No, I'll provide lists

---

**Status**: 📋 Plan Complete - Ready for Implementation
**Next Action**: Get approval, then start coding `import-games-by-id.cjs`
