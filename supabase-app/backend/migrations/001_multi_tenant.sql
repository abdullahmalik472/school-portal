
-- ===================================================================================
-- Supabase, step 1 of 2: multi-organization schema.
--
-- Run in: Supabase SQL Editor.
-- Safe to run again on an existing database.
--
-- Existing users/courses without an organization are assigned to BHL.
--
-- IMPORTANT:
-- Duplicate emails are intentionally allowed, including within the same organization.
-- Registration IDs remain unique within each organization.
-- ===================================================================================

begin;

-- 1. Organizations
-- -----------------------------------------------------------------------------------

create table if not exists organizations (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[A-Z][A-Z0-9]{1,5}$'),
  name text not null,
  is_active boolean not null default true,
  student_seq integer not null default 0,
  teacher_seq integer not null default 0,
  created_at timestamptz default now()
);

insert into organizations (code, name)
values ('BHL', 'Beaconhouse Lahore')
on conflict (code) do nothing;


-- 2. Users
-- -----------------------------------------------------------------------------------

alter table users
  add column if not exists organization_id bigint references organizations(id);

alter table users
  add column if not exists reg_id text;

-- Allow the platform_admin role.
alter table users drop constraint if exists users_role_check;

alter table users
  add constraint users_role_check
  check (role in ('student', 'teacher', 'admin', 'platform_admin'));

-- Existing non-platform-admin users belong to BHL if organization is missing.
update users
set organization_id = (
  select id from organizations where code = 'BHL'
)
where organization_id is null
  and role <> 'platform_admin';

-- Platform admins have no organization.
alter table users drop constraint if exists users_org_role_chk;

alter table users
  add constraint users_org_role_chk
  check ((role = 'platform_admin') = (organization_id is null));


-- 3. Email indexes
-- -----------------------------------------------------------------------------------

-- Remove old global/per-organization unique email constraints if present.
-- Duplicate emails are intentionally allowed in this project.

alter table users drop constraint if exists users_email_key;
alter table users drop constraint if exists users_org_email_key;

-- Normal index only: NOT UNIQUE.
create index if not exists idx_users_org_email
  on users (organization_id, email);

-- Platform-admin emails remain unique.
create unique index if not exists users_platform_email_key
  on users (email)
  where organization_id is null;


-- 4. Registration IDs
-- -----------------------------------------------------------------------------------

-- Existing students and teachers receive registration IDs.
-- Examples: BHL0001 and BHL-T0001.

with ranked as (
  select
    u.id,
    u.role,
    o.code,
    row_number() over (
      partition by u.organization_id, u.role
      order by u.id
    ) + case
          when u.role = 'student' then o.student_seq
          else o.teacher_seq
        end as n
  from users u
  join organizations o
    on o.id = u.organization_id
  where u.reg_id is null
    and u.role in ('student', 'teacher')
)
update users u
set reg_id =
  r.code ||
  case when r.role = 'teacher' then '-T' else '' end ||
  lpad(r.n::text, 4, '0')
from ranked r
where u.id = r.id;


-- 5. Update organization registration counters
-- -----------------------------------------------------------------------------------

update organizations o
set
  student_seq = greatest(
    o.student_seq,
    coalesce(
      (
        select max(
          substr(reg_id, length(o.code) + 1)::int
        )
        from users
        where organization_id = o.id
          and role = 'student'
          and reg_id is not null
      ),
      0
    )
  ),

  teacher_seq = greatest(
    o.teacher_seq,
    coalesce(
      (
        select max(
          substr(reg_id, length(o.code) + 3)::int
        )
        from users
        where organization_id = o.id
          and role = 'teacher'
          and reg_id is not null
      ),
      0
    )
  );


-- 6. User constraints
-- -----------------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_org_reg_key'
  ) then
    alter table users
      add constraint users_org_reg_key
      unique (organization_id, reg_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_id_org_key'
  ) then
    alter table users
      add constraint users_id_org_key
      unique (id, organization_id);
  end if;
end
$$;


-- 7. Courses
-- -----------------------------------------------------------------------------------

alter table courses
  add column if not exists organization_id bigint references organizations(id);

-- Assign existing courses to their teacher's organization.
update courses c
set organization_id = u.organization_id
from users u
where u.id = c.teacher_id
  and c.organization_id is null;

alter table courses
  alter column organization_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_teacher_same_org'
  ) then
    alter table courses
      add constraint courses_teacher_same_org
      foreign key (teacher_id, organization_id)
      references users (id, organization_id);
  end if;
end
$$;

create index if not exists courses_org_created_idx
  on courses (organization_id, created_at);


-- 8. MySQL synchronization
-- -----------------------------------------------------------------------------------

alter table courses
  add column if not exists mysql_id bigint;

create unique index if not exists courses_mysql_id_key
  on courses (mysql_id);


commit;

-- Next: run 002_functions_and_rls.sql after reviewing it.
