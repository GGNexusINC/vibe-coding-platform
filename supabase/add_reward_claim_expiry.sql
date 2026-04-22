ALTER TABLE public.user_inventory
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_inventory_expires_at
  ON public.user_inventory (expires_at);

-- Reward items use the regular inventory lifecycle, but expire after 48 hours.
-- The app populates expires_at for lottery and Whack-a-Mole winnings.
