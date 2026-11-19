-- Stock pieces: full sheets, boards and offcuts. All dimensions in mm.
create type piece_kind as enum ('sheet', 'board', 'offcut');
create type grain_dir as enum ('length', 'width', 'none');
create type piece_status as enum ('available', 'reserved', 'used', 'discarded');

create sequence piece_label_seq;

create table pieces (
  id uuid primary key default gen_random_uuid(),
  label text not null unique
    default 'OC-' || lpad(nextval('piece_label_seq')::text, 4, '0'),
  kind piece_kind not null default 'offcut',
  material text not null,            -- e.g. 'Birch plywood', 'MDF', 'Oak'
  thickness_mm numeric(6,1) not null check (thickness_mm > 0),
  length_mm numeric(7,1) not null check (length_mm > 0),
  width_mm numeric(7,1) not null check (width_mm > 0),
  grain grain_dir not null default 'length',
  location text,                     -- e.g. 'Rack A', 'Bin 2'
  status piece_status not null default 'available',
  notes text,
  source_project_id uuid,            -- project that produced this offcut
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pieces_lookup on pieces (status, material, thickness_mm);

-- Single-user app for now: only signed-in users can read/write.
alter table pieces enable row level security;
create policy "signed-in users manage pieces" on pieces
  for all to authenticated using (true) with check (true);
