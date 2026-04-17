-- Create user_profiles table for storing UID and other user data
CREATE TABLE IF NOT EXISTS user_profiles (
  discord_id TEXT PRIMARY KEY,
  username TEXT,
  uid TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_uid ON user_profiles(uid);

-- Disable RLS for admin access
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
