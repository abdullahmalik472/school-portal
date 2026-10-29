// Called by cron-job.org (or anything that knows the secret).
// Not behind JWT login: a robot has no account, so it sends the secret in the "x-cron-secret" header.
const router = require('express').Router()
const crypto = require('crypto')
const { cronSecret, syncEnabled } = require('../config')
const { buildReport, formatReport } = require('../jobs/report')
const { runSync, formatSync } = require('../jobs/sync')

// constant-time comparison, so the secret can't be guessed by timing responses
const sameSecret = (a = '', b = '') => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

// one check for every cron endpoint; returns true when the request may continue
function allowed(req, res) {
  if (!cronSecret) {
    res.status(503).json({ error: 'CRON_SECRET is not set on the server' })
    return false
  }
  if (!sameSecret(req.get('x-cron-secret'), cronSecret)) {
    res.status(401).json({ error: 'Invalid cron secret' })
    return false
  }
  return true
}

async function report(req, res) {
  if (!allowed(req, res)) return

  const result = await buildReport('cron-job.org')
  console.log(formatReport(result))

  // counts only: cron-job.org keeps response bodies for 2 days, so no names or emails go out
  res.json({ ok: true, newStudents: result.newStudents.length, newCourses: result.newCourses.length })
}

async function sync(req, res) {
  if (!allowed(req, res)) return
  if (!syncEnabled) return res.status(503).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY are not set on the server' })

  const result = await runSync('cron-job.org')
  console.log(formatSync(result))
  res.json({ ok: true, ...result }) // counts only, no personal data
}

// cron-job.org sends GET by default; POST works too
router.route('/report').get(report).post(report)
router.route('/sync').get(sync).post(sync)

module.exports = router