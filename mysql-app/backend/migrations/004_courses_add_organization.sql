
-- MySQL migration 4 of 4:
-- Every course belongs to its teacher's organization.
--
-- Run ONCE, after migration 003.
-- Intended for the old schema where courses do not yet have organization_id.

-- 1. Add organization column.

ALTER TABLE courses
  ADD COLUMN organization_id INT NULL AFTER id;


-- 2. Assign each course to its teacher's organization.

UPDATE courses c
JOIN users u
  ON u.id = c.teacher_id
SET c.organization_id = u.organization_id;


-- 3. Safety check:
-- Stop if any course could not receive a valid organization.

DELIMITER $$

CREATE PROCEDURE check_course_organizations()
BEGIN
  IF EXISTS (
    SELECT 1
    FROM courses
    WHERE organization_id IS NULL
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT =
        'Migration stopped: some courses have no teacher organization';
  END IF;
END$$

DELIMITER ;

CALL check_course_organizations();

DROP PROCEDURE check_course_organizations;

-- 4. Make organization mandatory.

ALTER TABLE courses
  MODIFY organization_id INT NOT NULL;


-- 5. Organization foreign key.

ALTER TABLE courses
  ADD CONSTRAINT fk_courses_org
  FOREIGN KEY (organization_id)
  REFERENCES organizations(id);


-- 6. A course can only have a teacher from its own organization.

ALTER TABLE courses
  ADD CONSTRAINT fk_courses_teacher_same_org
  FOREIGN KEY (teacher_id, organization_id)
  REFERENCES users(id, organization_id);


-- 7. Organization-based course listing index.

ALTER TABLE courses
  ADD INDEX idx_courses_org_created (organization_id, created_at);


-- Verification queries (run separately when needed):
--
-- SELECT id, organization_id, title
-- FROM courses;
--
-- SELECT c.id, c.title, c.organization_id, u.organization_id AS teacher_org
-- FROM courses c
-- JOIN users u ON u.id = c.teacher_id
-- WHERE c.organization_id <> u.organization_id;
