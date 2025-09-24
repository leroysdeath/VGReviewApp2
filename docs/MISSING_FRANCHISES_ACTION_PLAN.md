# Missing Franchises Database Action Plan

## Overview
This document identifies key gaming franchises that lack proper documentation and/or database coverage, along with an action plan to add and verify their presence in the VGReviewApp2 database.

## Missing Nintendo Franchises (4)

### 1. **Star Fox**
- **Status**: No dedicated documentation file, unknown database coverage
- **Notable Games**: Star Fox, Star Fox 64, Star Fox Adventures, Star Fox Assault, Star Fox Zero
- **Priority**: HIGH - Major Nintendo franchise

### 2. **Xenoblade Chronicles**
- **Status**: No dedicated documentation file, unknown database coverage
- **Notable Games**: Xenoblade Chronicles, Xenoblade Chronicles X, Xenoblade Chronicles 2, Xenoblade Chronicles 3
- **Priority**: HIGH - Major modern Nintendo RPG franchise

### 3. **Splatoon**
- **Status**: No dedicated documentation file, unknown database coverage
- **Notable Games**: Splatoon, Splatoon 2, Splatoon 3
- **Priority**: HIGH - Major Nintendo multiplayer franchise

### 4. **EarthBound/Mother**
- **Status**: No dedicated documentation file, unknown database coverage
- **Notable Games**: EarthBound Beginnings (Mother), EarthBound (Mother 2), Mother 3
- **Priority**: MEDIUM - Cult classic franchise

## Missing Square Enix & Related Franchises (15)

### 1. **Secret of Mana/Seiken Densetsu**
- **Status**: Missing documentation and low database coverage
- **Notable Games**: Secret of Mana, Trials of Mana, Legend of Mana, Dawn of Mana, Children of Mana
- **Priority**: HIGH - Classic action RPG series

### 2. **Drakengard**
- **Status**: Missing documentation and database coverage
- **Notable Games**: Drakengard, Drakengard 2, Drakengard 3
- **Priority**: MEDIUM - Predecessor to Nier series

### 3. **Just Cause**
- **Status**: Missing documentation and database coverage
- **Notable Games**: Just Cause, Just Cause 2, Just Cause 3, Just Cause 4
- **Priority**: HIGH - Major open-world action franchise

### 4. **Outriders**
- **Status**: Missing documentation and database coverage
- **Notable Games**: Outriders, Outriders Worldslayer
- **Priority**: LOW - Recent franchise with limited entries

### 5. **The World Ends with You**
- **Status**: Missing documentation and database coverage
- **Notable Games**: The World Ends with You, NEO: The World Ends with You
- **Priority**: MEDIUM - Cult classic JRPG series

### 6. **Bravely Default**
- **Status**: Missing documentation and database coverage
- **Notable Games**: Bravely Default, Bravely Second, Bravely Default II
- **Priority**: MEDIUM - Modern Square Enix JRPG series

### 7. **Trials of Mana**
- **Status**: Missing as separate documentation (part of Mana series)
- **Notable Games**: Trials of Mana (original), Trials of Mana (2020 remake)
- **Priority**: MEDIUM - Part of larger Mana franchise

### 8. **Live A Live**
- **Status**: Missing documentation and database coverage
- **Notable Games**: Live A Live (1994), Live A Live (2022 remake)
- **Priority**: LOW - Recently localized classic

### 9. **Romancing SaGa**
- **Status**: Missing documentation and database coverage
- **Notable Games**: Romancing SaGa, Romancing SaGa 2, Romancing SaGa 3, Romancing SaGa: Minstrel Song
- **Priority**: MEDIUM - Long-running JRPG series

### 10. **Valkyrie Profile**
- **Status**: Missing documentation and database coverage
- **Notable Games**: Valkyrie Profile, Valkyrie Profile 2: Silmeria, Valkyrie Profile: Covenant of the Plume
- **Priority**: MEDIUM - Classic JRPG series

### 11. **Parasite Eve**
- **Status**: Missing documentation and database coverage
- **Notable Games**: Parasite Eve, Parasite Eve II, The 3rd Birthday
- **Priority**: MEDIUM - Classic survival horror RPG

### 12. **Xenogears**
- **Status**: Missing documentation and database coverage
- **Notable Games**: Xenogears, Xenosaga series (spiritual successor)
- **Priority**: MEDIUM - Classic PS1 JRPG

### 13. **Star Ocean**
- **Status**: Missing documentation and database coverage
- **Notable Games**: Star Ocean, Star Ocean: Till the End of Time, Star Ocean: The Last Hope, Star Ocean: The Divine Force
- **Priority**: HIGH - Major JRPG franchise

### 14. **Front Mission**
- **Status**: Missing documentation and database coverage
- **Notable Games**: Front Mission series (1-5), Front Mission Evolved, Left Alive
- **Priority**: MEDIUM - Tactical RPG series

### 15. **Vagrant Story**
- **Status**: Missing documentation and database coverage
- **Notable Games**: Vagrant Story (standalone title)
- **Priority**: LOW - Single game franchise

### 16. **Legacy of Kain**
- **Status**: Missing documentation and database coverage
- **Notable Games**: Blood Omen: Legacy of Kain, Soul Reaver, Soul Reaver 2, Blood Omen 2, Defiance
- **Priority**: MEDIUM - Classic action-adventure series

## Database Verification & Addition Action Plan

### Phase 1: Database Audit (Week 1)

#### Step 1.1: Query Existing Coverage
```sql
-- Check current coverage for each franchise
WITH franchise_check AS (
  SELECT
    'Star Fox' as franchise,
    COUNT(*) as game_count
  FROM game
  WHERE name ILIKE '%star fox%' OR name ILIKE '%starfox%'

  UNION ALL

  SELECT 'Xenoblade', COUNT(*)
  FROM game
  WHERE name ILIKE '%xenoblade%'

  UNION ALL

  SELECT 'Splatoon', COUNT(*)
  FROM game
  WHERE name ILIKE '%splatoon%'

  -- Continue for all franchises...
)
SELECT * FROM franchise_check
ORDER BY game_count DESC;
```

#### Step 1.2: Generate Missing Games List
```javascript
// scripts/audit-missing-franchises.js
const missingFranchises = [
  {
    name: 'Star Fox',
    igdbQuery: 'fields *; where name ~ *"Star Fox"*; limit 50;',
    expectedGames: ['Star Fox', 'Star Fox 64', 'Star Fox Adventures']
  },
  {
    name: 'Xenoblade',
    igdbQuery: 'fields *; where name ~ *"Xenoblade"*; limit 50;',
    expectedGames: ['Xenoblade Chronicles', 'Xenoblade Chronicles 2', 'Xenoblade Chronicles 3']
  },
  // ... continue for all franchises
];

async function auditFranchise(franchise) {
  // Query IGDB for all games
  const igdbGames = await queryIGDB(franchise.igdbQuery);

  // Check which are in database
  const dbGames = await supabase
    .from('game')
    .select('igdb_id, name')
    .ilike('name', `%${franchise.name.replace(' ', '%')}%`);

  // Find missing games
  const missing = igdbGames.filter(game =>
    !dbGames.data?.some(dbGame => dbGame.igdb_id === game.id)
  );

  return { franchise: franchise.name, missing };
}
```

### Phase 2: IGDB Sync Enhancement (Week 2)

#### Step 2.1: Create Franchise-Specific Sync
```javascript
// scripts/sync-franchise.js
const franchiseQueries = {
  'star-fox': {
    query: 'fields *; where franchise.name = "Star Fox" | name ~ *"Star Fox"*; limit 100;',
    validate: (game) => game.name.toLowerCase().includes('star fox') || game.name.toLowerCase().includes('starfox')
  },
  'xenoblade': {
    query: 'fields *; where collection.name ~ *"Xenoblade"* | franchise.name ~ *"Xenoblade"*; limit 100;',
    validate: (game) => game.name.toLowerCase().includes('xenoblade')
  },
  'mana': {
    query: 'fields *; where franchise.name = "Mana" | collection.name = "Mana" | name ~ *"Mana"*; limit 100;',
    validate: (game) => game.name.includes('Mana') || game.name.includes('Seiken Densetsu')
  },
  'star-ocean': {
    query: 'fields *; where franchise.name = "Star Ocean" | name ~ *"Star Ocean"*; limit 100;',
    validate: (game) => game.name.includes('Star Ocean')
  },
  'legacy-of-kain': {
    query: 'fields *; where franchise.name = "Legacy of Kain" | name ~ *"Legacy of Kain"* | name ~ *"Soul Reaver"*; limit 100;',
    validate: (game) => game.name.includes('Kain') || game.name.includes('Soul Reaver')
  }
};

async function syncFranchise(franchiseName) {
  const config = franchiseQueries[franchiseName];
  if (!config) {
    console.error(`No configuration for franchise: ${franchiseName}`);
    return;
  }

  console.log(`🎮 Syncing ${franchiseName} franchise...`);

  // Query IGDB
  const games = await igdbService.customQuery(config.query);

  // Validate and filter
  const validGames = games.filter(config.validate);

  console.log(`Found ${validGames.length} games for ${franchiseName}`);

  // Add to database
  for (const game of validGames) {
    await addGameToDatabase(game);
  }

  return validGames.length;
}
```

#### Step 2.2: Batch Import Script
```bash
# Create batch import script
cat > scripts/import-missing-franchises.sh << 'EOF'
#!/bin/bash

echo "🎮 Starting franchise import..."

# Nintendo franchises
node scripts/sync-franchise.js star-fox
node scripts/sync-franchise.js xenoblade
node scripts/sync-franchise.js splatoon
node scripts/sync-franchise.js earthbound

# Square Enix franchises
node scripts/sync-franchise.js mana
node scripts/sync-franchise.js drakengard
node scripts/sync-franchise.js just-cause
node scripts/sync-franchise.js star-ocean
node scripts/sync-franchise.js valkyrie-profile
node scripts/sync-franchise.js front-mission
node scripts/sync-franchise.js bravely-default
node scripts/sync-franchise.js parasite-eve
node scripts/sync-franchise.js xenogears
node scripts/sync-franchise.js legacy-of-kain

echo "✅ Franchise import complete!"
EOF

chmod +x scripts/import-missing-franchises.sh
```

### Phase 3: Documentation Generation (Week 3)

#### Step 3.1: Create Franchise Documentation Files
```javascript
// scripts/generate-franchise-docs.js
const franchiseTemplates = {
  'Star_Fox': {
    title: 'Star Fox Series',
    description: 'Space combat franchise featuring Fox McCloud',
    mainGenres: ['Rail Shooter', 'Space Combat', 'Action'],
    platforms: ['Nintendo'],
    firstGame: 'Star Fox (1993)',
    latestGame: 'Star Fox Zero (2016)'
  },
  // ... templates for each franchise
};

async function generateFranchiseDoc(franchiseName) {
  const template = franchiseTemplates[franchiseName];
  const games = await getGamesFromDatabase(franchiseName);

  const markdown = `# ${template.title} - Complete Game List

## Overview
${template.description}

- **First Game**: ${template.firstGame}
- **Latest Game**: ${template.latestGame}
- **Main Genres**: ${template.mainGenres.join(', ')}
- **Primary Platforms**: ${template.platforms.join(', ')}
- **Total Games in Database**: ${games.length}

## Complete Game List

### Main Series
${games.filter(g => !g.name.includes('DLC')).map(g =>
  `- **${g.name}** (${g.release_date?.substring(0,4) || 'TBA'})`
).join('\n')}

### Spin-offs & Related
${games.filter(g => g.name.includes('spin')).map(g =>
  `- ${g.name} (${g.release_date?.substring(0,4) || 'TBA'})`
).join('\n')}

## Database Statistics
- Total Games: ${games.length}
- Years Covered: ${getYearRange(games)}
- Platforms: ${getUniquePlatforms(games).join(', ')}

## Notes
- Last Updated: ${new Date().toISOString().split('T')[0]}
- Data Source: IGDB via automated sync
`;

  // Write to file
  fs.writeFileSync(`franchises/${franchiseName}_Complete_List.md`, markdown);
}
```

### Phase 4: Database Enhancement (Week 4)

#### Step 4.1: Update Franchise Metadata
```sql
-- Add franchise information to existing games
UPDATE game
SET franchise_name = 'Star Fox',
    franchise = 'Star Fox'
WHERE name ILIKE '%star fox%' OR name ILIKE '%starfox%';

UPDATE game
SET franchise_name = 'Xenoblade Chronicles',
    franchise = 'Xenoblade'
WHERE name ILIKE '%xenoblade%';

-- Continue for all franchises...
```

#### Step 4.2: Create Franchise Collection View
```sql
CREATE OR REPLACE VIEW franchise_summary AS
SELECT
  COALESCE(franchise_name,
    CASE
      WHEN name ILIKE '%star fox%' THEN 'Star Fox'
      WHEN name ILIKE '%xenoblade%' THEN 'Xenoblade Chronicles'
      WHEN name ILIKE '%splatoon%' THEN 'Splatoon'
      -- Add all franchise patterns
      ELSE 'Unassigned'
    END
  ) as franchise,
  COUNT(*) as game_count,
  MIN(release_date) as first_release,
  MAX(release_date) as latest_release,
  ARRAY_AGG(DISTINCT unnest(platforms)) as all_platforms
FROM game
GROUP BY franchise
ORDER BY game_count DESC;
```

## Success Criteria

### Immediate Goals (2 weeks)
- [ ] All 19 missing franchises have database queries run
- [ ] At least 80% of known games per franchise are in database
- [ ] Franchise sync scripts are tested and working

### Short-term Goals (1 month)
- [ ] All missing franchises have documentation files
- [ ] Database contains 95%+ of mainline games for each franchise
- [ ] Franchise metadata fields are populated

### Long-term Goals (3 months)
- [ ] Automated weekly franchise sync running
- [ ] Complete coverage including DLC and expansions
- [ ] Franchise pages on frontend displaying all games

## Monitoring & Validation

```javascript
// Validation script to run after import
async function validateFranchiseCoverage() {
  const expectedCoverage = {
    'Star Fox': 10,      // Expected minimum games
    'Xenoblade': 7,
    'Splatoon': 3,
    'Star Ocean': 8,
    'Mana': 15,
    'Legacy of Kain': 5,
    // ... etc
  };

  for (const [franchise, expectedMin] of Object.entries(expectedCoverage)) {
    const { count } = await supabase
      .from('game')
      .select('*', { count: 'exact', head: true })
      .ilike('name', `%${franchise}%`);

    if (count < expectedMin) {
      console.warn(`⚠️ ${franchise}: Only ${count} games (expected ${expectedMin}+)`);
    } else {
      console.log(`✅ ${franchise}: ${count} games found`);
    }
  }
}
```

## Resources Required
- IGDB API access for comprehensive game data
- Developer time: ~4 weeks for full implementation
- Database storage: ~1MB additional for new games
- Documentation maintenance: Ongoing updates for new releases

## Risk Mitigation
- **API Rate Limits**: Implement throttling and caching
- **Data Quality**: Manual review of imported games
- **Duplicate Prevention**: Check IGDB IDs before import
- **Version Control**: Backup database before bulk imports