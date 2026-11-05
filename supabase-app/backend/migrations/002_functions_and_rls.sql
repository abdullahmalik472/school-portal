
-- ===================================================================================
-- Supabase, step 2 of 2: registration-ID function + Row Level Security.
--
-- Run AFTER 001_multi_tenant.sql when setting up a database.
--
-- IMPORTANT:
-- Duplicate emails are intentionally allowed within organizations.
-- Platform-admin emails remain unique.
--
-- Express backend uses the SERVICE-ROLE key and performs organization filtering
-- in backend code. These RLS policies protect direct authenticated access.
--
-- JWT claims:
-- organization_id, app_role, user_id
-- ===================================================================================


-- A. Atomic user creation + registration ID
-- -----------------------------------------------------------------------------------

create or replace function public.create_user_in_org(
  p_org bigint,
  p_name text,
  p_email text,
  p_hash text,
  p_role text
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_used int;
  v_next int;
  v_reg text;
  v_row public.users;
begin

  if p_org is not null and p_role in ('student', 'teacher') then

    select code
      into v_code
      from organizations
     where id = p_org
     for update;

    if not found then
      raise exception 'organization % not found', p_org
        using errcode = 'P0002';
    end if;

    select coalesce(
      max(
        substr(
          reg_id,
          length(v_code) +
          case when p_role = 'student' then 1 else 3 end
        )::int
      ),
      0
    )
    into v_used
    from users
    where organization_id = p_org
      and role = p_role
      and reg_id is not null;

    if p_role = 'student' then

      select greatest(student_seq, v_used) + 1
        into v_next
        from organizations
       where id = p_org;

      update organizations
         set student_seq = v_next
       where id = p_org;

    else

      select greatest(teacher_seq, v_used) + 1
        into v_next
        from organizations
       where id = p_org;

      update organizations
         set teacher_seq = v_next
       where id = p_org;

    end if;

    v_reg :=
      v_code ||
      case when p_role = 'teacher' then '-T' else '' end ||
      lpad(v_next::text, 4, '0');

  end if;

  insert into users (
    organization_id,
    reg_id,
    name,
    email,
    password_hash,
    role
  )
  values (
    p_org,
    v_reg,
    p_name,
    p_email,
    p_hash,
    p_role
  )
  returning * into v_row;

  return v_row;

end;
$$;


revoke all on function public.create_user_in_org(
  bigint, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.create_user_in_org(
  bigint, text, text, text, text
) to service_role;


-- B. JWT helper functions
-- -----------------------------------------------------------------------------------

create or replace function public.jwt_org_id()
returns bigint
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'organization_id', '')::bigint
$$;


create or replace function public.jwt_app_role()
returns text
language sql
stable
as $$
  select auth.jwt() ->> 'app_role'
$$;


create or replace function public.jwt_user_id()
returns bigint
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'user_id', '')::bigint
$$;


-- C. Table privileges
-- -----------------------------------------------------------------------------------

revoke all on organizations, users, courses from anon, authenticated;

grant select on organizations to authenticated;

grant select (
  id,
  organization_id,
  reg_id,
  name,
  email,
  role,
  created_at
) on users to authenticated;

-- Never expose password_hash through authenticated table access.
grant select, insert, update, delete on courses to authenticated;

grant insert, update on organizations to authenticated;


-- D. Row Level Security
-- -----------------------------------------------------------------------------------

alter table organizations enable row level security;
alter table users enable row level security;
alter table courses enable row level security;


-- Remove existing policies before recreating them.

drop policy if exists org_select on organizations;
drop policy if exists org_platform_write on organizations;

drop policy if exists users_select on users;

drop policy if exists courses_select on courses;
drop policy if exists courses_insert on courses;
drop policy if exists courses_update on courses;
drop policy if exists courses_delete on courses;


-- Organizations:
-- Users see their own organization.
-- Platform admins see and manage all organizations.

create policy org_select
on organizations
for select
to authenticated
using (
  id = (select public.jwt_org_id())
  or (select public.jwt_app_role()) = 'platform_admin'
);


create policy org_platform_write
on organizations
for all
to authenticated
using (
  (select public.jwt_app_role()) = 'platform_admin'
)
with check (
  (select public.jwt_app_role()) = 'platform_admin'
);


-- Users:
-- Users see themselves.
-- Organization admins see users in their organization.
-- Platform admins see all users.
-- Account creation and modification remain backend-only.

create policy users_select
on users
for select
to authenticated
using (
  id = (select public.jwt_user_id())

  or (
    organization_id = (select public.jwt_org_id())
    and (select public.jwt_app_role()) = 'admin'
  )

  or (select public.jwt_app_role()) = 'platform_admin'
);


-- Courses:
-- Organization members read their organization's courses.
-- Platform admins can read all courses.

create policy courses_select
on courses
for select
to authenticated
using (
  organization_id = (select public.jwt_org_id())
  or (select public.jwt_app_role()) = 'platform_admin'
);


-- Teachers create their own courses.
-- Organization admins can create courses for their organization.

create policy courses_insert
on courses
for insert
to authenticated
with check (
  organization_id = (select public.jwt_org_id())

  and (select public.jwt_app_role()) in ('teacher', 'admin')

  and (
    teacher_id = (select public.jwt_user_id())
    or (select public.jwt_app_role()) = 'admin'
  )
);


-- Teachers update their own courses.
-- Organization admins update courses in their organization.

create policy courses_update
on courses
for update
to authenticated
using (
  organization_id = (select public.jwt_org_id())

  and (
    (select public.jwt_app_role()) = 'admin'
    or teacher_id = (select public.jwt_user_id())
  )
)
with check (
  organization_id = (select public.jwt_org_id())
);


-- Teachers delete their own courses.
-- Organization admins delete courses in their organization.

create policy courses_delete
on courses
for delete
to authenticated
using (
  organization_id = (select public.jwt_org_id())

  and (
    (select public.jwt_app_role()) = 'admin'
    or teacher_id = (select public.jwt_user_id())
  )
);
