-- Run once: Supabase dashboard -> SQL Editor -> New query -> paste -> Run
create table if not exists users (
  id            bigint generated always as identity primary key,
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  role          text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  created_at    timestamptz default now()
);

create table if not exists courses (
  id         bigint generated always as identity primary key,
  title      text not null,
  teacher_id bigint not null references users(id),
  created_at timestamptz default now()
);

-- Lock the tables for the public (anon) key. Our Express server uses the
-- service key, which bypasses these rules, so it still works.
alter table users   enable row level security;
alter table courses enable row level security;
