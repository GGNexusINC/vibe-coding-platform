-- Create borrow_requests table for staff borrowing money
CREATE TABLE IF NOT EXISTS public.borrow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT NOT NULL,
  username TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  preferred_cycle TEXT NOT NULL, -- 'weekly', 'biweekly', 'monthly'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by TEXT, -- discord_id of admin
  approver_name TEXT, -- username of admin
  admin_reasoning TEXT, -- mandatory admin feedback
  payment_frequency TEXT, -- approved schedule: 'weekly', 'biweekly', 'monthly'
  installments INTEGER, -- count of payments
  amount_per_cycle NUMERIC, -- amount to repay per cycle
  payment_start_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_borrow_requests_discord_id ON public.borrow_requests(discord_id);
CREATE INDEX IF NOT EXISTS idx_borrow_requests_status ON public.borrow_requests(status);

-- Disable Row Level Security to allow server-side admin client access (similar to user_profiles)
ALTER TABLE public.borrow_requests DISABLE ROW LEVEL SECURITY;
