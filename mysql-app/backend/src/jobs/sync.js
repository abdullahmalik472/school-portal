// MySQL -> Supabase one-way copy. MySQL is the source of truth.
// Safe to run again and again: it only inserts new rows and updates existing ones.
const db = require('../db/repo')
const target = require('../db/supabaseTarget')

let running = false // stops two runs (node-cron + cron-job.org, or a slow run) from overlapping

async function runSync(source) {
  if (running) return { source, skipped: true, reason: 'previous sync is still running' }
  running = true
  const startedAt = Date.now()

  try {
    const [users, courses] = await Promise.all([db.listAllUsers(), db.listAllCourses()])

    // 1) users first. Supabase gives them its own ids, so remember email -> id
    const supabaseIdByEmail = await target.upsertUsers(users)

    // 2) a course points at the teacher's *Supabase* id; mysql_id lets us find the same course next time
    const rows = courses
      .filter((c) => supabaseIdByEmail.has(c.teacher_email)) // a teacher created a moment ago waits for the next run
      .map((c) => ({
        mysql_id: c.id,
        title: c.title,
        teacher_id: supabaseIdByEmail.get(c.teacher_email),
        created_at: c.created_at,
      }))
    await target.upsertCourses(rows)

    return {
      source,
      ok: true,
      users: users.length,
      courses: rows.length,
      skippedCourses: courses.length - rows.length,
      ms: Date.now() - startedAt,
    }
  } finally {
    running = false
  }
}

function formatSync(r) {
  if (r.skipped) return `--- Sync (${r.source}) skipped: ${r.reason} ---`
  const waiting = r.skippedCourses ? `, ${r.skippedCourses} course(s) wait for the next run` : ''
  return `--- Sync (${r.source}) MySQL -> Supabase: ${r.users} users, ${r.courses} courses${waiting} (${r.ms} ms) ---`
}

module.exports = { runSync, formatSync }
