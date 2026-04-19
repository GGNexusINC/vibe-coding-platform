-- Add metadata column to activity_logs table for tracking device/OS/IP info

-- Add metadata JSONB column
ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN activity_logs.metadata IS 'Extended activity metadata including page URL, IP, OS, browser, device type';

-- Example metadata structure:
-- {
--   "pageUrl": "/dashboard",
--   "ip": "192.168.1.1",
--   "os": "Windows",
--   "browser": "Chrome",
--   "device": "Desktop",
--   "userAgent": "Mozilla/5.0...",
--   "isAdmin": true,
--   "timestamp": "2026-04-18T22:10:00Z"
-- }
