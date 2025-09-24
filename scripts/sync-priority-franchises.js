#!/usr/bin/env node

/**
 * Priority Franchise Sync Script
 *
 * This script targets the 4 franchises identified in Phase 1 audit as requiring immediate attention:
 * 1. Xenogears (0% coverage - CRITICAL)
 * 2. Front Mission (50% coverage)
 * 3. Secret of Mana (50% coverage)
 * 4. Live A Live (50% coverage)
 *
 * Run with: node scripts/sync-priority-franchises.js
 * Dry run: node scripts/sync-priority-franchises.js --dry-run
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const isDryRun = process.argv.includes('--dry-run');

// Priority franchises with specific IGDB query patterns
const priorityFranchises = [
  {
    name: 'Xenogears',
    priority: 'CRITICAL',
    currentCoverage: 0,
    igdbQueries: [
      {
        query: 'fields id,name,slug,summary,first_release_date,genres.*,platforms.*,cover.*,franchises.*,collection.*; where name = "Xenogears";',
        description: 'Exact match for Xenogears'
      }
    ],
    expectedGames: ['Xenogears'],
    notes: 'Classic PS1 JRPG, completely missing from database'
  },
  {
    name: 'Front Mission',
    priority: 'HIGH',
    currentCoverage: 50,
    igdbQueries: [
      {
        query: 'fields id,name,slug,summary,first_release_date,genres.*,platforms.*,cover.*,franchises.*,collection.*; where name ~ *"Front Mission"* & category = (0,1,2,8,9); limit 20;',
        description: 'All Front Mission games'
      },
      {
        query: 'fields id,name,slug,summary,first_release_date,genres.*,platforms.*,cover.*,franchises.*,collection.*; where franchise.name = "Front Mission"; limit 20;',
        description: 'Games in Front Mission franchise'
      }
    ],
    expectedGames: ['Front Mission', 'Front Mission 2', 'Front Mission 3', 'Front Mission 4', 'Front Mission 5', 'Front Mission Evolved'],
    notes: 'Tactical RPG series, missing entries 4, 5, and Evolved'
  },
  {
    name: 'Secret of Mana / Mana Series',
    priority: 'HIGH',
    currentCoverage: 50,
    igdbQueries: [
      {
        query: 'fields id,name,slug,summary,first_release_date,genres.*,platforms.*,cover.*,franchises.*,collection.*; where franchise.name = "Mana" | collection.name = "Mana"; limit 30;',
        description: 'Mana franchise and collection'
      },
      {
        query: 'fields id,name,slug,summary,first_release_date,genres.*,platforms.*,cover.*,franchises.*,collection.*; where name = "Secret of Mana" | name = "Dawn of Mana" | name = "Children of Mana" | name = "Heroes of Mana" | name = "Sword of Mana"; limit 20;',
        description: 'Specific missing Mana titles'
      },
      {
        query: 'fields id,name,slug,summary,first_release_date,genres.*,platforms.*,cover.*,franchises.*,collection.*; where name ~ *"Seiken Densetsu"*; limit 20;',
        description: 'Japanese title variations'
      }
    ],
    expectedGames: ['Secret of Mana', 'Dawn of Mana', 'Children of Mana', 'Heroes of Mana', 'Sword of Mana', 'Adventures of Mana'],
    notes: 'Classic action RPG series, missing several key titles'
  },
  {
    name: 'Live A Live',
    priority: 'MEDIUM',
    currentCoverage: 50,
    igdbQueries: [
      {
        query: 'fields id,name,slug,summary,first_release_date,genres.*,platforms.*,cover.*,franchises.*,collection.*; where name ~ *"Live A Live"* | name ~ *"Live-A-Live"*; limit 10;',
        description: 'Live A Live games including remake'
      }
    ],
    expectedGames: ['Live A Live', 'Live A Live (2022)'],
    notes: 'Recently localized classic, missing 2022 remake'
  }
];

// IGDB API configuration
const IGDB_API_URL = 'https://api.igdb.com/v4/games';
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_ACCESS_TOKEN = process.env.TWITCH_APP_ACCESS_TOKEN;

async function queryIGDB(query) {
  if (!TWITCH_CLIENT_ID || !TWITCH_ACCESS_TOKEN) {
    console.error('❌ Missing IGDB API credentials');
    return [];
  }

  try {
    const response = await fetch(IGDB_API_URL, {
      method: 'POST',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${TWITCH_ACCESS_TOKEN}`,
        'Content-Type': 'text/plain'
      },
      body: query
    });

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error querying IGDB:', error);
    return [];
  }
}

async function syncFranchise(franchise) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎮 Processing: ${franchise.name}`);
  console.log(`   Priority: ${franchise.priority}`);
  console.log(`   Current Coverage: ${franchise.currentCoverage}%`);
  console.log(`${'='.repeat(80)}\n`);

  const allGames = new Map(); // Use Map to deduplicate by IGDB ID

  // Execute all queries for this franchise
  for (const queryConfig of franchise.igdbQueries) {
    console.log(`📡 Executing query: ${queryConfig.description}`);

    if (isDryRun) {
      console.log(`   [DRY RUN] Would execute: ${queryConfig.query.substring(0, 100)}...`);
    } else {
      const games = await queryIGDB(queryConfig.query);
      console.log(`   Found ${games.length} games`);

      // Add to collection, deduplicating by ID
      games.forEach(game => {
        allGames.set(game.id, game);
      });
    }
  }

  if (!isDryRun && allGames.size > 0) {
    console.log(`\n📊 Total unique games found: ${allGames.size}`);
    console.log('\nGames to add:');

    const gamesToAdd = Array.from(allGames.values());
    gamesToAdd.forEach(game => {
      const releaseYear = game.first_release_date
        ? new Date(game.first_release_date * 1000).getFullYear()
        : 'TBA';

      const platforms = game.platforms
        ? game.platforms.map(p => p.abbreviation || p.name).join(', ')
        : 'Unknown';

      console.log(`   - ${game.name} (${releaseYear}) [${platforms}]`);
    });

    // Check for expected games
    console.log('\n🔍 Coverage Check:');
    franchise.expectedGames.forEach(expectedGame => {
      const found = gamesToAdd.some(game =>
        game.name.toLowerCase().includes(expectedGame.toLowerCase()) ||
        expectedGame.toLowerCase().includes(game.name.toLowerCase())
      );

      console.log(`   ${found ? '✅' : '❌'} ${expectedGame}`);
    });
  }

  return allGames;
}

async function generateSyncReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    isDryRun,
    franchises: results.map(result => ({
      name: result.franchise.name,
      priority: result.franchise.priority,
      previousCoverage: result.franchise.currentCoverage,
      gamesFound: result.games.size,
      expectedGames: result.franchise.expectedGames,
      gameList: Array.from(result.games.values()).map(g => ({
        id: g.id,
        name: g.name,
        releaseDate: g.first_release_date ? new Date(g.first_release_date * 1000).toISOString() : null
      }))
    })),
    summary: {
      totalFranchises: results.length,
      totalGamesFound: results.reduce((sum, r) => sum + r.games.size, 0),
      criticalFranchises: results.filter(r => r.franchise.priority === 'CRITICAL').length,
      highPriorityFranchises: results.filter(r => r.franchise.priority === 'HIGH').length
    }
  };

  const reportPath = path.join(__dirname, `priority-franchise-sync-report-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);

  return report;
}

async function main() {
  console.log('🚀 Priority Franchise Sync Script');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE SYNC'}`);
  console.log(`Target: ${priorityFranchises.length} priority franchises\n`);

  const results = [];

  for (const franchise of priorityFranchises) {
    const games = await syncFranchise(franchise);
    results.push({ franchise, games });

    // Add a small delay between API calls to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate summary report
  const report = await generateSyncReport(results);

  console.log('\n' + '='.repeat(80));
  console.log('SYNC SUMMARY');
  console.log('='.repeat(80));
  console.log(`Franchises processed: ${report.summary.totalFranchises}`);
  console.log(`Total games found: ${report.summary.totalGamesFound}`);
  console.log(`Critical franchises: ${report.summary.criticalFranchises}`);
  console.log(`High priority franchises: ${report.summary.highPriorityFranchises}`);

  if (!isDryRun && report.summary.totalGamesFound > 0) {
    console.log('\n⚠️  Next Steps:');
    console.log('1. Review the games list above');
    console.log('2. Run the main sync script to add these games to the database:');
    console.log('   npm run sync-igdb');
    console.log('3. Or use the sync-franchise.js script with specific franchise names');
  }

  console.log('\n✅ Priority franchise sync complete!');
}

// Execute
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});