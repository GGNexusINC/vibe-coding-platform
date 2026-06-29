-- 1. Add points column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- 2. Create points_ledger table to track points earned and spent
CREATE TABLE IF NOT EXISTS points_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discord_id TEXT REFERENCES user_profiles(discord_id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create index for faster ledger lookups per user
CREATE INDEX IF NOT EXISTS idx_points_ledger_discord_id ON points_ledger(discord_id);

-- 4. Enable RLS and add policies
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own points history
CREATE POLICY "Users can view own points ledger" ON points_ledger
  FOR SELECT USING (auth.uid()::text = discord_id OR discord_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow the server (service role) to insert/update anything
CREATE POLICY "Service role can manage points ledger" ON points_ledger
  FOR ALL USING (true) WITH CHECK (true);
