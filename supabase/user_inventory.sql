-- User inventory system for purchased items (insurance, packs, etc.)
CREATE TABLE IF NOT EXISTS user_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- discord_id
  item_type TEXT NOT NULL, -- 'insurance', 'pack', etc.
  item_slug TEXT NOT NULL, -- 'insurance', 'construction', etc.
  item_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- 'available', 'used', 'expired', 'saved'
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_date TIMESTAMPTZ,
  wipe_cycle TEXT, -- e.g., "wipe-2024-01-15"
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_status ON user_inventory(status);
CREATE INDEX IF NOT EXISTS idx_user_inventory_item_type ON user_inventory(item_type);
CREATE INDEX IF NOT EXISTS idx_user_inventory_wipe_cycle ON user_inventory(wipe_cycle);

-- RLS policies
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

-- Users can view their own inventory
CREATE POLICY "Users can view own inventory" ON user_inventory
  FOR SELECT USING (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Only admins can insert/update all records (via service role)
CREATE POLICY "Service role can manage inventory" ON user_inventory
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_inventory_updated_at ON user_inventory;
CREATE TRIGGER trigger_user_inventory_updated_at
  BEFORE UPDATE ON user_inventory
  FOR EACH ROW EXECUTE FUNCTION update_user_inventory_updated_at();

-- Wipe cycle tracking for insurance availability logic
CREATE TABLE IF NOT EXISTS wipe_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g., "wipe-2024-01-15"
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ, -- null if ongoing
  is_active BOOLEAN NOT NULL DEFAULT true,
  insurance_cutoff_hours INTEGER NOT NULL DEFAULT 96, -- 4 days = 96 hours before end
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wipe_cycles_active ON wipe_cycles(is_active);
CREATE INDEX IF NOT EXISTS idx_wipe_cycles_dates ON wipe_cycles(start_date, end_date);

-- RLS
ALTER TABLE wipe_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view wipe cycles" ON wipe_cycles FOR SELECT USING (true);
CREATE POLICY "Service role can manage wipe cycles" ON wipe_cycles FOR ALL USING (true) WITH CHECK (true);
