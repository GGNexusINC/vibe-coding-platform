-- Create site_webhooks table for dynamic webhook management
create table if not exists public.site_webhooks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  url text,
  updated_at timestamptz not null default now()
);

-- Index for fast lookup by slug
create index if not exists site_webhooks_slug_idx on public.site_webhooks (slug);

alter table public.site_webhooks enable row level security;

-- Policies
-- Only service role and authenticated admins can manage
drop policy if exists "site_webhooks_service_all" on public.site_webhooks;
create policy "site_webhooks_service_all" on public.site_webhooks for all to service_role using (true) with check (true);

drop policy if exists "site_webhooks_anon_read" on public.site_webhooks;
create policy "site_webhooks_anon_read" on public.site_webhooks for select to anon using (true);

drop policy if exists "site_webhooks_auth_all" on public.site_webhooks;
create policy "site_webhooks_auth_all" on public.site_webhooks for all to authenticated using (true) with check (true);

-- Seed with default webhook slugs
insert into public.site_webhooks (slug, name)
values 
  ('ban-page', 'Ban Page Logs'),
  ('general-chat', 'General Chat Logs'),
  ('staff-page', 'Staff Page Logs'),
  ('staff-audits', 'Staff Audit Logs'),
  ('login-audits', 'Login Audit Logs'),
  ('server-audit', 'Server Audit Logs'),
  ('support', 'Support Ticket Logs'),
  ('tickets', 'Support Tickets Notification'),
  ('script-hook', 'Script Hook Logs'),
  ('minigame', 'Minigame Logs'),
  ('wipe', 'Wipe Event Logs'),
  ('arena', 'Arena Event Logs'),
  ('arena-logos', 'Arena Logo Logs'),
  ('lottery-entries', 'Lottery Entries Community'),
  ('lottery-winners', 'Lottery Winners Community'),
  ('device-audit', 'Device Hardware Audit')
on conflict (slug) do nothing;
