
-- MySQL migration 3 of 4:
-- Generate registration IDs for existing students and teachers.
--
-- Students: BHL0001, BHL0002 ...
-- Teachers: BHL-T0001, BHL-T0002 ...
-- Admins and platform admins receive no registration ID.
--
-- Run ONCE, after migration 002, on the old schema.

UPDATE users u
JOIN (
  SELECT
    x.id,
    x.role,
    o.code,
    ROW_NUMBER() OVER (
      PARTITION BY x.organization_id, x.role
      ORDER BY x.created_at, x.id
    ) AS n
  FROM users x
  JOIN organizations o
    ON o.id = x.organization_id
  WHERE x.role IN ('student', 'teacher')
    AND x.reg_id IS NULL
) r
  ON r.id = u.id
SET u.reg_id = CONCAT(
  r.code,
  IF(r.role = 'teacher', '-T', ''),
  LPAD(r.n, 4, '0')
);


-- Update organization counters so future registrations continue correctly.

UPDATE organizations o
SET
  student_seq = COALESCE(
    (
      SELECT MAX(
        CAST(
          SUBSTRING(reg_id, LENGTH(o.code) + 1)
          AS UNSIGNED
        )
      )
      FROM users
      WHERE organization_id = o.id
        AND role = 'student'
        AND reg_id IS NOT NULL
    ),
    0
  ),

  teacher_seq = COALESCE(
    (
      SELECT MAX(
        CAST(
          SUBSTRING(reg_id, LENGTH(o.code) + 3)
          AS UNSIGNED
        )
      )
      FROM users
      WHERE organization_id = o.id
        AND role = 'teacher'
        AND reg_id IS NOT NULL
    ),
    0
  );


-- Verification queries (run separately when needed):
--
-- SELECT id, organization_id, reg_id, role
-- FROM users
-- ORDER BY organization_id, role, reg_id;
--
-- SELECT code, student_seq, teacher_seq
-- FROM organizations;
