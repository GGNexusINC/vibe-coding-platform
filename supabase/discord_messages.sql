create table if not exists public.discord_messages (
  id text primary key,
  channel_id text not null,
  channel_name text not null,
  author_id text not null,
  author_username text not null,
  author_avatar text,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists discord_messages_channel_idx
  on public.discord_messages (channel_id, created_at desc);

create index if not exists discord_messages_created_at_idx
  on public.discord_messages (created_at desc);

alter table public.discord_messages enable row level security;

drop policy if exists "discord_messages_service_role_all" on public.discord_messages;
create policy "discord_messages_service_role_all"
on public.discord_messages
for all
to service_role
using (true)
with check (true);

drop policy if exists "discord_messages_anon_read" on public.discord_messages;
create policy "discord_messages_anon_read"
on public.discord_messages
for select
to anon
using (true);
