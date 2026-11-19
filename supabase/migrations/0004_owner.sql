-- Each row belongs to the user who created it; users only see their own data.
-- Existing rows are given to the first (only) account.
alter table pieces add column if not exists owner_id uuid references auth.users(id) default auth.uid();
alter table projects add column if not exists owner_id uuid references auth.users(id) default auth.uid();
alter table project_parts add column if not exists owner_id uuid references auth.users(id) default auth.uid();

update pieces set owner_id = (select id from auth.users order by created_at limit 1) where owner_id is null;
update projects set owner_id = (select id from auth.users order by created_at limit 1) where owner_id is null;
update project_parts set owner_id = (select id from auth.users order by created_at limit 1) where owner_id is null;

alter table pieces alter column owner_id set not null;
alter table projects alter column owner_id set not null;
alter table project_parts alter column owner_id set not null;

drop policy if exists "signed-in users manage pieces" on pieces;
drop policy if exists "signed-in users manage projects" on projects;
drop policy if exists "signed-in users manage parts" on project_parts;
create policy "own pieces" on pieces for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own projects" on projects for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own parts" on project_parts for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
