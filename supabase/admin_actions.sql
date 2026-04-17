create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor_discord_id text not null,
  actor_username text not null,
  target_discord_id text not null,
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists admin_actions_created_at_idx
  on public.admin_actions (created_at desc);

create index if not exists admin_actions_target_idx
  on public.admin_actions (target_discord_id);

alter table public.admin_actions enable row level security;

drop policy if exists "admin_actions_service_role_all" on public.admin_actions;
create policy "admin_actions_service_role_all"
on public.admin_actions
for all
to service_role
using (true)
with check (true);

drop policy if exists "admin_actions_anon_none" on public.admin_actions;
create policy "admin_actions_anon_none"
on public.admin_actions
for select
to anon
using (false);
