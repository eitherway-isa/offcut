-- Notes per cut-list part (e.g. "groove 6 mm", "drill holes first").
alter table project_parts add column if not exists notes text;
