create table if not exists public.pending_bans (
  id uuid primary key default gen_random_uuid(),
  target_discord_id text not null,
  target_username text,
  reason text not null,
  proposed_by_discord_id text not null,
  proposed_by_username text not null,
  proposed_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'executed', 'rejected')),
  approvals jsonb not null default '[]'::jsonb,
  required_approvals int not null default 2,
  executed_at timestamptz,
  executed_by_discord_id text,
  executed_by_username text,
  rejection_reason text,
  rejected_by_discord_id text,
  rejected_by_username text,
  rejected_at timestamptz
);

create index if not exists pending_bans_status_idx on public.pending_bans (status);
create index if not exists pending_bans_target_idx on public.pending_bans (target_discord_id);
create index if not exists pending_bans_proposed_idx on public.pending_bans (proposed_at desc);

alter table public.pending_bans disable row level security;

comment on table public.pending_bans is 'Multi-signature ban proposals for non-owner admins';
comment on column public.pending_bans.approvals is 'Array of {discord_id, username, approved_at, note}';

-- Insert function to notify on new proposal
create or replace function notify_pending_ban()
returns trigger as $$
begin
  perform pg_notify(
    'pending_ban_created',
    json_build_object(
      'id', new.id,
      'target_username', new.target_username,
      'proposed_by', new.proposed_by_username
    )::text
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists pending_ban_notify on public.pending_bans;
create trigger pending_ban_notify
  after insert on public.pending_bans
  for each row
  execute function notify_pending_ban();
