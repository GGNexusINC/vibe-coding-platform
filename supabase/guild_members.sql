-- Guild members table — synced by the Discord bot every 10 minutes
create table if not exists public.guild_members (
  discord_id   text primary key,
  username     text not null,
  display_name text not null,
  avatar_url   text,
  is_bot       boolean not null default false,
  joined_at    timestamptz,
  roles        text[] default '{}',
  last_synced  timestamptz not null default now()
);

-- Index for fast non-bot lookups
create index if not exists guild_members_is_bot_idx on public.guild_members (is_bot);
create index if not exists guild_members_display_name_idx on public.guild_members (display_name);

-- RLS: allow service role full access, anon read-only
alter table public.guild_members enable row level security;

create policy "service role full access" on public.guild_members
  for all using (true) with check (true);
