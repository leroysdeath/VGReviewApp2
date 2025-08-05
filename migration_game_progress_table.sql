-- Game Progress Tracking Table Migration
-- This table tracks which games users have started and completed

-- Create the game_progress table
CREATE TABLE IF NOT EXISTS public.game_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.user(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES public.game(id) ON DELETE CASCADE,
  started BOOLEAN NOT NULL DEFAULT false,
  completed BOOLEAN NOT NULL DEFAULT false,
  started_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one progress record per user per game
  UNIQUE(user_id, game_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_progress_user_id ON public.game_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_game_progress_game_id ON public.game_progress(game_id);
CREATE INDEX IF NOT EXISTS idx_game_progress_started ON public.game_progress(started) WHERE started = true;
CREATE INDEX IF NOT EXISTS idx_game_progress_completed ON public.game_progress(completed) WHERE completed = true;
CREATE INDEX IF NOT EXISTS idx_game_progress_user_started ON public.game_progress(user_id, started) WHERE started = true;
CREATE INDEX IF NOT EXISTS idx_game_progress_user_completed ON public.game_progress(user_id, completed) WHERE completed = true;

-- Enable Row Level Security
ALTER TABLE public.game_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own progress
CREATE POLICY "Users can view their own game progress" ON public.game_progress
  FOR SELECT USING (user_id = (SELECT id FROM public.user WHERE provider_id = auth.uid()));

-- Users can insert their own progress
CREATE POLICY "Users can insert their own game progress" ON public.game_progress
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM public.user WHERE provider_id = auth.uid()));

-- Users can update their own progress
CREATE POLICY "Users can update their own game progress" ON public.game_progress
  FOR UPDATE USING (user_id = (SELECT id FROM public.user WHERE provider_id = auth.uid()));

-- Users can delete their own progress (optional)
CREATE POLICY "Users can delete their own game progress" ON public.game_progress
  FOR DELETE USING (user_id = (SELECT id FROM public.user WHERE provider_id = auth.uid()));

-- Optional: Allow public read access for social features (remove if not needed)
-- CREATE POLICY "Anyone can view game progress" ON public.game_progress
--   FOR SELECT USING (true);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_progress TO authenticated;
GRANT USAGE ON SEQUENCE public.game_progress_id_seq TO authenticated;

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_game_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_game_progress_updated_at_trigger ON public.game_progress;
CREATE TRIGGER update_game_progress_updated_at_trigger
  BEFORE UPDATE ON public.game_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_game_progress_updated_at();

-- Add constraints to ensure data integrity
ALTER TABLE public.game_progress
  ADD CONSTRAINT check_started_date_when_started 
  CHECK (started = false OR started_date IS NOT NULL);

ALTER TABLE public.game_progress
  ADD CONSTRAINT check_completed_date_when_completed 
  CHECK (completed = false OR completed_date IS NOT NULL);

-- If completed, must also be started
ALTER TABLE public.game_progress
  ADD CONSTRAINT check_completed_implies_started 
  CHECK (completed = false OR started = true);

-- Started date should be before or equal to completed date
ALTER TABLE public.game_progress
  ADD CONSTRAINT check_started_before_completed 
  CHECK (started_date IS NULL OR completed_date IS NULL OR started_date <= completed_date);

-- Add helpful comments
COMMENT ON TABLE public.game_progress IS 'Tracks which games users have started and completed';
COMMENT ON COLUMN public.game_progress.user_id IS 'Reference to user table (database user ID, not auth ID)';
COMMENT ON COLUMN public.game_progress.game_id IS 'Reference to game table (database game ID)';
COMMENT ON COLUMN public.game_progress.started IS 'Whether user has started this game';
COMMENT ON COLUMN public.game_progress.completed IS 'Whether user has completed this game';
COMMENT ON COLUMN public.game_progress.started_date IS 'When user marked game as started';
COMMENT ON COLUMN public.game_progress.completed_date IS 'When user marked game as completed';

-- Create view for easy querying of user game statistics
CREATE OR REPLACE VIEW public.user_game_stats AS
SELECT 
  u.id as user_id,
  u.name,
  COUNT(*) as total_games,
  COUNT(*) FILTER (WHERE gp.started = true) as started_games,
  COUNT(*) FILTER (WHERE gp.completed = true) as completed_games,
  ROUND(
    (COUNT(*) FILTER (WHERE gp.completed = true)::DECIMAL / 
     NULLIF(COUNT(*) FILTER (WHERE gp.started = true), 0)) * 100, 
    2
  ) as completion_rate_percent
FROM public.user u
LEFT JOIN public.game_progress gp ON u.id = gp.user_id
GROUP BY u.id, u.name;

COMMENT ON VIEW public.user_game_stats IS 'User game statistics including total, started, completed games and completion rate';

-- Grant access to the view
GRANT SELECT ON public.user_game_stats TO authenticated;
