-- Auto-User Creation Trigger Migration
-- This ensures every auth user gets a corresponding database user record
-- Key Rule: Always map auth.uid → user.provider_id → user.id for all database operations

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user (provider_id, email, name, provider)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 
    'supabase'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rating TO authenticated;

-- Add RLS policies if not already present
ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own profile
CREATE POLICY "Users can view their own profile" ON public.user
  FOR SELECT USING (auth.uid() = provider_id);

-- Policy for users to update their own profile  
CREATE POLICY "Users can update their own profile" ON public.user
  FOR UPDATE USING (auth.uid() = provider_id);

-- Policy for users to read their own ratings
CREATE POLICY "Users can view their own ratings" ON public.rating
  FOR SELECT USING (
    user_id = (SELECT id FROM public.user WHERE provider_id = auth.uid())
  );

-- Policy for users to insert their own ratings
CREATE POLICY "Users can insert their own ratings" ON public.rating
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.user WHERE provider_id = auth.uid())
  );

-- Policy for users to update their own ratings
CREATE POLICY "Users can update their own ratings" ON public.rating
  FOR UPDATE USING (
    user_id = (SELECT id FROM public.user WHERE provider_id = auth.uid())
  );

-- Policy for users to delete their own ratings
CREATE POLICY "Users can delete their own ratings" ON public.rating
  FOR DELETE USING (
    user_id = (SELECT id FROM public.user WHERE provider_id = auth.uid())
  );

-- Allow public read access to ratings for game pages (optional)
CREATE POLICY "Anyone can view ratings" ON public.rating
  FOR SELECT USING (true);

-- Allow public read access to user profiles for reviews (optional)
CREATE POLICY "Anyone can view user profiles" ON public.user
  FOR SELECT USING (true);

-- Comments and indexes
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a user record when a new auth user is created';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Triggers user creation in public.user table';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_provider_id ON public.user(provider_id);
CREATE INDEX IF NOT EXISTS idx_rating_user_id ON public.rating(user_id);
CREATE INDEX IF NOT EXISTS idx_rating_game_id ON public.rating(game_id);
CREATE INDEX IF NOT EXISTS idx_rating_post_date_time ON public.rating(post_date_time DESC);

-- Ensure proper column types and constraints
-- These may already exist, but ensuring they're correct
ALTER TABLE public.rating 
  ALTER COLUMN rating TYPE NUMERIC(3,1),
  ALTER COLUMN post_date_time TYPE TIMESTAMPTZ;

-- Add helpful constraints
ALTER TABLE public.rating 
  ADD CONSTRAINT rating_value_check CHECK (rating >= 0 AND rating <= 10);

-- Summary of key mappings:
-- auth.users.id → user.provider_id → user.id (for all database operations)
-- rating table columns: review (not text), post_date_time (not created_at)
-- Always use user.id from user table, never auth.uid() directly in rating operations
