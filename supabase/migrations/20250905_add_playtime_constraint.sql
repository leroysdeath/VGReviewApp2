-- Migration: Add playtime_hours validation constraint
-- This migration adds reasonable constraints to ensure data quality for playtime tracking

-- Add check constraint for playtime_hours
ALTER TABLE rating 
ADD CONSTRAINT playtime_valid 
CHECK (
  playtime_hours IS NULL 
  OR (playtime_hours >= 0 AND playtime_hours <= 50000)
);

-- Add comment to explain the constraint
COMMENT ON CONSTRAINT playtime_valid ON rating IS 
'Ensures playtime_hours is either NULL or a reasonable value between 0 and 50,000 hours. 50,000 hours represents approximately 57 years of gaming at 2.4 hours per day, which covers even the most extreme cases while preventing data entry errors.';

-- Create an index for better query performance on playtime_hours
-- This will help with queries that filter or sort by playtime
CREATE INDEX IF NOT EXISTS idx_rating_playtime_hours 
ON rating(playtime_hours) 
WHERE playtime_hours IS NOT NULL;

-- Add a comment to the column to document its purpose
COMMENT ON COLUMN rating.playtime_hours IS 
'Number of hours the user has played this game. Optional field. Valid range: 0-50,000 hours.';