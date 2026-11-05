
const mysql = require('mysql2/promise')

// Database SSL configuration
const ssl = process.env.DB_CA
  ? { ca: process.env.DB_CA.replace(/\\n/g, '\n') }
  : process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl,
})

// Temporary database diagnostics
async function checkDatabase() {
  try {
    const [identity] = await pool.query(`
      SELECT @@hostname AS hostname,
             @@port AS port,
             DATABASE() AS database_name,
             VERSION() AS version
    `)

    console.log('BACKEND DATABASE:', identity[0])

    const [constraints] = await pool.query(`
      SELECT CONSTRAINT_NAME, CHECK_CLAUSE
      FROM information_schema.CHECK_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
    `)

    console.log('BACKEND CHECK CONSTRAINTS:', constraints)

    const [table] = await pool.query('SHOW CREATE TABLE users')

    console.log('BACKEND USERS TABLE:', table[0])
  } catch (error) {
    console.error('DATABASE DIAGNOSTIC ERROR:', error)
  }
}

checkDatabase()

pool.query('SELECT 1').then(
  () => console.log(
    `MySQL connected (${process.env.DB_HOST}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME})`
  ),
  (err) => console.error(
    `!! MySQL connection FAILED: ${err.code} - ${err.message}`
  )
)

const all = async (sql, params = []) =>
  (await pool.query(sql, params))[0]

const one = async (sql, params = []) =>
  (await all(sql, params))[0]

module.exports = {
  // Find one user by email
  findUserByEmail: (email) =>
    one(`
      SELECT
        u.*,
        o.name AS organization_name,
        o.code AS organization_code
      FROM users u
      LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE u.email = ?
    `, [email]),

  // Find all accounts belonging to an email
  findUsersByEmail: (email) =>
    all(`
      SELECT
        u.*,
        o.name AS organization_name,
        o.code AS organization_code
      FROM users u
      LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE u.email = ?
      ORDER BY u.id
    `, [email]),

  // Find organizations belonging to an email
  listOrganizationsForEmail: (email) =>
    all(`
      SELECT DISTINCT
        o.id,
        o.name,
        o.code
      FROM users u
      INNER JOIN organizations o ON o.id = u.organization_id
      WHERE u.email = ?
      ORDER BY o.name
    `, [email]),

  // Find user by ID
  findUserById: (id) =>
    one(`
      SELECT
        u.*,
        o.name AS organization_name,
        o.code AS organization_code
      FROM users u
      LEFT JOIN organizations o ON o.id = u.organization_id
      WHERE u.id = ?
    `, [id]),

  // List users with organization details
  listUsers: () =>
    all(`
      SELECT
        u.id,
        u.organization_id,
        u.reg_id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        o.name AS organization_name,
        o.code AS organization_code
      FROM users u
      LEFT JOIN organizations o
        ON o.id = u.organization_id
      ORDER BY u.id
    `),

  // List organizations
  listOrganizations: () =>
    all(`
      SELECT id, name, code, is_active
      FROM organizations
      ORDER BY name
    `),

  // Create organization
  async createOrganization({ code, name }) {
    const cleanCode = String(code).trim().toUpperCase()
    const cleanName = String(name).trim()

    if (!/^[A-Z0-9]{2,6}$/.test(cleanCode)) {
      throw new Error('Organization code must be 2-6 letters or numbers')
    }

    if (!cleanName) {
      throw new Error('Organization name is required')
    }

    const [result] = await pool.query(
      `INSERT INTO organizations (code, name) VALUES (?, ?)`,
      [cleanCode, cleanName]
    )

    return {
      id: result.insertId,
      code: cleanCode,
      name: cleanName,
    }
  },

  // Create user and generate organization-based registration ID
  async createUser(user) {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const {
        name,
        email,
        password_hash,
        role,
        organization_id,
      } = user

      if (!['student', 'teacher', 'admin'].includes(role)) {
        throw new Error('Invalid user role')
      }

      if (!organization_id) {
        throw new Error('Please select an organization')
      }

      // Lock organization row to prevent duplicate serial numbers
      const [organizations] = await connection.query(
        `SELECT id, code, student_seq, teacher_seq, is_active
         FROM organizations
         WHERE id = ?
         FOR UPDATE`,
        [organization_id]
      )

      const organization = organizations[0]

      if (!organization || !organization.is_active) {
        throw new Error('Invalid or inactive organization')
      }

      let reg_id = null

      if (role === 'student') {
        const next = organization.student_seq + 1

        reg_id = `${organization.code}${String(next).padStart(3, '0')}`

        await connection.query(
          `UPDATE organizations
           SET student_seq = ?
           WHERE id = ?`,
          [next, organization.id]
        )
      }

      if (role === 'teacher') {
        const next = organization.teacher_seq + 1

        reg_id = `${organization.code}-T${String(next).padStart(3, '0')}`

        await connection.query(
          `UPDATE organizations
           SET teacher_seq = ?
           WHERE id = ?`,
          [next, organization.id]
        )
      }

      const newUser = {
        organization_id: organization.id,
        reg_id,
        name,
        email,
        password_hash,
        role,
      }

      const [result] = await connection.query(
        'INSERT INTO users SET ?',
        [newUser]
      )

      await connection.commit()

      return {
        id: result.insertId,
        ...newUser,
      }
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  },

  // Courses
  listCourses: () =>
    all(`
      SELECT c.id, c.title, u.name AS teacher
      FROM courses c
      JOIN users u ON u.id = c.teacher_id
      ORDER BY c.id DESC
    `),

  async createCourse(course) {
    const [result] = await pool.query(
      'INSERT INTO courses SET ?',
      course
    )

    return { id: result.insertId, ...course }
  },

  // MySQL -> Supabase sync
  listAllUsers: () =>
    all(`
      SELECT name, email, password_hash, role, created_at
      FROM users
      ORDER BY id
    `),

  listAllCourses: () =>
    all(`
      SELECT c.id, c.title, c.created_at,
             u.email AS teacher_email
      FROM courses c
      JOIN users u ON u.id = c.teacher_id
      ORDER BY c.id
    `),

  // Scheduled reports
  listStudentsSince: (minutes) =>
    all(`
      SELECT id, name, email, created_at
      FROM users
      WHERE role = 'student'
        AND created_at >= NOW() - INTERVAL ? MINUTE
      ORDER BY id
    `, [minutes]),

  listCoursesSince: (minutes) =>
    all(`
      SELECT c.id, c.title, u.name AS teacher, c.created_at
      FROM courses c
      JOIN users u ON u.id = c.teacher_id
      WHERE c.created_at >= NOW() - INTERVAL ? MINUTE
      ORDER BY c.id
    `, [minutes]),
}
