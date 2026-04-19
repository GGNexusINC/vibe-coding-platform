-- Arena Events System Schema
-- Teams, Events, and Tournament Brackets

-- Events table (tournaments/arena events)
CREATE TABLE IF NOT EXISTS arena_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  game_mode TEXT DEFAULT 'PvP', -- PvP, PvE, Battle Royale, etc.
  max_teams INTEGER DEFAULT 16,
  team_size INTEGER DEFAULT 4, -- max players per team
  status TEXT DEFAULT 'registration', -- registration, active, completed, cancelled
  registration_open BOOLEAN DEFAULT true,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  created_by_discord_id TEXT NOT NULL,
  created_by_username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  discord_webhook_url TEXT, -- optional webhook for this specific event
  bracket_type TEXT DEFAULT 'single_elimination', -- single_elimination, double_elimination, round_robin
  current_round INTEGER DEFAULT 0
);

-- Teams table
CREATE TABLE IF NOT EXISTS arena_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES arena_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tag TEXT, -- team tag like [CLAN]
  logo_url TEXT,
  leader_discord_id TEXT NOT NULL,
  leader_username TEXT NOT NULL,
  leader_avatar_url TEXT,
  status TEXT DEFAULT 'active', -- active, eliminated, winner
  seed INTEGER, -- tournament seeding
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(event_id, name) -- prevent duplicate team names in same event
);

-- Team members table
CREATE TABLE IF NOT EXISTS arena_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES arena_teams(id) ON DELETE CASCADE,
  event_id UUID REFERENCES arena_events(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'member', -- leader, member, substitute
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(team_id, discord_id) -- prevent duplicate members in same team
);

-- Tournament bracket/matches table
CREATE TABLE IF NOT EXISTS arena_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES arena_events(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  team1_id UUID REFERENCES arena_teams(id) ON DELETE SET NULL,
  team2_id UUID REFERENCES arena_teams(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES arena_teams(id) ON DELETE SET NULL,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, live, completed, cancelled
  scheduled_time TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  UNIQUE(event_id, round, match_number)
);

-- Event announcements/log
CREATE TABLE IF NOT EXISTS arena_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES arena_events(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- team_created, member_joined, member_kicked, match_started, match_completed, etc.
  message TEXT NOT NULL,
  discord_id TEXT,
  username TEXT,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_arena_events_status ON arena_events(status);
CREATE INDEX IF NOT EXISTS idx_arena_events_registration ON arena_events(registration_open);
CREATE INDEX IF NOT EXISTS idx_arena_teams_event ON arena_teams(event_id);
CREATE INDEX IF NOT EXISTS idx_arena_teams_leader ON arena_teams(leader_discord_id);
CREATE INDEX IF NOT EXISTS idx_arena_team_members_team ON arena_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_arena_team_members_discord ON arena_team_members(discord_id);
CREATE INDEX IF NOT EXISTS idx_arena_matches_event ON arena_matches(event_id);
CREATE INDEX IF NOT EXISTS idx_arena_matches_round ON arena_matches(event_id, round);

-- Row Level Security policies
ALTER TABLE arena_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_event_logs ENABLE ROW LEVEL SECURITY;

-- Allow all reads (public viewing)
CREATE POLICY "Allow public read" ON arena_events FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON arena_teams FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON arena_team_members FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON arena_matches FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON arena_event_logs FOR SELECT USING (true);

-- Allow inserts (authenticated users via API)
CREATE POLICY "Allow authenticated insert" ON arena_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated insert" ON arena_teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated insert" ON arena_team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated insert" ON arena_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated insert" ON arena_event_logs FOR INSERT WITH CHECK (true);

-- Allow updates (authenticated users via API)
CREATE POLICY "Allow authenticated update" ON arena_events FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated update" ON arena_teams FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated update" ON arena_team_members FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated update" ON arena_matches FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated update" ON arena_event_logs FOR UPDATE USING (true);

-- Allow deletes (authenticated users via API - for leaders kicking members)
CREATE POLICY "Allow authenticated delete" ON arena_team_members FOR DELETE USING (true);
CREATE POLICY "Allow authenticated delete" ON arena_teams FOR DELETE USING (true);

-- Comments
COMMENT ON TABLE arena_events IS 'Tournament and arena event definitions';
COMMENT ON TABLE arena_teams IS 'Teams registered for events';
COMMENT ON TABLE arena_team_members IS 'Members of teams';
COMMENT ON TABLE arena_matches IS 'Tournament bracket matches';
COMMENT ON TABLE arena_event_logs IS 'Event activity log for Discord notifications';
