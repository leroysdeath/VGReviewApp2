-- Migration: Add comprehensive referral tracking system
-- Created: 2024-09-29
-- Description: Implements sales-driven referral tracking with conversion metrics

-- Create referral codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  code VARCHAR(17) PRIMARY KEY,
  owner_name VARCHAR(255) NOT NULL,
  type VARCHAR(50) CHECK (type IN ('salesperson', 'campaign')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create index for active codes lookup
CREATE INDEX idx_referral_codes_active ON referral_codes(is_active) WHERE is_active = true;

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE UNIQUE,
  referral_code VARCHAR(17) REFERENCES referral_codes(code),
  signup_method VARCHAR(50) CHECK (signup_method IN ('direct_code', 'referral_url')),
  signup_url VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for referrals
CREATE INDEX idx_referrals_user_id ON referrals(user_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referrals_created ON referrals(created_at);

-- Create referral conversions table
CREATE TABLE IF NOT EXISTS referral_conversions (
  id SERIAL PRIMARY KEY,
  referral_id INTEGER REFERENCES referrals(id) ON DELETE CASCADE UNIQUE,

  -- Profile Completion
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP WITH TIME ZONE,
  profile_photo_uploaded BOOLEAN DEFAULT false,
  profile_photo_uploaded_at TIMESTAMP WITH TIME ZONE,
  bio_completed BOOLEAN DEFAULT false,
  bio_completed_at TIMESTAMP WITH TIME ZONE,

  -- Content Creation
  reviews_count INTEGER DEFAULT 0,
  review_1_completed_at TIMESTAMP WITH TIME ZONE,
  review_5_completed_at TIMESTAMP WITH TIME ZONE,
  review_10_completed_at TIMESTAMP WITH TIME ZONE,
  comments_count INTEGER DEFAULT 0,
  comment_1_completed_at TIMESTAMP WITH TIME ZONE,

  -- Social Engagement
  top5_selected BOOLEAN DEFAULT false,
  top5_selected_at TIMESTAMP WITH TIME ZONE,
  following_count INTEGER DEFAULT 0,
  following_3plus BOOLEAN DEFAULT false,
  following_3plus_at TIMESTAMP WITH TIME ZONE,
  likes_given_count INTEGER DEFAULT 0,
  likes_3_completed_at TIMESTAMP WITH TIME ZONE,

  -- Retention
  active_days_week1 INTEGER DEFAULT 0,
  active_3_days_week1 BOOLEAN DEFAULT false,
  active_3_days_week1_at TIMESTAMP WITH TIME ZONE,

  -- Subscription/Monetization
  converted_to_paid BOOLEAN DEFAULT false,
  converted_to_paid_at TIMESTAMP WITH TIME ZONE,
  subscription_tier VARCHAR(50), -- 'pro', 'premium', 'enterprise', etc.
  subscription_amount DECIMAL(10,2), -- Monthly/annual amount for tracking

  -- Summary
  all_completed BOOLEAN DEFAULT false,
  all_completed_at TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for conversions
CREATE INDEX idx_conversions_referral_id ON referral_conversions(referral_id);
CREATE INDEX idx_conversions_all_completed ON referral_conversions(all_completed);
CREATE INDEX idx_conversions_last_updated ON referral_conversions(last_updated);

-- Enable RLS on all referral tables
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;

-- Create policies for referral_codes (read-only for all, admin can modify)
CREATE POLICY "Referral codes are viewable by all" ON referral_codes
  FOR SELECT USING (true);

-- Create policies for referrals (users can see their own, admin can see all)
CREATE POLICY "Users can see their own referral" ON referrals
  FOR SELECT USING (auth.uid()::text = (SELECT provider_id::text FROM "user" WHERE id = user_id));

-- Create policies for conversions (similar to referrals)
CREATE POLICY "Users can see their own conversion data" ON referral_conversions
  FOR SELECT USING (
    referral_id IN (
      SELECT r.id FROM referrals r
      JOIN "user" u ON r.user_id = u.id
      WHERE u.provider_id = auth.uid()
    )
  );

-- Create function to validate referral code (case-insensitive)
CREATE OR REPLACE FUNCTION validate_referral_code(code_input VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM referral_codes
    WHERE UPPER(code) = UPPER(code_input)
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to get referral code info (case-insensitive)
CREATE OR REPLACE FUNCTION get_referral_code_info(code_input VARCHAR)
RETURNS TABLE (
  code VARCHAR,
  owner_name VARCHAR,
  type VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT rc.code, rc.owner_name, rc.type
  FROM referral_codes rc
  WHERE UPPER(rc.code) = UPPER(code_input)
  AND rc.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create function to record referral at signup
CREATE OR REPLACE FUNCTION record_referral(
  p_user_id INTEGER,
  p_referral_code VARCHAR,
  p_signup_method VARCHAR,
  p_signup_url VARCHAR DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_referral_id INTEGER;
  v_valid_code VARCHAR;
BEGIN
  -- Validate code exists (case-insensitive)
  SELECT code INTO v_valid_code
  FROM referral_codes
  WHERE UPPER(code) = UPPER(p_referral_code)
  AND is_active = true;

  IF v_valid_code IS NULL THEN
    RETURN NULL;
  END IF;

  -- Insert referral record
  INSERT INTO referrals (user_id, referral_code, signup_method, signup_url)
  VALUES (p_user_id, v_valid_code, p_signup_method, p_signup_url)
  RETURNING id INTO v_referral_id;

  -- Create empty conversion tracking record
  INSERT INTO referral_conversions (referral_id)
  VALUES (v_referral_id);

  RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check all_completed status
CREATE OR REPLACE FUNCTION check_all_conversions_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if all 12 metrics are completed (including paid conversion)
  IF NEW.email_verified = true
    AND NEW.profile_photo_uploaded = true
    AND NEW.bio_completed = true
    AND NEW.review_1_completed_at IS NOT NULL
    AND NEW.review_5_completed_at IS NOT NULL
    AND NEW.review_10_completed_at IS NOT NULL
    AND NEW.comment_1_completed_at IS NOT NULL
    AND NEW.top5_selected = true
    AND NEW.following_3plus = true
    AND NEW.likes_3_completed_at IS NOT NULL
    AND NEW.active_3_days_week1 = true
    AND NEW.converted_to_paid = true
    AND NEW.all_completed = false
  THEN
    NEW.all_completed := true;
    NEW.all_completed_at := NOW();
  END IF;

  NEW.last_updated := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating all_completed
CREATE TRIGGER update_all_completed_status
  BEFORE UPDATE ON referral_conversions
  FOR EACH ROW
  EXECUTE FUNCTION check_all_conversions_completed();

-- Create function to update review milestones
CREATE OR REPLACE FUNCTION update_review_milestones(p_user_id INTEGER)
RETURNS VOID AS $$
DECLARE
  v_review_count INTEGER;
  v_referral_id INTEGER;
BEGIN
  -- Get review count for user
  SELECT COUNT(*) INTO v_review_count
  FROM rating
  WHERE user_id = p_user_id
  AND review IS NOT NULL
  AND LENGTH(TRIM(review)) > 0;

  -- Get referral_id if exists
  SELECT id INTO v_referral_id
  FROM referrals
  WHERE user_id = p_user_id;

  IF v_referral_id IS NOT NULL THEN
    -- Update conversion metrics
    UPDATE referral_conversions
    SET
      reviews_count = v_review_count,
      review_1_completed_at = CASE
        WHEN v_review_count >= 1 AND review_1_completed_at IS NULL
        THEN NOW()
        ELSE review_1_completed_at
      END,
      review_5_completed_at = CASE
        WHEN v_review_count >= 5 AND review_5_completed_at IS NULL
        THEN NOW()
        ELSE review_5_completed_at
      END,
      review_10_completed_at = CASE
        WHEN v_review_count >= 10 AND review_10_completed_at IS NULL
        THEN NOW()
        ELSE review_10_completed_at
      END
    WHERE referral_id = v_referral_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add sample referral codes for testing (you can modify these)
INSERT INTO referral_codes (code, owner_name, type) VALUES
  ('DEMO', 'Demo Account', 'salesperson'),
  ('TEST2024', 'Test Campaign', 'campaign')
ON CONFLICT (code) DO NOTHING;

-- Add comment explaining the system
COMMENT ON TABLE referral_codes IS 'Stores referral codes for sales team and campaigns';
COMMENT ON TABLE referrals IS 'Links users to their referral source';
COMMENT ON TABLE referral_conversions IS 'Tracks engagement metrics for referred users';

-- Create function to track paid conversion
CREATE OR REPLACE FUNCTION track_paid_conversion(
  p_user_id INTEGER,
  p_subscription_tier VARCHAR DEFAULT 'pro',
  p_subscription_amount DECIMAL DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_referral_id INTEGER;
BEGIN
  -- Get referral_id if exists
  SELECT id INTO v_referral_id
  FROM referrals
  WHERE user_id = p_user_id;

  IF v_referral_id IS NOT NULL THEN
    -- Update conversion metrics
    UPDATE referral_conversions
    SET
      converted_to_paid = true,
      converted_to_paid_at = NOW(),
      subscription_tier = p_subscription_tier,
      subscription_amount = p_subscription_amount,
      last_updated = NOW()
    WHERE referral_id = v_referral_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION track_paid_conversion IS 'Track when a referred user converts to a paid subscription';