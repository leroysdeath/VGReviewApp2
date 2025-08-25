-- Add slug column to game_progress table
-- This will store a URL-friendly version of the game name for better routing

-- Add the slug column (nullable initially)
ALTER TABLE game_progress 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create an index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_progress_slug ON game_progress(slug);

-- Add a unique constraint on user_id + slug combination
-- This ensures each user can only have one progress entry per game slug
ALTER TABLE game_progress 
ADD CONSTRAINT unique_user_game_slug UNIQUE (user_id, slug);

-- Function to generate slug from game name
CREATE OR REPLACE FUNCTION generate_game_slug(game_name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Convert to lowercase, replace spaces and special chars with hyphens
  -- Remove consecutive hyphens and trim
  RETURN LOWER(
    TRIM(
      BOTH '-' FROM 
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            game_name,
            '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special characters
          ),
          '\s+', '-', 'g'  -- Replace spaces with hyphens
        ),
        '-+', '-', 'g'  -- Replace multiple hyphens with single hyphen
      )
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing rows with slugs based on game names
-- This joins with the game table to get the game name
UPDATE game_progress gp
SET slug = generate_game_slug(g.name)
FROM game g
WHERE gp.game_id = g.id
AND gp.slug IS NULL;

-- Create a trigger to automatically set slug for new entries
CREATE OR REPLACE FUNCTION set_game_progress_slug()
RETURNS TRIGGER AS $$
DECLARE
  game_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Only set slug if it's not already provided
  IF NEW.slug IS NULL THEN
    -- Get the game name
    SELECT name INTO game_name FROM game WHERE id = NEW.game_id;
    
    IF game_name IS NOT NULL THEN
      -- Generate base slug
      base_slug := generate_game_slug(game_name);
      final_slug := base_slug;
      
      -- Check for duplicates and append number if necessary
      WHILE EXISTS (
        SELECT 1 FROM game_progress 
        WHERE user_id = NEW.user_id 
        AND slug = final_slug 
        AND game_id != NEW.game_id
      ) LOOP
        final_slug := base_slug || '-' || counter;
        counter := counter + 1;
      END LOOP;
      
      NEW.slug := final_slug;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new inserts
DROP TRIGGER IF EXISTS trigger_set_game_progress_slug ON game_progress;
CREATE TRIGGER trigger_set_game_progress_slug
BEFORE INSERT ON game_progress
FOR EACH ROW
EXECUTE FUNCTION set_game_progress_slug();

-- Create trigger for updates (when game_id changes)
CREATE OR REPLACE FUNCTION update_game_progress_slug()
RETURNS TRIGGER AS $$
DECLARE
  game_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Only update slug if game_id changed
  IF OLD.game_id IS DISTINCT FROM NEW.game_id THEN
    -- Get the new game name
    SELECT name INTO game_name FROM game WHERE id = NEW.game_id;
    
    IF game_name IS NOT NULL THEN
      -- Generate base slug
      base_slug := generate_game_slug(game_name);
      final_slug := base_slug;
      
      -- Check for duplicates and append number if necessary
      WHILE EXISTS (
        SELECT 1 FROM game_progress 
        WHERE user_id = NEW.user_id 
        AND slug = final_slug 
        AND game_id != NEW.game_id
      ) LOOP
        final_slug := base_slug || '-' || counter;
        counter := counter + 1;
      END LOOP;
      
      NEW.slug := final_slug;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updates
DROP TRIGGER IF EXISTS trigger_update_game_progress_slug ON game_progress;
CREATE TRIGGER trigger_update_game_progress_slug
BEFORE UPDATE ON game_progress
FOR EACH ROW
EXECUTE FUNCTION update_game_progress_slug();

-- Add comment to document the column
COMMENT ON COLUMN game_progress.slug IS 'URL-friendly version of the game name for routing purposes';

-- Grant appropriate permissions
GRANT SELECT ON game_progress TO authenticated;
GRANT INSERT, UPDATE, DELETE ON game_progress TO authenticated;

-- Add RLS policy if needed (assuming RLS is enabled on game_progress)
-- Users can only modify their own game progress entries
CREATE POLICY IF NOT EXISTS "Users can manage own game progress" ON game_progress
  FOR ALL
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);