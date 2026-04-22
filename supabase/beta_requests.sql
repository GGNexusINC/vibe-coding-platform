-- Beta Tester Request System
-- Allows users to request beta access and admins to approve/reject

CREATE TABLE IF NOT EXISTS beta_tester_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    avatar_url TEXT,
    reason TEXT,
    experience TEXT,
    play_time TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    requested_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    review_notes TEXT,
    notified BOOLEAN DEFAULT FALSE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_beta_requests_status ON beta_tester_requests(status);
CREATE INDEX IF NOT EXISTS idx_beta_requests_discord_id ON beta_tester_requests(discord_id);

-- RLS Policies
ALTER TABLE beta_tester_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create a request
CREATE POLICY "beta_requests_insert_all" ON beta_tester_requests
    FOR INSERT WITH CHECK (true);

-- Allow users to see their own request
CREATE POLICY "beta_requests_select_own" ON beta_tester_requests
    FOR SELECT USING (
        discord_id = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- Allow admins to see all requests
CREATE POLICY "beta_requests_admin_all" ON beta_tester_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE discord_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );
