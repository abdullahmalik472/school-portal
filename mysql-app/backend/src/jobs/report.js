// Builds the "what's new" report. It knows nothing about MySQL/Supabase, Express or cron:
// the database comes from db/repo.js, and whoever triggers it just calls buildReport().
const db = require('../db/repo')
const { reportWindowMinutes } = require('../config')

const MAX_HISTORY = 20
const history = [] // newest first, kept in memory only (cleared when the server restarts)

async function buildReport(source) {
  const [newStudents, newCourses] = await Promise.all([
    db.listStudentsSince(reportWindowMinutes),
    db.listCoursesSince(reportWindowMinutes),
  ])

  const report = {
    source, // "node-cron" or "cron-job.org"
    generatedAt: new Date().toISOString(),
    windowMinutes: reportWindowMinutes,
    newStudents,
    newCourses,
  }

  history.unshift(report)
  if (history.length > MAX_HISTORY) history.pop()
  return report
}

function formatReport(r) {
  return [
    `--- Report (${r.source}) ${r.generatedAt} | last ${r.windowMinutes} min ---`,
    `New students: ${r.newStudents.length}`,
    ...r.newStudents.map((s) => `   + ${s.name} <${s.email}>`),
    `New courses:  ${r.newCourses.length}`,
    ...r.newCourses.map((c) => `   + ${c.title} (by ${c.teacher})`),
  ].join('\n')
}

const getHistory = () => history

module.exports = { buildReport, formatReport, getHistory }