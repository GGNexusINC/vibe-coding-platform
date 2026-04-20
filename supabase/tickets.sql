create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  guest_email text,
  guest_username text not null,
  subject text not null,
  message text not null,
  discord_channel_id text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tickets_user_id_idx on public.tickets (user_id);
create index if not exists tickets_status_idx on public.tickets (status);
create index if not exists tickets_discord_channel_idx on public.tickets (discord_channel_id);

alter table public.tickets enable row level security;

-- Allow service role full access
drop policy if exists "tickets_service_role_all" on public.tickets;
create policy "tickets_service_role_all"
on public.tickets
for all
to service_role
using (true)
with check (true);

-- Allow users to see their own tickets
drop policy if exists "tickets_user_select" on public.tickets;
create policy "tickets_user_select"
on public.tickets
for select
to authenticated
using (user_id = auth.uid());

-- Allow users to create tickets
drop policy if exists "tickets_user_insert" on public.tickets;
create policy "tickets_user_insert"
on public.tickets
for insert
to authenticated, anon
with check (true);

-- Allow anon/service role to update ticket status (needed when service role key unavailable)
drop policy if exists "tickets_anon_update" on public.tickets;
create policy "tickets_anon_update"
on public.tickets
for update
to anon, authenticated
using (true)
with check (true);

-- Allow anon to select all tickets (admin panel uses anon key fallback)
drop policy if exists "tickets_admin_select_all" on public.tickets;
create policy "tickets_admin_select_all"
on public.tickets
for select
to anon
using (true);
