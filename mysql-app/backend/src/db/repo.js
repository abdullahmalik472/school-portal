// The ONLY file that knows about MySQL. Routes just call these functions.
const mysql = require('mysql2/promise')

// Cloud databases (Aiven etc.) only accept encrypted connections. Local MySQL needs none of this.
//   DB_CA=<certificate text>  -> encrypted AND the server's identity is verified (best)
//   DB_SSL=true               -> encrypted, certificate not verified (quick way to get started)
//   neither set               -> plain connection, exactly as before (your local MySQL, Railway private network)
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

// Test the connection once at startup so problems show up immediately in the logs
pool.query('SELECT 1').then(
  () => console.log(`MySQL connected (${process.env.DB_HOST}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME})`),
  (err) => console.error(`!! MySQL connection FAILED: ${err.code} - ${err.message}`)
)

const all = async (sql, params) => (await pool.query(sql, params))[0]
const one = async (sql, params) => (await all(sql, params))[0]

module.exports = {
  findUserByEmail: (email) => one('SELECT * FROM users WHERE email = ?', [email]),
  findUserById: (id) => one('SELECT * FROM users WHERE id = ?', [id]),
  listUsers: () => all('SELECT id, name, email, role, created_at FROM users ORDER BY id'),

  async createUser(user) {
    const [result] = await pool.query('INSERT INTO users SET ?', user)
    return { id: result.insertId, ...user }
  },

  listCourses: () =>
    all(`SELECT c.id, c.title, u.name AS teacher
         FROM courses c JOIN users u ON u.id = c.teacher_id
         ORDER BY c.id DESC`),

  async createCourse(course) {
    const [result] = await pool.query('INSERT INTO courses SET ?', course)
    return { id: result.insertId, ...course }
  },

  // --- used by the MySQL -> Supabase sync (no ids: Supabase makes its own; email / mysql_id link the rows)
  listAllUsers: () =>
    all('SELECT name, email, password_hash, role, created_at FROM users ORDER BY id'),

  listAllCourses: () =>
    all(`SELECT c.id, c.title, c.created_at, u.email AS teacher_email
         FROM courses c JOIN users u ON u.id = c.teacher_id
         ORDER BY c.id`),

  // --- used by the scheduled report (NOW() is the database's own clock, so no timezone mix-ups)
  listStudentsSince: (minutes) =>
    all(`SELECT id, name, email, created_at FROM users
         WHERE role = 'student' AND created_at >= NOW() - INTERVAL ? MINUTE
         ORDER BY id`, [minutes]),

  listCoursesSince: (minutes) =>
    all(`SELECT c.id, c.title, u.name AS teacher, c.created_at
         FROM courses c JOIN users u ON u.id = c.teacher_id
         WHERE c.created_at >= NOW() - INTERVAL ? MINUTE
         ORDER BY c.id`, [minutes]),
}
