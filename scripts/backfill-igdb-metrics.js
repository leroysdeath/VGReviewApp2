#!/usr/bin/env node

/**
 * IGDB Metrics Backfill Script
 * 
 * Purpose: Populate the new IGDB metrics columns (total_rating, rating_count, follows, hypes)
 * for existing games in the database that are missing these metrics.
 * 
 * Features:
 * - Rate limiting to respect IGDB API limits
 * - Batch processing for efficiency
 * - Progress tracking and resumption
 * - Comprehensive logging
 * - Dry run mode for testing
 * - Error handling and retry logic
 * 
 * Usage:
 *   node scripts/backfill-igdb-metrics.js [options]
 * 
 * Options:
 *   --dry-run, -d     Don't make changes, just show what would be done
 *   --batch-size=N    Number of games to process per batch (default: 50)
 *   --rate-limit=N    Requests per minute (default: 100, max: 240)
 *   --start-from=N    Game ID to start from (for resuming)
 *   --limit=N         Maximum number of games to process
 *   --help, -h        Show help
 */

import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Make fetch global
global.fetch = fetch;

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

// Rate limiting configuration
class RateLimiter {
  constructor(requestsPerMinute = 100) {
    this.requestsPerMinute = Math.min(requestsPerMinute, 240); // IGDB limit is 4 req/sec = 240/min
    this.interval = 60000 / this.requestsPerMinute; // ms between requests
    this.lastRequest = 0;
  }

  async wait() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    const waitTime = Math.max(0, this.interval - timeSinceLastRequest);
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequest = Date.now();
  }
}

// Main backfill service
class IGDBMetricsBackfillService {
  constructor(options = {}) {
    this.options = {
      dryRun: false,
      batchSize: 50,
      rateLimit: 100,
      startFrom: null,
      limit: null,
      ...options
    };
    
    this.rateLimiter = new RateLimiter(this.options.rateLimit);
    this.stats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
  }

  async run() {
    console.log('🚀 IGDB Metrics Backfill Starting');
    console.log(`📊 Mode: ${this.options.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`📦 Batch size: ${this.options.batchSize}`);
    console.log(`⏱️  Rate limit: ${this.options.rateLimit} requests/minute`);
    console.log(`🎯 Start from ID: ${this.options.startFrom || 'beginning'}`);
    console.log(`🔢 Limit: ${this.options.limit || 'no limit'}`);
    console.log('');

    try {
      // Step 1: Get completion stats before starting
      const initialStats = await this.getCompletionStats();
      console.log('📊 Initial Statistics:');
      console.log(`   Total games: ${initialStats.total_games}`);
      console.log(`   Games with metrics: ${initialStats.games_with_metrics}`);
      console.log(`   Games missing metrics: ${initialStats.games_missing_metrics}`);
      console.log(`   Completion: ${initialStats.completion_percentage}%`);
      console.log('');

      if (initialStats.games_missing_metrics === 0) {
        console.log('✅ All games already have metrics! Nothing to backfill.');
        return this.stats;
      }

      // Step 2: Process games in batches
      let processedCount = 0;
      let currentOffset = 0;
      
      while (true) {
        // Get batch of games missing metrics
        const games = await this.getGamesMissingMetrics(currentOffset);
        
        if (games.length === 0) {
          console.log('✅ No more games to process');
          break;
        }

        console.log(`\n📦 Processing batch ${Math.floor(currentOffset / this.options.batchSize) + 1} (${games.length} games)`);
        
        // Process each game in the batch
        for (const game of games) {
          if (this.options.limit && processedCount >= this.options.limit) {
            console.log(`🛑 Reached limit of ${this.options.limit} games`);
            break;
          }

          await this.processGame(game);
          processedCount++;
          this.stats.totalProcessed++;

          // Progress indicator
          if (this.stats.totalProcessed % 10 === 0) {
            console.log(`   ⏳ Processed ${this.stats.totalProcessed} games...`);
          }
        }

        if (this.options.limit && processedCount >= this.options.limit) {
          break;
        }

        currentOffset += this.options.batchSize;
      }

      // Step 3: Final statistics
      const finalStats = await this.getCompletionStats();
      console.log('\n📊 Final Statistics:');
      console.log(`   Total games: ${finalStats.total_games}`);
      console.log(`   Games with metrics: ${finalStats.games_with_metrics}`);
      console.log(`   Completion: ${finalStats.completion_percentage}%`);
      console.log(`   Improvement: +${(finalStats.completion_percentage - initialStats.completion_percentage).toFixed(2)}%`);
      console.log('');

      // Step 4: Summary
      console.log('✅ Backfill Complete!');
      console.log(`📊 Processed: ${this.stats.totalProcessed}`);
      console.log(`✅ Successful: ${this.stats.successful}`);
      console.log(`❌ Failed: ${this.stats.failed}`);
      console.log(`⏭️  Skipped: ${this.stats.skipped}`);

      if (this.stats.errors.length > 0) {
        console.log('\n⚠️  Errors encountered:');
        this.stats.errors.slice(0, 5).forEach(error => {
          console.log(`   ${error}`);
        });
        if (this.stats.errors.length > 5) {
          console.log(`   ... and ${this.stats.errors.length - 5} more`);
        }
      }

      return this.stats;

    } catch (error) {
      console.error('💥 Fatal error during backfill:', error);
      throw error;
    }
  }

  async getCompletionStats() {
    const { data, error } = await supabase.rpc('get_metrics_completion_stats');
    
    if (error) {
      console.error('Failed to get completion stats:', error);
      return { total_games: 0, games_with_metrics: 0, games_missing_metrics: 0, completion_percentage: 0 };
    }
    
    return data[0] || { total_games: 0, games_with_metrics: 0, games_missing_metrics: 0, completion_percentage: 0 };
  }

  async getGamesMissingMetrics(offset = 0) {
    let query = supabase
      .from('game')
      .select('id, igdb_id, name')
      .or('total_rating.is.null,rating_count.eq.0,follows.eq.0') // Missing any metrics
      .order('id')
      .range(offset, offset + this.options.batchSize - 1);

    if (this.options.startFrom) {
      query = query.gte('id', this.options.startFrom);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching games:', error);
      return [];
    }

    return data || [];
  }

  async processGame(game) {
    try {
      console.log(`  🎮 ${game.name} (ID: ${game.id}, IGDB: ${game.igdb_id})`);

      // Rate limiting
      await this.rateLimiter.wait();

      // Fetch metrics from IGDB
      const igdbData = await this.fetchIGDBMetrics(game.igdb_id);
      
      if (!igdbData) {
        console.log(`    ⏭️  No IGDB data found`);
        this.stats.skipped++;
        return;
      }

      // Calculate popularity score
      const popularityScore = this.calculatePopularityScore(
        igdbData.follows || 0,
        igdbData.hypes || 0,
        igdbData.rating_count || 0
      );

      const metricsData = {
        total_rating: igdbData.total_rating || null,
        rating_count: igdbData.rating_count || 0,
        follows: igdbData.follows || 0,
        hypes: igdbData.hypes || 0,
        popularity_score: popularityScore,
        updated_at: new Date().toISOString()
      };

      console.log(`    📊 Metrics: rating=${metricsData.total_rating}, reviews=${metricsData.rating_count}, follows=${metricsData.follows}, hypes=${metricsData.hypes}, popularity=${metricsData.popularity_score}`);

      if (!this.options.dryRun) {
        // Update the database
        const { error } = await supabase
          .from('game')
          .update(metricsData)
          .eq('id', game.id);

        if (error) {
          console.log(`    ❌ Database error: ${error.message}`);
          this.stats.failed++;
          this.stats.errors.push(`Game ${game.id}: ${error.message}`);
          return;
        }
      }

      console.log(`    ✅ ${this.options.dryRun ? 'Would update' : 'Updated'}`);
      this.stats.successful++;

    } catch (error) {
      console.log(`    💥 Error: ${error.message}`);
      this.stats.failed++;
      this.stats.errors.push(`Game ${game.id}: ${error.message}`);
    }
  }

  async fetchIGDBMetrics(igdbId) {
    try {
      const requestBody = `fields id, total_rating, rating_count, follows, hypes; where id = ${igdbId};`;
      
      const response = await fetch('/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isBulkRequest: true,
          endpoint: 'games',
          requestBody
        })
      });

      if (!response.ok) {
        throw new Error(`IGDB API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data || data.data.length === 0) {
        return null;
      }

      return data.data[0];

    } catch (error) {
      console.log(`    ⚠️  IGDB fetch failed: ${error.message}`);
      return null;
    }
  }

  calculatePopularityScore(follows = 0, hypes = 0, ratingCount = 0) {
    // Weighted popularity formula: follows (60%) + hypes (30%) + rating_count*10 (10%)
    return Math.round(
      (follows * 0.6) +
      (hypes * 0.3) +
      (ratingCount * 10 * 0.1)
    );
  }
}

// CLI argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    batchSize: 50,
    rateLimit: 100,
    startFrom: null,
    limit: null
  };

  for (const arg of args) {
    if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--rate-limit=')) {
      options.rateLimit = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--start-from=')) {
      options.startFrom = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1]);
    }
  }

  return options;
}

function showHelp() {
  console.log(`
IGDB Metrics Backfill Script

Purpose: Populate IGDB metrics for existing games missing these fields.

Usage:
  node scripts/backfill-igdb-metrics.js [options]

Options:
  --dry-run, -d        Don't make changes, just show what would be done
  --batch-size=N       Number of games to process per batch (default: 50)
  --rate-limit=N       Requests per minute (default: 100, max: 240)
  --start-from=N       Game ID to start from (for resuming)
  --limit=N            Maximum number of games to process
  --help, -h           Show this help

Examples:
  # Dry run to see what would be done
  node scripts/backfill-igdb-metrics.js --dry-run

  # Process 25 games at a time with slower rate limiting
  node scripts/backfill-igdb-metrics.js --batch-size=25 --rate-limit=60

  # Resume from game ID 1000, process up to 500 games
  node scripts/backfill-igdb-metrics.js --start-from=1000 --limit=500

Environment Variables Required:
  VITE_SUPABASE_URL      - Your Supabase project URL
  VITE_SUPABASE_ANON_KEY - Your Supabase anonymous key
`);
}

// Main execution
async function main() {
  try {
    const options = parseArgs();
    const backfillService = new IGDBMetricsBackfillService(options);
    await backfillService.run();
    process.exit(0);
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}