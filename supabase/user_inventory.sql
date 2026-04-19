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

-- Package logs for comprehensive tracking (admin given, user used, etc.)
CREATE TABLE IF NOT EXISTS package_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID REFERENCES user_inventory(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL, -- discord_id of the user who received/used the package
  user_name TEXT, -- cached username for display
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  action TEXT NOT NULL, -- 'admin_given', 'user_used', 'user_saved', 'admin_revoked', 'expired'
  action_by TEXT NOT NULL, -- discord_id of who performed the action (admin or user)
  action_by_name TEXT, -- cached name
  action_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB DEFAULT '{}', -- extra info like reason, wipe cycle, etc.
  discord_notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast log queries
CREATE INDEX IF NOT EXISTS idx_package_logs_user_id ON package_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_package_logs_action ON package_logs(action);
CREATE INDEX IF NOT EXISTS idx_package_logs_action_at ON package_logs(action_at DESC);
CREATE INDEX IF NOT EXISTS idx_package_logs_inventory_item ON package_logs(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_package_logs_action_by ON package_logs(action_by);

-- RLS for package logs
ALTER TABLE package_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view own package logs" ON package_logs
  FOR SELECT USING (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Admins can view all logs via service role
CREATE POLICY "Service role can view all logs" ON package_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Function to auto-create log entry when inventory item is created
CREATE OR REPLACE FUNCTION log_inventory_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO package_logs (
    inventory_item_id,
    user_id,
    item_name,
    item_type,
    action,
    action_by,
    details
  ) VALUES (
    NEW.id,
    NEW.user_id,
    NEW.item_name,
    NEW.item_type,
    'admin_given',
    COALESCE(NEW.metadata->>'given_by', NEW.user_id),
    jsonb_build_object(
      'status', NEW.status,
      'wipe_cycle', NEW.wipe_cycle,
      'purchase_date', NEW.purchase_date
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_inventory_created ON user_inventory;
CREATE TRIGGER trigger_log_inventory_created
  AFTER INSERT ON user_inventory
  FOR EACH ROW EXECUTE FUNCTION log_inventory_created();

-- Function to auto-create log entry when inventory item status changes
CREATE OR REPLACE FUNCTION log_inventory_status_change()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  action_by_id TEXT;
BEGIN
  -- Only log if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine action type
  CASE NEW.status
    WHEN 'used' THEN action_type := 'user_used';
    WHEN 'saved' THEN action_type := 'user_saved';
    WHEN 'available' THEN action_type := 'admin_restored';
    ELSE action_type := 'status_changed';
  END CASE;

  action_by_id := COALESCE(NEW.metadata->>'action_by', NEW.user_id);

  INSERT INTO package_logs (
    inventory_item_id,
    user_id,
    item_name,
    item_type,
    action,
    action_by,
    details
  ) VALUES (
    NEW.id,
    NEW.user_id,
    NEW.item_name,
    NEW.item_type,
    action_type,
    action_by_id,
    jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'used_date', NEW.used_date,
      'wipe_cycle', NEW.wipe_cycle,
      'metadata', NEW.metadata
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_inventory_update ON user_inventory;
CREATE TRIGGER trigger_log_inventory_update
  AFTER UPDATE ON user_inventory
  FOR EACH ROW EXECUTE FUNCTION log_inventory_status_change();

-- Function to log when inventory item is deleted (revoked)
CREATE OR REPLACE FUNCTION log_inventory_deleted()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO package_logs (
    inventory_item_id,
    user_id,
    item_name,
    item_type,
    action,
    action_by,
    details
  ) VALUES (
    OLD.id,
    OLD.user_id,
    OLD.item_name,
    OLD.item_type,
    'admin_revoked',
    COALESCE(OLD.metadata->>'deleted_by', 'system'),
    jsonb_build_object(
      'final_status', OLD.status,
      'wipe_cycle', OLD.wipe_cycle,
      'purchase_date', OLD.purchase_date,
      'used_date', OLD.used_date
    )
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_inventory_deleted ON user_inventory;
CREATE TRIGGER trigger_log_inventory_deleted
  BEFORE DELETE ON user_inventory
  FOR EACH ROW EXECUTE FUNCTION log_inventory_deleted();
