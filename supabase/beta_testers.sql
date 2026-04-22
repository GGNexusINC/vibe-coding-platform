-- Beta Testers Table
-- Stores approved beta testers with their permissions

CREATE TABLE IF NOT EXISTS beta_testers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    avatar_url TEXT,
    permissions JSONB DEFAULT '[]',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT now(),
    last_active_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_beta_testers_discord_id ON beta_testers(discord_id);
CREATE INDEX IF NOT EXISTS idx_beta_testers_active ON beta_testers(is_active);

-- RLS Policies
ALTER TABLE beta_testers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (needed for checking beta status)
CREATE POLICY "beta_testers_select_all" ON beta_testers
    FOR SELECT USING (true);

-- Allow inserts (admin handled at application level)
CREATE POLICY "beta_testers_insert_all" ON beta_testers
    FOR INSERT WITH CHECK (true);

-- Allow updates
CREATE POLICY "beta_testers_update_all" ON beta_testers
    FOR UPDATE USING (true);

-- Allow deletes
CREATE POLICY "beta_testers_delete_all" ON beta_testers
    FOR DELETE USING (true);
