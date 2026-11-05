
-- ===================================================================================
-- Supabase, step 0: convert the OLD UUID-based organization design into the
-- BIGINT-based multi-tenant design used by migrations 001/002 and MySQL.
--
-- OLD DESIGN:
-- UUID organization IDs, organization_code, status, registration_id,
-- is_platform_admin.
--
-- NEW DESIGN:
-- BIGINT organization IDs, code, is_active, reg_id,
-- role 'platform_admin' with no organization.
--
-- Run ONCE, BEFORE 001 and 002, ONLY on the old UUID-based database.
--
-- IMPORTANT:
-- Do NOT run this on the current local database.
-- Your current local database already uses BIGINT organization IDs.
--
-- Everything is inside one transaction.
-- If any step fails, the transaction rolls back.
--
-- The old organizations table is preserved as organizations_old_backup.
-- ===================================================================================

BEGIN;


-- 0. Safety checks
-- -----------------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.organizations_old_backup') IS NOT NULL THEN
    RAISE EXCEPTION
      'organizations_old_backup already exists: conversion was already run';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'organization_code'
  ) THEN
    RAISE EXCEPTION
      'organizations has no organization_code column: this is not the old UUID design';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM courses c
    JOIN users u ON u.id = c.teacher_id
    WHERE u.is_platform_admin
  ) THEN
    RAISE EXCEPTION
      'A platform admin owns courses; reassign them before converting';
  END IF;
END
$$;


-- 1. Drop old policies
-- -----------------------------------------------------------------------------------

DROP POLICY IF EXISTS organizations_tenant_read ON organizations;
DROP POLICY IF EXISTS users_tenant_read ON users;
DROP POLICY IF EXISTS courses_tenant_read ON courses;


-- 2. Drop old constraints and indexes that depend on UUID organization IDs
-- -----------------------------------------------------------------------------------

ALTER TABLE courses
  DROP CONSTRAINT IF EXISTS fk_courses_teacher_same_organization;

ALTER TABLE courses
  DROP CONSTRAINT IF EXISTS fk_courses_organization;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS fk_users_organization;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS uq_users_id_org;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS uq_users_org_email;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS uq_users_org_registration;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_org_email_key;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_org_reg_key;

DROP INDEX IF EXISTS idx_users_organization_role;
DROP INDEX IF EXISTS idx_courses_organization;


-- 3. Preserve the old organizations table and assign numeric IDs
-- -----------------------------------------------------------------------------------

ALTER TABLE organizations
  RENAME TO organizations_old_backup;

ALTER TABLE organizations_old_backup
  RENAME CONSTRAINT organizations_pkey
  TO organizations_old_backup_pkey;

ALTER TABLE organizations_old_backup
  ADD COLUMN new_id BIGINT;

UPDATE organizations_old_backup b
SET new_id = r.n
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at, id) AS n
  FROM organizations_old_backup
) r
WHERE r.id = b.id;

ALTER TABLE organizations_old_backup
  ENABLE ROW LEVEL SECURITY;


-- 4. Create the new organizations table
-- -----------------------------------------------------------------------------------

CREATE TABLE organizations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT NOT NULL UNIQUE
    CHECK (code ~ '^[A-Z][A-Z0-9]{1,5}$'),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  student_seq INTEGER NOT NULL DEFAULT 0,
  teacher_seq INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO organizations (
  id,
  code,
  name,
  is_active,
  student_seq,
  teacher_seq,
  created_at
)
OVERRIDING SYSTEM VALUE
SELECT
  new_id,
  organization_code,
  name,
  status = 'active',
  GREATEST(next_student_number - 1, 0),
  GREATEST(next_teacher_number - 1, 0),
  created_at
FROM organizations_old_backup
ORDER BY new_id;

SELECT SETVAL(
  pg_get_serial_sequence('public.organizations', 'id'),
  (SELECT MAX(id) FROM organizations)
);


-- 5. Convert users
-- -----------------------------------------------------------------------------------

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD COLUMN org_new BIGINT;

UPDATE users u
SET org_new = b.new_id
FROM organizations_old_backup b
WHERE b.id = u.organization_id;

ALTER TABLE users
  DROP COLUMN organization_id;

ALTER TABLE users
  RENAME COLUMN org_new TO organization_id;

ALTER TABLE users
  RENAME COLUMN registration_id TO reg_id;

ALTER TABLE users
  ALTER COLUMN reg_id TYPE TEXT;


-- Convert platform-admin flag into platform_admin role.
-- Platform admins have no organization.

UPDATE users
SET
  role = 'platform_admin',
  organization_id = NULL,
  reg_id = NULL
WHERE is_platform_admin;

ALTER TABLE users
  DROP COLUMN is_platform_admin;


-- Add new organization and role constraints.

ALTER TABLE users
  ADD CONSTRAINT users_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id);

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (
    role IN ('student', 'teacher', 'admin', 'platform_admin')
  );

ALTER TABLE users
  ADD CONSTRAINT users_org_role_chk
  CHECK (
    (role = 'platform_admin') = (organization_id IS NULL)
  );


-- Email behavior:
-- Duplicate emails are intentionally allowed within organizations.
-- A normal index supports email lookups without enforcing uniqueness.

CREATE INDEX IF NOT EXISTS idx_users_org_email
  ON users (organization_id, email);


-- Platform-admin emails remain unique.

CREATE UNIQUE INDEX IF NOT EXISTS users_platform_email_key
  ON users (email)
  WHERE organization_id IS NULL;


-- Registration IDs remain unique within each organization.

ALTER TABLE users
  ADD CONSTRAINT users_org_reg_key
  UNIQUE (organization_id, reg_id);


-- Required for the same-organization teacher/course foreign key.

ALTER TABLE users
  ADD CONSTRAINT users_id_org_key
  UNIQUE (id, organization_id);


-- 6. Convert courses
-- -----------------------------------------------------------------------------------

ALTER TABLE courses
  ADD COLUMN org_new BIGINT;

UPDATE courses c
SET org_new = b.new_id
FROM organizations_old_backup b
WHERE b.id = c.organization_id;

ALTER TABLE courses
  DROP COLUMN organization_id;

ALTER TABLE courses
  RENAME COLUMN org_new TO organization_id;

ALTER TABLE courses
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE courses
  ALTER COLUMN mysql_id TYPE BIGINT;


ALTER TABLE courses
  ADD CONSTRAINT courses_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id);


-- A course can only belong to the same organization as its teacher.

ALTER TABLE courses
  ADD CONSTRAINT courses_teacher_same_org
  FOREIGN KEY (teacher_id, organization_id)
  REFERENCES users (id, organization_id);


CREATE INDEX courses_org_created_idx
  ON courses (organization_id, created_at);


-- 7. Ensure registration counters include the highest existing IDs
-- -----------------------------------------------------------------------------------

UPDATE organizations o
SET
  student_seq = GREATEST(
    o.student_seq,
    COALESCE(
      (
        SELECT MAX(
          SUBSTR(reg_id, LENGTH(o.code) + 1)::INTEGER
        )
        FROM users
        WHERE organization_id = o.id
          AND role = 'student'
          AND reg_id IS NOT NULL
      ),
      0
    )
  ),

  teacher_seq = GREATEST(
    o.teacher_seq,
    COALESCE(
      (
        SELECT MAX(
          SUBSTR(reg_id, LENGTH(o.code) + 3)::INTEGER
        )
        FROM users
        WHERE organization_id = o.id
          AND role = 'teacher'
          AND reg_id IS NOT NULL
      ),
      0
    )
  );


-- 8. Final safety check
-- -----------------------------------------------------------------------------------

DO $$
BEGIN
  IF (
    SELECT COUNT(*) FROM organizations
  ) <> (
    SELECT COUNT(*) FROM organizations_old_backup
  ) THEN
    RAISE EXCEPTION
      'Organization count changed during conversion';
  END IF;
END
$$;


COMMIT;
