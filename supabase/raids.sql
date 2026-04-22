-- Raid System Schema
-- Enables team raid notifications with role assignments

-- Raid statuses: pending, active, completed, cancelled
CREATE TABLE IF NOT EXISTS raids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by TEXT NOT NULL,
    creator_username TEXT NOT NULL,
    creator_avatar_url TEXT,
    target_location TEXT NOT NULL,
    raid_type TEXT DEFAULT 'normal', -- normal, counter, defense
    enemy_count INTEGER,
    description TEXT,
    status TEXT DEFAULT 'pending',
    start_time TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '2 hours'),
    team_size INTEGER DEFAULT 4,
    discord_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Raid participants with role assignments
CREATE TABLE IF NOT EXISTS raid_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raid_id UUID NOT NULL REFERENCES raids(id) ON DELETE CASCADE,
    discord_id TEXT NOT NULL,
    username TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'member', -- leader, miner, builder, pvp, scout, medic, driver, member
    status TEXT DEFAULT 'joined', -- joined, confirmed, declined, left
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(raid_id, discord_id)
);

-- Role definitions for raids
CREATE TABLE IF NOT EXISTS raid_roles (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    emoji TEXT,
    description TEXT,
    color TEXT DEFAULT '#64748b',
    display_order INTEGER DEFAULT 0
);

-- Insert default roles
INSERT INTO raid_roles (id, label, emoji, description, color, display_order) VALUES
    ('leader', 'Raid Leader', '👑', 'Coordinates the raid and makes tactical decisions', '#fbbf24', 1),
    ('miner', 'Miner', '⛏️', 'Gathers resources and breaks through structures', '#ef4444', 2),
    ('builder', 'Builder', '🏗️', 'Sets up base defenses and builds structures', '#3b82f6', 3),
    ('pvp', 'PvP Fighter', '⚔️', 'Engages in combat and protects the team', '#dc2626', 4),
    ('scout', 'Scout', '🔭', 'Gathers intel and spots enemies', '#22c55e', 5),
    ('medic', 'Medic', '🏥', 'Heals and supports team members', '#ec4899', 6),
    ('driver', 'Driver/Pilot', '🚁', 'Operates vehicles for transport or combat', '#f59e0b', 7),
    ('member', 'Team Member', '👥', 'General raid participant', '#64748b', 8)
ON CONFLICT (id) DO NOTHING;

-- Beta testers table
CREATE TABLE IF NOT EXISTS beta_testers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    avatar_url TEXT,
    notes TEXT,
    joined_at TIMESTAMPTZ DEFAULT now(),
    last_active_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '[]'::jsonb -- array of permission strings
);

-- Raid activity log
CREATE TABLE IF NOT EXISTS raid_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raid_id UUID REFERENCES raids(id) ON DELETE CASCADE,
    actor_id TEXT,
    actor_username TEXT,
    action TEXT NOT NULL, -- created, joined, left, role_changed, status_changed, notified
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_raids_status ON raids(status);
CREATE INDEX IF NOT EXISTS idx_raids_created_by ON raids(created_by);
CREATE INDEX IF NOT EXISTS idx_raids_expires_at ON raids(expires_at);
CREATE INDEX IF NOT EXISTS idx_raid_participants_raid_id ON raid_participants(raid_id);
CREATE INDEX IF NOT EXISTS idx_raid_participants_discord_id ON raid_participants(discord_id);
CREATE INDEX IF NOT EXISTS idx_beta_testers_discord_id ON beta_testers(discord_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_raid_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_raid_timestamp ON raids;
CREATE TRIGGER update_raid_timestamp
    BEFORE UPDATE ON raids
    FOR EACH ROW
    EXECUTE FUNCTION update_raid_timestamp();

-- Function to clean expired raids
CREATE OR REPLACE FUNCTION clean_expired_raids()
RETURNS void AS $$
BEGIN
    UPDATE raids 
    SET status = 'expired' 
    WHERE status IN ('pending', 'active') 
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE raids ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_testers ENABLE ROW LEVEL SECURITY;
ALTER TABLE raid_activity_log ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read raids
CREATE POLICY "raids_select_all" ON raids
    FOR SELECT USING (true);

-- Allow authenticated users to create raids
CREATE POLICY "raids_insert_auth" ON raids
    FOR INSERT WITH CHECK (true);

-- Allow raid creator or participants to update
CREATE POLICY "raids_update_creator" ON raids
    FOR UPDATE USING (
        created_by = current_setting('request.jwt.claims', true)::json->>'sub' 
        OR EXISTS (
            SELECT 1 FROM raid_participants 
            WHERE raid_id = raids.id 
            AND discord_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- Allow all to read participants
CREATE POLICY "raid_participants_select_all" ON raid_participants
    FOR SELECT USING (true);

-- Allow authenticated to insert/update their own participation
CREATE POLICY "raid_participants_insert_own" ON raid_participants
    FOR INSERT WITH CHECK (true);

CREATE POLICY "raid_participants_update_own" ON raid_participants
    FOR UPDATE USING (
        discord_id = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- Beta testers policies
CREATE POLICY "beta_testers_select_all" ON beta_testers
    FOR SELECT USING (true);

CREATE POLICY "beta_testers_admin_all" ON beta_testers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE discord_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- Activity log policies
CREATE POLICY "raid_activity_log_select_all" ON raid_activity_log
    FOR SELECT USING (true);

CREATE POLICY "raid_activity_log_insert_all" ON raid_activity_log
    FOR INSERT WITH CHECK (true);
