import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const franchisesToAudit = [
  // Nintendo franchises
  {
    name: 'Star Fox',
    searchPatterns: ['%star fox%', '%starfox%'],
    expectedMinGames: 10,
    notableGames: ['Star Fox', 'Star Fox 64', 'Star Fox Adventures', 'Star Fox Assault', 'Star Fox Zero']
  },
  {
    name: 'Xenoblade Chronicles',
    searchPatterns: ['%xenoblade%'],
    expectedMinGames: 7,
    notableGames: ['Xenoblade Chronicles', 'Xenoblade Chronicles X', 'Xenoblade Chronicles 2', 'Xenoblade Chronicles 3']
  },
  {
    name: 'Splatoon',
    searchPatterns: ['%splatoon%'],
    expectedMinGames: 3,
    notableGames: ['Splatoon', 'Splatoon 2', 'Splatoon 3']
  },
  {
    name: 'EarthBound/Mother',
    searchPatterns: ['%earthbound%', '%mother%'],
    expectedMinGames: 3,
    notableGames: ['EarthBound Beginnings', 'EarthBound', 'Mother 3']
  },

  // Square Enix franchises
  {
    name: 'Secret of Mana/Seiken Densetsu',
    searchPatterns: ['%mana%', '%seiken densetsu%'],
    expectedMinGames: 10,
    notableGames: ['Secret of Mana', 'Trials of Mana', 'Legend of Mana', 'Dawn of Mana', 'Children of Mana']
  },
  {
    name: 'Drakengard',
    searchPatterns: ['%drakengard%', '%drag-on dragoon%'],
    expectedMinGames: 3,
    notableGames: ['Drakengard', 'Drakengard 2', 'Drakengard 3']
  },
  {
    name: 'Just Cause',
    searchPatterns: ['%just cause%'],
    expectedMinGames: 4,
    notableGames: ['Just Cause', 'Just Cause 2', 'Just Cause 3', 'Just Cause 4']
  },
  {
    name: 'Outriders',
    searchPatterns: ['%outriders%'],
    expectedMinGames: 2,
    notableGames: ['Outriders', 'Outriders Worldslayer']
  },
  {
    name: 'The World Ends with You',
    searchPatterns: ['%world ends with you%', '%TWEWY%'],
    expectedMinGames: 2,
    notableGames: ['The World Ends with You', 'NEO: The World Ends with You']
  },
  {
    name: 'Bravely Default',
    searchPatterns: ['%bravely%'],
    expectedMinGames: 3,
    notableGames: ['Bravely Default', 'Bravely Second', 'Bravely Default II']
  },
  {
    name: 'Live A Live',
    searchPatterns: ['%live a live%', '%live-a-live%'],
    expectedMinGames: 2,
    notableGames: ['Live A Live (1994)', 'Live A Live (2022)']
  },
  {
    name: 'Romancing SaGa',
    searchPatterns: ['%romancing saga%', '%romancing sa・ga%'],
    expectedMinGames: 5,
    notableGames: ['Romancing SaGa', 'Romancing SaGa 2', 'Romancing SaGa 3', 'Romancing SaGa: Minstrel Song']
  },
  {
    name: 'Valkyrie Profile',
    searchPatterns: ['%valkyrie profile%', '%valkyrie%'],
    expectedMinGames: 3,
    notableGames: ['Valkyrie Profile', 'Valkyrie Profile 2: Silmeria', 'Valkyrie Profile: Covenant of the Plume']
  },
  {
    name: 'Parasite Eve',
    searchPatterns: ['%parasite eve%', '%3rd birthday%'],
    expectedMinGames: 3,
    notableGames: ['Parasite Eve', 'Parasite Eve II', 'The 3rd Birthday']
  },
  {
    name: 'Xenogears',
    searchPatterns: ['%xenogears%'],
    expectedMinGames: 1,
    notableGames: ['Xenogears']
  },
  {
    name: 'Star Ocean',
    searchPatterns: ['%star ocean%'],
    expectedMinGames: 8,
    notableGames: ['Star Ocean', 'Star Ocean: Till the End of Time', 'Star Ocean: The Last Hope', 'Star Ocean: The Divine Force']
  },
  {
    name: 'Front Mission',
    searchPatterns: ['%front mission%'],
    expectedMinGames: 6,
    notableGames: ['Front Mission', 'Front Mission 2', 'Front Mission 3', 'Front Mission 4', 'Front Mission 5', 'Front Mission Evolved']
  },
  {
    name: 'Vagrant Story',
    searchPatterns: ['%vagrant story%'],
    expectedMinGames: 1,
    notableGames: ['Vagrant Story']
  },
  {
    name: 'Legacy of Kain',
    searchPatterns: ['%legacy of kain%', '%soul reaver%', '%blood omen%'],
    expectedMinGames: 5,
    notableGames: ['Blood Omen: Legacy of Kain', 'Legacy of Kain: Soul Reaver', 'Soul Reaver 2', 'Blood Omen 2', 'Legacy of Kain: Defiance']
  }
];

async function checkFranchiseCoverage(franchise) {
  try {
    // Build the query to check for games matching any pattern
    let query = supabase.from('game').select('id, name, igdb_id, release_date', { count: 'exact' });

    // For multiple patterns, we need to use OR conditions
    if (franchise.searchPatterns.length === 1) {
      query = query.ilike('name', franchise.searchPatterns[0]);
    } else {
      // Build OR query string
      const orConditions = franchise.searchPatterns
        .map(pattern => `name.ilike.${pattern}`)
        .join(',');
      query = query.or(orConditions);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error(`Error checking ${franchise.name}:`, error);
      return null;
    }

    // Check for notable games
    const foundNotableGames = [];
    const missingNotableGames = [];

    for (const notableGame of franchise.notableGames) {
      const found = data.some(game =>
        game.name.toLowerCase().includes(notableGame.toLowerCase()) ||
        notableGame.toLowerCase().includes(game.name.toLowerCase())
      );

      if (found) {
        foundNotableGames.push(notableGame);
      } else {
        missingNotableGames.push(notableGame);
      }
    }

    return {
      franchise: franchise.name,
      gameCount: count,
      expectedMin: franchise.expectedMinGames,
      status: count >= franchise.expectedMinGames ? '✅' : '⚠️',
      coverage: Math.round((count / franchise.expectedMinGames) * 100),
      foundNotableGames,
      missingNotableGames,
      games: data
    };
  } catch (error) {
    console.error(`Error processing ${franchise.name}:`, error);
    return null;
  }
}

async function generateAuditReport() {
  console.log('🎮 Starting Franchise Database Audit...\n');
  console.log('=' .repeat(80));

  const results = [];
  const summary = {
    totalFranchises: franchisesToAudit.length,
    fullyCovered: 0,
    partiallyCovered: 0,
    poorlyCovered: 0,
    totalGamesFound: 0,
    totalGamesExpected: 0
  };

  for (const franchise of franchisesToAudit) {
    process.stdout.write(`Checking ${franchise.name}...`);
    const result = await checkFranchiseCoverage(franchise);

    if (result) {
      results.push(result);
      summary.totalGamesFound += result.gameCount;
      summary.totalGamesExpected += result.expectedMin;

      if (result.coverage >= 100) {
        summary.fullyCovered++;
      } else if (result.coverage >= 50) {
        summary.partiallyCovered++;
      } else {
        summary.poorlyCovered++;
      }

      console.log(` ${result.status} ${result.gameCount}/${result.expectedMin} games (${result.coverage}%)`);
    } else {
      console.log(' ❌ Error');
    }
  }

  // Print detailed report
  console.log('\n' + '=' .repeat(80));
  console.log('DETAILED FRANCHISE REPORT');
  console.log('=' .repeat(80) + '\n');

  // Sort by coverage percentage
  results.sort((a, b) => a.coverage - b.coverage);

  for (const result of results) {
    console.log(`\n📦 ${result.franchise}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Games in DB: ${result.gameCount}`);
    console.log(`   Expected Min: ${result.expectedMin}`);
    console.log(`   Coverage: ${result.coverage}%`);

    if (result.foundNotableGames.length > 0) {
      console.log(`   ✅ Found Notable: ${result.foundNotableGames.join(', ')}`);
    }

    if (result.missingNotableGames.length > 0) {
      console.log(`   ❌ Missing Notable: ${result.missingNotableGames.join(', ')}`);
    }
  }

  // Print summary
  console.log('\n' + '=' .repeat(80));
  console.log('SUMMARY');
  console.log('=' .repeat(80));
  console.log(`Total Franchises Audited: ${summary.totalFranchises}`);
  console.log(`✅ Fully Covered (100%+): ${summary.fullyCovered}`);
  console.log(`⚠️  Partially Covered (50-99%): ${summary.partiallyCovered}`);
  console.log(`❌ Poorly Covered (<50%): ${summary.poorlyCovered}`);
  console.log(`\nTotal Games Found: ${summary.totalGamesFound}`);
  console.log(`Total Games Expected (minimum): ${summary.totalGamesExpected}`);
  console.log(`Overall Coverage: ${Math.round((summary.totalGamesFound / summary.totalGamesExpected) * 100)}%`);

  // Generate JSON report
  const reportData = {
    timestamp: new Date().toISOString(),
    summary,
    franchises: results
  };

  const reportPath = path.join(__dirname, 'franchise-audit-report.json');
  await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  // Generate priority list for sync
  const priorityList = results
    .filter(r => r.coverage < 100)
    .sort((a, b) => a.coverage - b.coverage)
    .slice(0, 10);

  console.log('\n' + '=' .repeat(80));
  console.log('TOP 10 FRANCHISES NEEDING ATTENTION');
  console.log('=' .repeat(80));

  priorityList.forEach((franchise, index) => {
    console.log(`${index + 1}. ${franchise.franchise} - ${franchise.gameCount}/${franchise.expectedMin} games (${franchise.coverage}%)`);
  });

  return reportData;
}

// Run the audit
generateAuditReport()
  .then(() => {
    console.log('\n✅ Audit complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running audit:', error);
    process.exit(1);
  });