-- Create Bot Settings table for multi-guild configuration
CREATE TABLE IF NOT EXISTS bot_settings (
  guild_id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Basic RLS (Row Level Security)
-- This assumes you want staff to manage all and users to only see theirs 
-- handled by the API layer, but good to have some DB level protection
ALTER TABLE bot_settings ENABLE ROW LEVEL SECURITY;

-- Allow service role (API) full access
CREATE POLICY "Service role has full access" ON bot_settings
  FOR ALL TO service_role USING (true);
