-- Projects and their cut lists. A part can be assigned to one stock piece.
create type project_status as enum ('planning', 'in_progress', 'done');

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status project_status not null default 'planning',
  notes text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table project_parts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,                 -- e.g. 'Side panel'
  material text not null,
  thickness_mm numeric(6,1) not null check (thickness_mm > 0),
  length_mm numeric(7,1) not null check (length_mm > 0),  -- along the grain when grain matters
  width_mm numeric(7,1) not null check (width_mm > 0),
  grain_matters boolean not null default true,
  piece_id uuid references pieces(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table pieces
  add constraint pieces_source_project_fk foreign key (source_project_id) references projects(id) on delete set null;

alter table projects enable row level security;
alter table project_parts enable row level security;
create policy "signed-in users manage projects" on projects for all to authenticated using (true) with check (true);
create policy "signed-in users manage parts" on project_parts for all to authenticated using (true) with check (true);
grant select, insert, update, delete on projects, project_parts to authenticated;
