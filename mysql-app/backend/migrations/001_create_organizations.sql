-- MySQL migration 1 of 4: the organizations table + your first organization (Beaconhouse Lahore = BHL).
-- Run ONCE, in order (001 -> 004), on the database that already has `users` and `courses`.
--   Command line:  mysql -u root -p school < migrations/001_create_organizations.sql
--   Workbench:     choose your schema (double-click `school`), open this file, run it (Ctrl+Shift+Enter).
-- BACK UP FIRST:   mysqldump -u root -p school > school_backup.sql

CREATE TABLE organizations (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(6)   NOT NULL UNIQUE,      -- BHL: goes into registration IDs (BHL0001), never changes
  name        VARCHAR(150) NOT NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  student_seq INT          NOT NULL DEFAULT 0,   -- last student number used
  teacher_seq INT          NOT NULL DEFAULT 0,   -- last teacher number used
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO organizations (code, name) VALUES ('BHL', 'Beaconhouse Lahore');

-- check:  SELECT * FROM organizations;   -> one row, BHL
