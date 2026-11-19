-- Track which pieces already have a sticker, so the labels page can preselect new ones.
alter table pieces add column if not exists label_printed_at timestamptz;
