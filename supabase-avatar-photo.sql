-- Run this in Supabase SQL editor

-- 1. Add avatar_url column
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- 2. Fix trigger to read name from Google / signup metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'),  ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      'Trader'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Also create the avatars storage bucket (run this too)
-- NOTE: You also need to go to Supabase Storage → New bucket → name it "avatars" → set to Public
