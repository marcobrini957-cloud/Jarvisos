-- Add avatar_emoji column to user_profiles
-- Run this once in the Supabase SQL editor

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT NULL;
