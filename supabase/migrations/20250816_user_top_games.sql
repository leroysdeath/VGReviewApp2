-- Create user_top_games table for manual Top 5 game selection
CREATE TABLE IF NOT EXISTS public.user_top_games (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.user(id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES public.game(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position >= 1 AND position <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Ensure unique user_id + position combination
    CONSTRAINT unique_user_position UNIQUE (user_id, position),
    -- Ensure unique user_id + game_id combination (no duplicate games)
    CONSTRAINT unique_user_game UNIQUE (user_id, game_id)
);

-- Create index for faster queries
CREATE INDEX idx_user_top_games_user_id ON public.user_top_games(user_id);
CREATE INDEX idx_user_top_games_position ON public.user_top_games(position);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_top_games ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view anyone's top games
CREATE POLICY "Users can view all top games" ON public.user_top_games
    FOR SELECT USING (true);

-- Users can only insert their own top games
CREATE POLICY "Users can insert own top games" ON public.user_top_games
    FOR INSERT WITH CHECK (
        auth.uid() = (SELECT provider_id FROM public.user WHERE id = user_id)
    );

-- Users can only update their own top games
CREATE POLICY "Users can update own top games" ON public.user_top_games
    FOR UPDATE USING (
        auth.uid() = (SELECT provider_id FROM public.user WHERE id = user_id)
    ) WITH CHECK (
        auth.uid() = (SELECT provider_id FROM public.user WHERE id = user_id)
    );

-- Users can only delete their own top games
CREATE POLICY "Users can delete own top games" ON public.user_top_games
    FOR DELETE USING (
        auth.uid() = (SELECT provider_id FROM public.user WHERE id = user_id)
    );

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_top_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_top_games_updated_at
    BEFORE UPDATE ON public.user_top_games
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_top_games_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.user_top_games TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_top_games_id_seq TO authenticated;
