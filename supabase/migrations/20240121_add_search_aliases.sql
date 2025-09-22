-- Add search aliases column to game table for improved search matching
-- This will store alternative names/spellings for games (e.g., "Street Fighter 2" for "Street Fighter II")

-- Add search_aliases column as JSONB array
ALTER TABLE game
ADD COLUMN IF NOT EXISTS search_aliases JSONB DEFAULT '[]'::jsonb;

-- Create an index on search_aliases for better query performance
CREATE INDEX IF NOT EXISTS idx_game_search_aliases ON game USING GIN (search_aliases);

-- Add a generated column for full-text search that includes aliases
ALTER TABLE game
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('english',
    COALESCE(name, '') || ' ' ||
    COALESCE(summary, '') || ' ' ||
    COALESCE(search_aliases::text, '[]')
  )
) STORED;

-- Create index on search_vector for full-text search
CREATE INDEX IF NOT EXISTS idx_game_search_vector ON game USING GIN (search_vector);

-- Populate initial aliases for game with Roman numerals
-- This handles common patterns like II, III, IV, V, VI, etc.
UPDATE game SET search_aliases =
  CASE
    -- Street Fighter series
    WHEN name ILIKE '%Street Fighter II%' THEN '["Street Fighter 2", "SF2", "SFII"]'::jsonb
    WHEN name ILIKE '%Street Fighter III%' THEN '["Street Fighter 3", "SF3", "SFIII"]'::jsonb
    WHEN name ILIKE '%Street Fighter IV%' THEN '["Street Fighter 4", "SF4", "SFIV"]'::jsonb
    WHEN name ILIKE '%Street Fighter V%' AND name NOT ILIKE '%IV%' THEN '["Street Fighter 5", "SF5", "SFV"]'::jsonb
    WHEN name ILIKE '%Street Fighter VI%' THEN '["Street Fighter 6", "SF6", "SFVI"]'::jsonb

    -- Final Fantasy series
    WHEN name ILIKE '%Final Fantasy VII%' THEN '["Final Fantasy 7", "FF7", "FFVII"]'::jsonb
    WHEN name ILIKE '%Final Fantasy VIII%' THEN '["Final Fantasy 8", "FF8", "FFVIII"]'::jsonb
    WHEN name ILIKE '%Final Fantasy IX%' THEN '["Final Fantasy 9", "FF9", "FFIX"]'::jsonb
    WHEN name ILIKE '%Final Fantasy X%' AND name NOT ILIKE '%XI%' AND name NOT ILIKE '%XV%' THEN '["Final Fantasy 10", "FF10", "FFX"]'::jsonb
    WHEN name ILIKE '%Final Fantasy XI%' THEN '["Final Fantasy 11", "FF11", "FFXI"]'::jsonb
    WHEN name ILIKE '%Final Fantasy XII%' THEN '["Final Fantasy 12", "FF12", "FFXII"]'::jsonb
    WHEN name ILIKE '%Final Fantasy XIII%' THEN '["Final Fantasy 13", "FF13", "FFXIII"]'::jsonb
    WHEN name ILIKE '%Final Fantasy XIV%' THEN '["Final Fantasy 14", "FF14", "FFXIV"]'::jsonb
    WHEN name ILIKE '%Final Fantasy XV%' THEN '["Final Fantasy 15", "FF15", "FFXV"]'::jsonb
    WHEN name ILIKE '%Final Fantasy XVI%' THEN '["Final Fantasy 16", "FF16", "FFXVI"]'::jsonb

    -- Grand Theft Auto series
    WHEN name ILIKE '%Grand Theft Auto III%' THEN '["Grand Theft Auto 3", "GTA 3", "GTA III"]'::jsonb
    WHEN name ILIKE '%Grand Theft Auto IV%' THEN '["Grand Theft Auto 4", "GTA 4", "GTA IV"]'::jsonb
    WHEN name ILIKE '%Grand Theft Auto V%' THEN '["Grand Theft Auto 5", "GTA 5", "GTA V"]'::jsonb
    WHEN name ILIKE '%Grand Theft Auto VI%' THEN '["Grand Theft Auto 6", "GTA 6", "GTA VI"]'::jsonb

    -- Civilization series
    WHEN name ILIKE '%Civilization II%' THEN '["Civilization 2", "Civ 2", "Civ II"]'::jsonb
    WHEN name ILIKE '%Civilization III%' THEN '["Civilization 3", "Civ 3", "Civ III"]'::jsonb
    WHEN name ILIKE '%Civilization IV%' THEN '["Civilization 4", "Civ 4", "Civ IV"]'::jsonb
    WHEN name ILIKE '%Civilization V%' AND name NOT ILIKE '%VI%' THEN '["Civilization 5", "Civ 5", "Civ V"]'::jsonb
    WHEN name ILIKE '%Civilization VI%' THEN '["Civilization 6", "Civ 6", "Civ VI"]'::jsonb

    -- Age of Empires series
    WHEN name ILIKE '%Age of Empires II%' THEN '["Age of Empires 2", "AoE 2", "AoE II"]'::jsonb
    WHEN name ILIKE '%Age of Empires III%' THEN '["Age of Empires 3", "AoE 3", "AoE III"]'::jsonb
    WHEN name ILIKE '%Age of Empires IV%' THEN '["Age of Empires 4", "AoE 4", "AoE IV"]'::jsonb

    -- Dragon Quest series
    WHEN name ILIKE '%Dragon Quest II%' THEN '["Dragon Quest 2", "DQ2", "DQII"]'::jsonb
    WHEN name ILIKE '%Dragon Quest III%' THEN '["Dragon Quest 3", "DQ3", "DQIII"]'::jsonb
    WHEN name ILIKE '%Dragon Quest IV%' THEN '["Dragon Quest 4", "DQ4", "DQIV"]'::jsonb
    WHEN name ILIKE '%Dragon Quest V%' AND name NOT ILIKE '%VI%' THEN '["Dragon Quest 5", "DQ5", "DQV"]'::jsonb
    WHEN name ILIKE '%Dragon Quest VI%' THEN '["Dragon Quest 6", "DQ6", "DQVI"]'::jsonb
    WHEN name ILIKE '%Dragon Quest VII%' THEN '["Dragon Quest 7", "DQ7", "DQVII"]'::jsonb
    WHEN name ILIKE '%Dragon Quest VIII%' THEN '["Dragon Quest 8", "DQ8", "DQVIII"]'::jsonb
    WHEN name ILIKE '%Dragon Quest IX%' THEN '["Dragon Quest 9", "DQ9", "DQIX"]'::jsonb
    WHEN name ILIKE '%Dragon Quest X%' AND name NOT ILIKE '%XI%' THEN '["Dragon Quest 10", "DQ10", "DQX"]'::jsonb
    WHEN name ILIKE '%Dragon Quest XI%' THEN '["Dragon Quest 11", "DQ11", "DQXI"]'::jsonb

    -- Diablo series
    WHEN name ILIKE '%Diablo II%' THEN '["Diablo 2", "D2"]'::jsonb
    WHEN name ILIKE '%Diablo III%' THEN '["Diablo 3", "D3"]'::jsonb
    WHEN name ILIKE '%Diablo IV%' THEN '["Diablo 4", "D4"]'::jsonb

    -- Quake series
    WHEN name ILIKE '%Quake II%' THEN '["Quake 2"]'::jsonb
    WHEN name ILIKE '%Quake III%' THEN '["Quake 3"]'::jsonb
    WHEN name ILIKE '%Quake IV%' THEN '["Quake 4"]'::jsonb

    -- Battlefield series
    WHEN name = 'Battlefield V' THEN '["Battlefield 5", "BF5", "BFV"]'::jsonb

    -- Keep existing aliases if already set
    ELSE search_aliases
  END
WHERE name SIMILAR TO '%.*(II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI).*%'
  AND (search_aliases IS NULL OR search_aliases = '[]'::jsonb);

-- Add comment to explain the column purpose
COMMENT ON COLUMN game.search_aliases IS 'Alternative names and spellings for improved search matching (e.g., numeric vs Roman numeral variations)';

-- Create a function to search game with aliases
CREATE OR REPLACE FUNCTION search_games_with_aliases(search_query TEXT, max_results INTEGER DEFAULT 100)
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  summary TEXT,
  rating NUMERIC,
  cover_image_id TEXT,
  release_date DATE,
  developer TEXT,
  publisher TEXT,
  genres TEXT[],
  platforms TEXT[],
  search_aliases JSONB,
  match_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH direct_matches AS (
    -- Direct name matches (highest priority)
    SELECT
      g.id,
      g.name,
      g.summary,
      g.rating,
      g.cover_image_id,
      g.release_date,
      g.developer,
      g.publisher,
      g.genres,
      g.platforms,
      g.search_aliases,
      'direct'::TEXT as match_type,
      1.0 as relevance
    FROM game g
    WHERE g.name ILIKE '%' || search_query || '%'
  ),
  alias_matches AS (
    -- Alias matches (second priority)
    SELECT
      g.id,
      g.name,
      g.summary,
      g.rating,
      g.cover_image_id,
      g.release_date,
      g.developer,
      g.publisher,
      g.genres,
      g.platforms,
      g.search_aliases,
      'alias'::TEXT as match_type,
      0.9 as relevance
    FROM game g
    WHERE g.id NOT IN (SELECT id FROM direct_matches)
      AND g.search_aliases::text ILIKE '%' || search_query || '%'
  ),
  fulltext_matches AS (
    -- Full-text search matches (third priority)
    SELECT
      g.id,
      g.name,
      g.summary,
      g.rating,
      g.cover_image_id,
      g.release_date,
      g.developer,
      g.publisher,
      g.genres,
      g.platforms,
      g.search_aliases,
      'fulltext'::TEXT as match_type,
      ts_rank(g.search_vector, plainto_tsquery('english', search_query)) as relevance
    FROM game g
    WHERE g.id NOT IN (SELECT id FROM direct_matches UNION SELECT id FROM alias_matches)
      AND g.search_vector @@ plainto_tsquery('english', search_query)
  )
  -- Combine all matches and order by relevance
  SELECT * FROM (
    SELECT * FROM direct_matches
    UNION ALL
    SELECT * FROM alias_matches
    UNION ALL
    SELECT * FROM fulltext_matches
  ) combined
  ORDER BY relevance DESC, rating DESC NULLS LAST
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;