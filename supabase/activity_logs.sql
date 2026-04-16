create table if not exists public.activity_logs (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now(),
  username text,
  discord_id text,
  avatar_url text,
  global_name text,
  discriminator text,
  profile jsonb,
  details text not null
);

create index if not exists activity_logs_created_at_idx
  on public.activity_logs (created_at desc);

create index if not exists activity_logs_discord_id_idx
  on public.activity_logs (discord_id);

alter table public.activity_logs enable row level security;

drop policy if exists "activity_logs_service_role_all" on public.activity_logs;
create policy "activity_logs_service_role_all"
on public.activity_logs
for all
to service_role
using (true)
with check (true);
