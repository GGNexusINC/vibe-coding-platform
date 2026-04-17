-- site_settings: generic key/value store for admin-configurable site settings
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

-- service role can do anything
create policy "site_settings_service_all"
on public.site_settings for all
to service_role
using (true) with check (true);

-- anon/public can only read
create policy "site_settings_anon_read"
on public.site_settings for select
to anon
using (true);

create policy "site_settings_authenticated_read"
on public.site_settings for select
to authenticated
using (true);
