#!/usr/bin/env node

/**
 * Database Coverage Analysis Script
 * Analyzes game database coverage compared to IGDB
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeCoverage() {
  console.log('\n📊 DATABASE COVERAGE ANALYSIS');
  console.log('═'.repeat(60));

  try {
    // 1. Total games
    console.log('\n📈 TOTAL GAMES:');
    const { count: totalGames, error: totalError } = await supabase
      .from('game')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;
    console.log(`   Database: ${totalGames?.toLocaleString() || 0} games`);

    // 2. IGDB coverage
    console.log('\n🔗 IGDB INTEGRATION:');
    const { count: igdbGames, error: igdbError } = await supabase
      .from('game')
      .select('*', { count: 'exact', head: true })
      .not('igdb_id', 'is', null);

    if (igdbError) throw igdbError;
    const igdbPercentage = totalGames ? ((igdbGames / totalGames) * 100).toFixed(1) : 0;
    console.log(`   Games with IGDB ID: ${igdbGames?.toLocaleString() || 0} (${igdbPercentage}%)`);

    // 3. Recent games by year
    console.log('\n📅 GAMES BY YEAR (2020+):');
    const { data: recentGames, error: recentError } = await supabase
      .from('game')
      .select('release_date')
      .gte('release_date', '2020-01-01')
      .order('release_date', { ascending: false });

    if (recentError) throw recentError;

    const yearCounts = {};
    recentGames?.forEach(game => {
      if (game.release_date) {
        const year = new Date(game.release_date).getFullYear();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });

    Object.keys(yearCounts).sort().reverse().forEach(year => {
      console.log(`   ${year}: ${yearCounts[year].toLocaleString()} games`);
    });

    // 4. Last import
    console.log('\n🕐 LAST IMPORT:');
    const { data: lastImport, error: lastError } = await supabase
      .from('game')
      .select('created_at')
      .not('igdb_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastError) throw lastError;

    if (lastImport?.[0]) {
      const lastDate = new Date(lastImport[0].created_at);
      const daysAgo = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   Date: ${lastDate.toLocaleDateString()} (${daysAgo} days ago)`);

      if (daysAgo > 7) {
        console.log(`   ⚠️  Database is ${daysAgo} days out of date!`);
      }
    }

    // 5. Games without covers
    console.log('\n🖼️  COVER IMAGES:');
    const { count: noCoverCount, error: noCoverError } = await supabase
      .from('game')
      .select('*', { count: 'exact', head: true })
      .is('cover_url', null);

    if (noCoverError) throw noCoverError;
    const coverPercentage = totalGames ? (((totalGames - noCoverCount) / totalGames) * 100).toFixed(1) : 0;
    console.log(`   Games with covers: ${(totalGames - noCoverCount)?.toLocaleString() || 0} (${coverPercentage}%)`);
    console.log(`   Games without covers: ${noCoverCount?.toLocaleString() || 0}`);

    // 6. Popular franchises
    console.log('\n🎮 TOP FRANCHISES (by game count):');
    const { data: franchiseGames, error: franchiseError } = await supabase
      .from('game')
      .select('franchises')
      .not('franchises', 'is', null);

    if (!franchiseError && franchiseGames) {
      const franchiseCounts = {};
      franchiseGames.forEach(game => {
        if (game.franchises && Array.isArray(game.franchises)) {
          game.franchises.forEach(franchise => {
            franchiseCounts[franchise] = (franchiseCounts[franchise] || 0) + 1;
          });
        }
      });

      const topFranchises = Object.entries(franchiseCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      topFranchises.forEach(([franchise, count], index) => {
        console.log(`   ${index + 1}. ${franchise}: ${count} games`);
      });
    }

    // 7. Analysis summary
    console.log('\n📋 SUMMARY:');
    console.log(`   ✅ Database contains ${totalGames?.toLocaleString()} games`);
    console.log(`   ✅ ${igdbPercentage}% have IGDB integration`);

    if (daysAgo > 30) {
      console.log(`   ⚠️  Last sync was ${daysAgo} days ago - backfill recommended`);
    }

    if (yearCounts['2024'] < 1000) {
      console.log(`   ⚠️  Only ${yearCounts['2024'] || 0} games from 2024 - may be missing recent releases`);
    }

    if (noCoverCount > totalGames * 0.05) {
      console.log(`   ⚠️  ${noCoverCount} games missing covers (${((noCoverCount / totalGames) * 100).toFixed(1)}%)`);
    }

    console.log('\n═'.repeat(60));
    console.log('✅ Analysis complete!\n');

  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

// Run analysis
analyzeCoverage();
