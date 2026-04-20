-- Persistent active day tracking — never pruned.
-- Each row = one unique day a user was active.
-- Run this in Supabase Dashboard → SQL Editor

create table if not exists public.user_active_days (
  discord_id text not null,
  day date not null,
  primary key (discord_id, day)
);

create index if not exists user_active_days_discord_id_idx
  on public.user_active_days (discord_id);

alter table public.user_active_days enable row level security;

create policy "user_active_days_service_role_all"
on public.user_active_days
for all
to service_role
using (true)
with check (true);

-- Backfill from existing activity_logs
insert into public.user_active_days (discord_id, day)
select distinct discord_id, created_at::date
from public.activity_logs
where discord_id is not null
on conflict do nothing;
