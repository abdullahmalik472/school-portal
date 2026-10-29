// node-cron: runs jobs inside this Express process on a schedule.
const cron = require('node-cron')
const { reportSchedule, syncSchedule, syncEnabled, nodeCronEnabled } = require('../config')
const { buildReport, formatReport } = require('./report')
const { runSync, formatSync } = require('./sync')

// Starts one job. A failed run is logged and never crashes the server.
function schedule(name, expression, job) {
  if (!cron.validate(expression)) return console.error(`!! Invalid schedule for ${name}: "${expression}", not started`)

  cron.schedule(expression, async () => {
    try {
      await job()
    } catch (err) {
      console.error(`!! ${name} job failed:`, err.code || '', err.message)
    }
  })
  console.log(`node-cron: ${name} scheduled (${expression})`)
}

function startScheduler() {
  if (!nodeCronEnabled) return console.log('node-cron is OFF (ENABLE_NODE_CRON=false)')

  schedule('report', reportSchedule, async () => console.log(formatReport(await buildReport('node-cron'))))

  if (syncEnabled) schedule('sync', syncSchedule, async () => console.log(formatSync(await runSync('node-cron'))))
  else console.log('Sync is OFF (SUPABASE_URL / SUPABASE_SERVICE_KEY not set)')
}

module.exports = { startScheduler }
