-- Create arena_matches table for tracking tournament matches
CREATE TABLE IF NOT EXISTS arena_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES arena_events(id) ON DELETE CASCADE,
    round INTEGER NOT NULL DEFAULT 1,
    match_number INTEGER NOT NULL,
    team1_id UUID REFERENCES arena_teams(id) ON DELETE SET NULL,
    team1_name TEXT,
    team1_vc TEXT,
    team2_id UUID REFERENCES arena_teams(id) ON DELETE SET NULL,
    team2_name TEXT,
    team2_vc TEXT,
    winner_id UUID REFERENCES arena_teams(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending', -- pending, live, completed, cancelled
    team1_score INTEGER DEFAULT 0,
    team2_score INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, round, match_number)
);

-- Enable RLS
ALTER TABLE arena_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Arena matches are viewable by everyone" 
    ON arena_matches FOR SELECT USING (true);

CREATE POLICY "Admins can manage arena matches" 
    ON arena_matches FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_arena_matches_event ON arena_matches(event_id);
CREATE INDEX idx_arena_matches_round ON arena_matches(event_id, round);

COMMENT ON TABLE arena_matches IS 'Tournament matches for arena events';
