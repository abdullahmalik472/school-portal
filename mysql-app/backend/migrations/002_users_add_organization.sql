
-- MySQL migration 2 of 4:
-- Add organization support to the existing users table.
--
-- Run ONCE, after migration 001.
-- This migration is intended for the OLD single-organization schema.
--
-- Email rules:
-- 1. Duplicate emails are allowed within the same organization.
-- 2. The same email is allowed across different organizations.
-- 3. Platform-admin emails must remain unique.
--
-- IMPORTANT:
-- Do not execute this migration on a database that already has
-- organization_id, reg_id, org_key and platform_admin_email.

-- 1. Add organization columns.

ALTER TABLE users
  ADD COLUMN organization_id INT NULL AFTER id;

ALTER TABLE users
  ADD COLUMN reg_id VARCHAR(20) NULL AFTER organization_id;


-- 2. Add platform-admin role.

ALTER TABLE users
  MODIFY role ENUM(
    'student',
    'teacher',
    'admin',
    'platform_admin'
  ) NOT NULL DEFAULT 'student';


-- 3. Assign existing users to BHL.

UPDATE users
SET organization_id = (
  SELECT id
  FROM organizations
  WHERE code = 'BHL'
);


-- 4. Generated organization key.
-- Platform admins have organization_id NULL, represented by 0.

ALTER TABLE users
  ADD COLUMN org_key INT
  GENERATED ALWAYS AS (IFNULL(organization_id, 0)) STORED;


-- 5. Remove the old globally unique email index, if it exists.
-- This allows duplicate emails in normal organizations.

SET @drop_old_email_index = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE users DROP INDEX `email`',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND index_name = 'email'
);

PREPARE drop_email_stmt FROM @drop_old_email_index;
EXECUTE drop_email_stmt;
DEALLOCATE PREPARE drop_email_stmt;


-- 6. Non-unique email lookup index.
-- Duplicate emails are intentionally allowed.

ALTER TABLE users
  ADD INDEX idx_users_org_email (org_key, email);


-- 7. Platform-admin email uniqueness.
-- Generated column is NULL for organization users.
-- MySQL unique indexes permit multiple NULL values.

ALTER TABLE users
  ADD COLUMN platform_admin_email VARCHAR(150)
  GENERATED ALWAYS AS (
    CASE
      WHEN organization_id IS NULL THEN email
      ELSE NULL
    END
  ) STORED;

ALTER TABLE users
  ADD UNIQUE KEY uq_platform_admin_email (platform_admin_email);


-- 8. Registration IDs unique within each organization.

ALTER TABLE users
  ADD UNIQUE KEY uq_users_org_reg (organization_id, reg_id);


-- 9. Required for same-organization teacher/course relationship.

ALTER TABLE users
  ADD UNIQUE KEY uq_users_id_org (id, organization_id);


-- 10. Organization foreign key.

ALTER TABLE users
  ADD CONSTRAINT fk_users_org
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id);


-- 11. Platform admins must have no organization.
-- All other roles must belong to an organization.

ALTER TABLE users
  ADD CONSTRAINT chk_users_org_role
  CHECK (
    (role = 'platform_admin') = (organization_id IS NULL)
  );


-- Verification queries (run separately when needed):
--
-- SELECT id, organization_id, email, role FROM users;
--
-- SHOW CREATE TABLE users;
