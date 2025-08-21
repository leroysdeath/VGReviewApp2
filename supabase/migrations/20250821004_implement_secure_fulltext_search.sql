-- =====================================================
-- Professional Full-Text Search Implementation
-- =====================================================
-- This migration completely eliminates SQL injection vulnerabilities
-- by implementing PostgreSQL's native full-text search capabilities

-- Step 1: Add full-text search columns to game table
ALTER TABLE game 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Step 2: Create function to update search vector
CREATE OR REPLACE FUNCTION update_game_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.genre, '')), 'D') ||
        setweight(to_tsvector('english', array_to_string(coalesce(NEW.genres, '{}'), ' ')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS game_search_vector_update ON game;
CREATE TRIGGER game_search_vector_update
    BEFORE INSERT OR UPDATE ON game
    FOR EACH ROW
    EXECUTE FUNCTION update_game_search_vector();

-- Step 4: Populate search vectors for existing data
UPDATE game SET search_vector = 
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(genre, '')), 'D') ||
    setweight(to_tsvector('english', array_to_string(coalesce(genres, '{}'), ' ')), 'D')
WHERE search_vector IS NULL;

-- Step 5: Create high-performance GIN index
CREATE INDEX IF NOT EXISTS idx_game_search_vector 
ON game USING gin(search_vector);

-- Step 6: Create optimized search function with ranking
CREATE OR REPLACE FUNCTION search_games_secure(
    search_query text,
    limit_count integer DEFAULT 20
)
RETURNS TABLE(
    id integer,
    name text,
    summary text,
    description text,
    release_date date,
    cover_url text,
    genres text[],
    igdb_id integer,
    search_rank real
) AS $$
DECLARE
    query_ts tsquery;
    safe_limit integer;
BEGIN
    -- Input validation and sanitization
    IF search_query IS NULL OR trim(search_query) = '' THEN
        RETURN;
    END IF;
    
    IF length(trim(search_query)) < 2 OR length(trim(search_query)) > 100 THEN
        RETURN;
    END IF;
    
    -- Sanitize limit
    safe_limit := LEAST(GREATEST(limit_count, 1), 100);
    
    -- Convert search query to tsquery (completely safe from injection)
    BEGIN
        query_ts := plainto_tsquery('english', trim(search_query));
    EXCEPTION
        WHEN OTHERS THEN
            -- If query parsing fails, return no results
            RETURN;
    END;
    
    -- Return ranked results using full-text search
    RETURN QUERY
    SELECT 
        g.id,
        g.name,
        g.summary,
        g.description,
        g.release_date,
        g.cover_url,
        g.genres,
        g.igdb_id,
        ts_rank(g.search_vector, query_ts) as search_rank
    FROM game g
    WHERE g.search_vector @@ query_ts
    ORDER BY ts_rank(g.search_vector, query_ts) DESC, g.name ASC
    LIMIT safe_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create phrase search function for exact matches
CREATE OR REPLACE FUNCTION search_games_phrase(
    search_phrase text,
    limit_count integer DEFAULT 20
)
RETURNS TABLE(
    id integer,
    name text,
    summary text,
    description text,
    release_date date,
    cover_url text,
    genres text[],
    igdb_id integer
) AS $$
DECLARE
    query_ts tsquery;
    safe_limit integer;
BEGIN
    -- Input validation
    IF search_phrase IS NULL OR trim(search_phrase) = '' THEN
        RETURN;
    END IF;
    
    IF length(trim(search_phrase)) < 2 OR length(trim(search_phrase)) > 100 THEN
        RETURN;
    END IF;
    
    safe_limit := LEAST(GREATEST(limit_count, 1), 100);
    
    -- Create phrase query (safe from injection)
    BEGIN
        query_ts := phraseto_tsquery('english', trim(search_phrase));
    EXCEPTION
        WHEN OTHERS THEN
            RETURN;
    END;
    
    RETURN QUERY
    SELECT 
        g.id,
        g.name,
        g.summary,
        g.description,
        g.release_date,
        g.cover_url,
        g.genres,
        g.igdb_id
    FROM game g
    WHERE g.search_vector @@ query_ts
    ORDER BY g.name ASC
    LIMIT safe_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create genre search function
CREATE OR REPLACE FUNCTION search_games_by_genre(
    genre_name text,
    limit_count integer DEFAULT 20
)
RETURNS TABLE(
    id integer,
    name text,
    summary text,
    description text,
    release_date date,
    cover_url text,
    genres text[],
    igdb_id integer
) AS $$
DECLARE
    safe_limit integer;
    clean_genre text;
BEGIN
    -- Input validation
    IF genre_name IS NULL OR trim(genre_name) = '' THEN
        RETURN;
    END IF;
    
    clean_genre := trim(lower(genre_name));
    safe_limit := LEAST(GREATEST(limit_count, 1), 100);
    
    RETURN QUERY
    SELECT 
        g.id,
        g.name,
        g.summary,
        g.description,
        g.release_date,
        g.cover_url,
        g.genres,
        g.igdb_id
    FROM game g
    WHERE 
        lower(g.genre) = clean_genre 
        OR EXISTS (
            SELECT 1 FROM unnest(g.genres) AS genre_item 
            WHERE lower(genre_item) = clean_genre
        )
    ORDER BY g.name ASC
    LIMIT safe_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Grant necessary permissions
GRANT EXECUTE ON FUNCTION search_games_secure(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION search_games_phrase(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION search_games_by_genre(text, integer) TO authenticated;

-- Step 10: Add RLS policies for search functions
-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
    -- Drop policies if they exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow search_games_secure' AND tablename = 'game') THEN
        DROP POLICY "Allow search_games_secure" ON game;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow search_games_phrase' AND tablename = 'game') THEN
        DROP POLICY "Allow search_games_phrase" ON game;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow search_games_by_genre' AND tablename = 'game') THEN
        DROP POLICY "Allow search_games_by_genre" ON game;
    END IF;
END $$;

-- Create new policies
CREATE POLICY "Allow search_games_secure" ON game FOR SELECT USING (true);
CREATE POLICY "Allow search_games_phrase" ON game FOR SELECT USING (true);
CREATE POLICY "Allow search_games_by_genre" ON game FOR SELECT USING (true);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Full-text search implementation completed successfully';
    RAISE NOTICE 'Created secure search functions with SQL injection immunity';
    RAISE NOTICE 'Created GIN index for optimal performance';
END $$;