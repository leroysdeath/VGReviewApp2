/**
 * Game Database Audit System
 * Checks for missing popular games and IGDB ID conflicts
 */

import { supabase } from '../services/supabase';

interface AuditResult {
  missingGames: string[];
  idConflicts: Array<{
    gameId: number;
    gameName: string;
    igdbId: number;
    expectedGame: string;
  }>;
  duplicateIgdbIds: Array<{
    igdbId: number;
    games: Array<{ id: number; name: string }>;
  }>;
}

// List of popular games that should definitely be in the database
const MUST_HAVE_GAMES = [
  // 2024 Games
  { name: 'Helldivers 2', igdbId: 252616, year: 2024 },
  { name: 'Dragon\'s Dogma 2', igdbId: 106544, year: 2024 },
  { name: 'Tekken 8', igdbId: 135173, year: 2024 },
  { name: 'Palworld', igdbId: 252253, year: 2024 },
  { name: 'Black Myth: Wukong', igdbId: 119171, year: 2024 },

  // 2023 Major Releases
  { name: 'Street Fighter 6', igdbId: 134988, year: 2023 },
  { name: 'Baldur\'s Gate 3', igdbId: 119137, year: 2023 },
  { name: 'The Legend of Zelda: Tears of the Kingdom', igdbId: 119388, year: 2023 },
  { name: 'Hogwarts Legacy', igdbId: 119133, year: 2023 },
  { name: 'Diablo IV', igdbId: 103169, year: 2023 },
  { name: 'Starfield', igdbId: 119121, year: 2023 },
  { name: 'Mortal Kombat 1', igdbId: 209481, year: 2023 },
  { name: 'Spider-Man 2', igdbId: 119387, year: 2023 },
  { name: 'Alan Wake 2', igdbId: 136722, year: 2023 },
  { name: 'Resident Evil 4', igdbId: 142122, year: 2023 },

  // 2022 Major Games
  { name: 'Elden Ring', igdbId: 119133, year: 2022 },
  { name: 'God of War Ragnarök', igdbId: 135154, year: 2022 },
  { name: 'Horizon Forbidden West', igdbId: 119277, year: 2022 },

  // Fighting Games
  { name: 'Guilty Gear -Strive-', igdbId: 119591, year: 2021 },
  { name: 'The King of Fighters XV', igdbId: 134434, year: 2022 },

  // Known Conflicted IDs
  { name: 'Apex Legends', igdbId: 126459, year: 2019 },
];

/**
 * Audit the game database for missing popular games
 */
export async function auditGameDatabase(): Promise<AuditResult> {
  const result: AuditResult = {
    missingGames: [],
    idConflicts: [],
    duplicateIgdbIds: []
  };

  console.log('🔍 Starting game database audit...\n');

  // Step 1: Check for missing popular games
  console.log('📋 Checking for missing popular games...');
  for (const expectedGame of MUST_HAVE_GAMES) {
    const { data: gameByName } = await supabase
      .from('game')
      .select('id, igdb_id, name')
      .ilike('name', `%${expectedGame.name}%`)
      .limit(1)
      .single();

    const { data: gameById } = await supabase
      .from('game')
      .select('id, igdb_id, name')
      .eq('igdb_id', expectedGame.igdbId)
      .limit(1)
      .single();

    // Check if game is completely missing
    if (!gameByName && !gameById) {
      result.missingGames.push(`${expectedGame.name} (IGDB: ${expectedGame.igdbId})`);
      console.log(`❌ Missing: ${expectedGame.name}`);
    }
    // Check for ID conflicts
    else if (gameById && gameById.name !== expectedGame.name) {
      result.idConflicts.push({
        gameId: gameById.id,
        gameName: gameById.name,
        igdbId: expectedGame.igdbId,
        expectedGame: expectedGame.name
      });
      console.log(`⚠️ ID Conflict: IGDB ${expectedGame.igdbId} is ${gameById.name}, expected ${expectedGame.name}`);
    }
    // Game exists correctly
    else {
      console.log(`✅ Found: ${expectedGame.name}`);
    }
  }

  // Step 2: Check for duplicate IGDB IDs
  console.log('\n📋 Checking for duplicate IGDB IDs...');
  const { data: duplicates } = await supabase.rpc('find_duplicate_igdb_ids');

  if (duplicates && duplicates.length > 0) {
    for (const dup of duplicates) {
      const { data: games } = await supabase
        .from('game')
        .select('id, name')
        .eq('igdb_id', dup.igdb_id);

      if (games && games.length > 1) {
        result.duplicateIgdbIds.push({
          igdbId: dup.igdb_id,
          games: games
        });
        console.log(`⚠️ Duplicate IGDB ID ${dup.igdb_id}: ${games.map(g => g.name).join(', ')}`);
      }
    }
  }

  // Step 3: Summary
  console.log('\n📊 Audit Summary:');
  console.log(`- Missing games: ${result.missingGames.length}`);
  console.log(`- ID conflicts: ${result.idConflicts.length}`);
  console.log(`- Duplicate IDs: ${result.duplicateIgdbIds.length}`);

  return result;
}

/**
 * Generate SQL to fix identified issues
 */
export function generateFixSQL(audit: AuditResult): string {
  let sql = '-- Generated SQL to fix game database issues\n\n';

  // Fix ID conflicts
  if (audit.idConflicts.length > 0) {
    sql += '-- Fix IGDB ID conflicts\n';
    for (const conflict of audit.idConflicts) {
      sql += `-- ${conflict.gameName} currently has IGDB ID ${conflict.igdbId} which should belong to ${conflict.expectedGame}\n`;
      sql += `-- UPDATE game SET igdb_id = NULL WHERE id = ${conflict.gameId};\n\n`;
    }
  }

  // Add missing games
  if (audit.missingGames.length > 0) {
    sql += '-- Missing games that need to be fetched from IGDB\n';
    for (const game of audit.missingGames) {
      sql += `-- TODO: Fetch and insert ${game}\n`;
    }
  }

  return sql;
}

/**
 * Create RPC function for finding duplicate IGDB IDs (if not exists)
 */
export const CREATE_DUPLICATE_FINDER_RPC = `
CREATE OR REPLACE FUNCTION find_duplicate_igdb_ids()
RETURNS TABLE(igdb_id INTEGER, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT g.igdb_id, COUNT(*) as count
  FROM game g
  WHERE g.igdb_id IS NOT NULL
  GROUP BY g.igdb_id
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC, g.igdb_id;
END;
$$ LANGUAGE plpgsql;
`;