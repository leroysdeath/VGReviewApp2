-- Migration: Add playtime_to_finish_hours column to rating table
-- This migration adds a new field to track how long it took users to complete/finish a game
-- This is separate from total_playtime which includes all time spent (post-game, DLC, replays, etc.)

-- Add the playtime_to_finish_hours column
ALTER TABLE rating
ADD COLUMN playtime_to_finish_hours integer;

-- Add validation constraint for playtime_to_finish_hours (same range as playtime_hours)
ALTER TABLE rating
ADD CONSTRAINT playtime_to_finish_valid
CHECK (
  playtime_to_finish_hours IS NULL
  OR (playtime_to_finish_hours >= 0 AND playtime_to_finish_hours <= 50000)
);

-- Add constraint to ensure playtime_to_finish doesn't exceed total playtime
-- Only enforced when both values are provided
ALTER TABLE rating
ADD CONSTRAINT playtime_to_finish_logic
CHECK (
  playtime_to_finish_hours IS NULL
  OR playtime_hours IS NULL
  OR playtime_to_finish_hours <= playtime_hours
);

-- Add comment to explain the playtime_to_finish constraint
COMMENT ON CONSTRAINT playtime_to_finish_valid ON rating IS
'Ensures playtime_to_finish_hours is either NULL or a reasonable value between 0 and 50,000 hours. This tracks how long it took to complete the main story/campaign.';

-- Add comment to explain the logical constraint
COMMENT ON CONSTRAINT playtime_to_finish_logic ON rating IS
'Ensures playtime_to_finish_hours does not exceed playtime_hours when both are provided. Time to finish should logically be less than or equal to total time played.';

-- Create an index for better query performance on playtime_to_finish_hours
-- This will help with queries that filter or sort by completion time
CREATE INDEX IF NOT EXISTS idx_rating_playtime_to_finish_hours
ON rating(playtime_to_finish_hours)
WHERE playtime_to_finish_hours IS NOT NULL;

-- Add a comment to the column to document its purpose
COMMENT ON COLUMN rating.playtime_to_finish_hours IS
'Number of hours it took the user to complete/finish the main story or campaign of this game. Optional field. This is separate from playtime_hours which tracks total time spent including post-game content. Valid range: 0-50,000 hours, must be <= playtime_hours when both are provided.';
