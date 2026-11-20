-- Per-user workshop settings.
create table if not exists user_settings (
  owner_id uuid primary key references auth.users(id) default auth.uid(),
  kerf_mm numeric(4,1) not null default 3
);
alter table user_settings enable row level security;
drop policy if exists "own settings" on user_settings;
create policy "own settings" on user_settings for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
grant select, insert, update on user_settings to authenticated;
