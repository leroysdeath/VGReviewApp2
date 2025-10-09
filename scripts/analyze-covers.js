#!/usr/bin/env node

/**
 * Analyze Cover URL Patterns in Database
 *
 * This script analyzes the game table to understand:
 * - How many games have cover_url vs null
 * - Patterns in URL formats
 * - When games were added (to identify sync issues)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeCoverUrls() {
  console.log('🔍 ANALYZING COVER URL PATTERNS\n');
  console.log('='.repeat(70) + '\n');

  // 1. Overall statistics
  console.log('📊 OVERALL STATISTICS\n');
  const { data: allGames, error: allError } = await supabase
    .from('game')
    .select('id, cover_url', { count: 'exact' });

  if (allError) {
    console.error('Error:', allError);
    return;
  }

  const totalGames = allGames.length;
  const gamesWithCovers = allGames.filter(g => g.cover_url !== null).length;
  const gamesMissingCovers = totalGames - gamesWithCovers;
  const percentWithCovers = ((gamesWithCovers / totalGames) * 100).toFixed(2);

  console.log(`Total games: ${totalGames.toLocaleString()}`);
  console.log(`Games WITH cover_url: ${gamesWithCovers.toLocaleString()} (${percentWithCovers}%)`);
  console.log(`Games MISSING cover_url: ${gamesMissingCovers.toLocaleString()} (${(100 - percentWithCovers).toFixed(2)}%)`);
  console.log('\n' + '='.repeat(70) + '\n');

  // 2. Sample games WITH covers
  console.log('✅ SAMPLE GAMES WITH COVER_URL (Working)\n');
  const { data: withCovers } = await supabase
    .from('game')
    .select('id, igdb_id, name, cover_url')
    .not('cover_url', 'is', null)
    .limit(5);

  withCovers?.forEach(game => {
    const urlType = game.cover_url.startsWith('http') ? 'Full URL' :
                    game.cover_url.startsWith('//') ? 'Protocol-relative' : 'Other';
    console.log(`${game.name}`);
    console.log(`  ID: ${game.id}, IGDB ID: ${game.igdb_id}`);
    console.log(`  Type: ${urlType}`);
    console.log(`  URL: ${game.cover_url.substring(0, 80)}${game.cover_url.length > 80 ? '...' : ''}`);
    console.log('');
  });

  console.log('='.repeat(70) + '\n');

  // 3. Sample games WITHOUT covers
  console.log('❌ SAMPLE GAMES WITHOUT COVER_URL (Broken)\n');
  const { data: withoutCovers } = await supabase
    .from('game')
    .select('id, igdb_id, name, cover_url, created_at, updated_at')
    .is('cover_url', null)
    .limit(10);

  withoutCovers?.forEach(game => {
    console.log(`${game.name}`);
    console.log(`  ID: ${game.id}, IGDB ID: ${game.igdb_id}`);
    console.log(`  Created: ${game.created_at ? new Date(game.created_at).toLocaleDateString() : 'Unknown'}`);
    console.log(`  Updated: ${game.updated_at ? new Date(game.updated_at).toLocaleDateString() : 'Unknown'}`);
    console.log('');
  });

  console.log('='.repeat(70) + '\n');

  // 4. URL format patterns
  console.log('🔗 URL FORMAT ANALYSIS\n');
  const urlPatterns = {
    'Full HTTPS': allGames.filter(g => g.cover_url?.startsWith('https://')).length,
    'Full HTTP': allGames.filter(g => g.cover_url?.startsWith('http://')).length,
    'Protocol-relative': allGames.filter(g => g.cover_url?.startsWith('//')).length,
    'Relative path': allGames.filter(g => g.cover_url?.startsWith('/') && !g.cover_url?.startsWith('//')).length,
    'NULL': gamesMissingCovers
  };

  Object.entries(urlPatterns).forEach(([pattern, count]) => {
    const percent = ((count / totalGames) * 100).toFixed(2);
    console.log(`${pattern.padEnd(25)} ${count.toString().padStart(8)} (${percent}%)`);
  });

  console.log('\n' + '='.repeat(70) + '\n');

  // 5. Check specific OOT Master Quest game from console logs
  console.log('🎯 CHECKING SPECIFIC GAME: OOT Master Quest Bundle\n');
  const { data: ootGames } = await supabase
    .from('game')
    .select('id, igdb_id, name, cover_url, summary')
    .or('id.eq.338788,igdb_id.eq.237895,name.ilike.%master quest%bundle%');

  if (ootGames && ootGames.length > 0) {
    ootGames.forEach(game => {
      console.log(`Name: ${game.name}`);
      console.log(`  DB ID: ${game.id}`);
      console.log(`  IGDB ID: ${game.igdb_id}`);
      console.log(`  Cover URL: ${game.cover_url || 'NULL ❌'}`);
      console.log(`  Has Summary: ${game.summary ? 'Yes' : 'No'}`);
      console.log('');
    });
  } else {
    console.log('Game not found in database');
  }

  console.log('='.repeat(70) + '\n');

  // 6. Sample URL structures for analysis
  console.log('📸 SAMPLE COVER URL STRUCTURES\n');
  const { data: sampleUrls } = await supabase
    .from('game')
    .select('name, cover_url')
    .not('cover_url', 'is', null)
    .limit(3);

  sampleUrls?.forEach(game => {
    console.log(`${game.name}:`);
    console.log(`  ${game.cover_url}\n`);
  });

  console.log('='.repeat(70));
}

analyzeCoverUrls().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
