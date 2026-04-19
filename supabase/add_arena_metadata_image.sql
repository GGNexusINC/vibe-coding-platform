-- Add metadata JSONB column and image_url to arena_events
-- For VC assignments and event images

-- Add image_url column
ALTER TABLE arena_events 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add metadata JSONB column for flexible event data (VC assignments, etc.)
ALTER TABLE arena_events 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Add comment explaining the metadata structure
COMMENT ON COLUMN arena_events.metadata IS 'JSONB containing: vc_assignments (array of team_id, vc_channel, team_name, leader_username)';

COMMENT ON COLUMN arena_events.image_url IS 'Event banner/poster image URL';
