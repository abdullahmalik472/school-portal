-- Run ONCE in Supabase dashboard -> SQL Editor (only needed for the MySQL -> Supabase copy).
-- The copy matches courses by their MySQL id, so Supabase's courses table needs this column.
-- Safe to run again.
alter table courses add column if not exists mysql_id bigint;
create unique index if not exists courses_mysql_id_key on courses (mysql_id);
