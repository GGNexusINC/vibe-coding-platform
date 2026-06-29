-- Points redemption tracking (supplement to add_points_system.sql)
-- Run this AFTER add_points_system.sql

-- No additional tables needed — redemptions are tracked via:
-- 1. points_ledger (negative amount entries with reason = "Redeemed: ...")
-- 2. user_inventory (item_type = 'reward', status = 'pending')

-- Optional: Add a view for quick admin lookup of all redemptions
CREATE OR REPLACE VIEW points_redemptions AS
SELECT
  pl.id,
  pl.discord_id,
  up.username,
  ABS(pl.amount) AS points_spent,
  pl.reason,
  pl.metadata->>'item_slug' AS reward_slug,
  pl.created_at AS redeemed_at
FROM points_ledger pl
LEFT JOIN user_profiles up ON up.discord_id = pl.discord_id
WHERE pl.amount < 0
ORDER BY pl.created_at DESC;
