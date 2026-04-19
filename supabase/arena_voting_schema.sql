-- Arena Loot/Mode Voting System

-- Vote options for events (created by admins)
CREATE TABLE IF NOT EXISTS arena_vote_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES arena_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Bows Only", "Pistol R500 Only"
  description TEXT,
  icon TEXT DEFAULT '🎯', -- emoji icon
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Team votes (each team gets one vote)
CREATE TABLE IF NOT EXISTS arena_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES arena_events(id) ON DELETE CASCADE,
  team_id UUID REFERENCES arena_teams(id) ON DELETE CASCADE,
  option_id UUID REFERENCES arena_vote_options(id) ON DELETE CASCADE,
  voted_by_discord_id TEXT NOT NULL, -- who cast the vote (team leader)
  voted_by_username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(event_id, team_id) -- one vote per team per event
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_arena_vote_options_event ON arena_vote_options(event_id);
CREATE INDEX IF NOT EXISTS idx_arena_votes_event ON arena_votes(event_id);
CREATE INDEX IF NOT EXISTS idx_arena_votes_team ON arena_votes(team_id);
CREATE INDEX IF NOT EXISTS idx_arena_votes_option ON arena_votes(option_id);

-- RLS policies
ALTER TABLE arena_vote_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON arena_vote_options FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON arena_votes FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON arena_vote_options FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated insert" ON arena_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON arena_votes FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete" ON arena_votes FOR DELETE USING (true);

-- Function to get vote results
CREATE OR REPLACE FUNCTION get_vote_results(event_uuid UUID)
RETURNS TABLE (
  option_id UUID,
  option_name TEXT,
  option_icon TEXT,
  vote_count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH totals AS (
    SELECT COUNT(*)::numeric as total FROM arena_votes WHERE event_id = event_uuid
  )
  SELECT 
    vo.id as option_id,
    vo.name as option_name,
    vo.icon as option_icon,
    COUNT(v.id) as vote_count,
    CASE 
      WHEN totals.total = 0 THEN 0
      ELSE ROUND((COUNT(v.id) / totals.total * 100), 1)
    END as percentage
  FROM arena_vote_options vo
  LEFT JOIN arena_votes v ON v.option_id = vo.id
  CROSS JOIN totals
  WHERE vo.event_id = event_uuid
  GROUP BY vo.id, vo.name, vo.icon, totals.total
  ORDER BY vote_count DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE arena_vote_options IS 'Voting options for loot/mode selection per event';
COMMENT ON TABLE arena_votes IS 'Team votes for loot/mode options';
