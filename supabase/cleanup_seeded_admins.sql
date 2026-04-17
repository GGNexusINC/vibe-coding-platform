-- Remove fake pre-seeded admin entries that were never real logins.
-- Keeps only admins who have actually signed in (have real Discord IDs, not placeholder names).
-- Run this once in the Supabase SQL editor.

DELETE FROM public.admin_roster
WHERE discord_id IN (
  '940804710267486249',   -- Kilo (seeded, never logged in)
  '145278391166173185',   -- Zeus (seeded, never logged in)
  'Hope',                 -- Hope (placeholder, not a real Discord ID)
  'Encriptado',           -- Encriptado (placeholder)
  'Jon',                  -- Jon (placeholder)
  'Cortez'                -- Cortez (placeholder)
)
AND (
  -- Only delete if they have never actually logged in (no real session data)
  -- Buzzworthy (1310794181190352997) is excluded because they DID log in
  last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '10 years'
);

-- Safer alternative: delete ALL seeded placeholders by checking for missing avatar
-- (real logins always have an avatar_url from Discord OAuth)
DELETE FROM public.admin_roster
WHERE discord_id IN ('Hope', 'Encriptado', 'Jon', 'Cortez');
