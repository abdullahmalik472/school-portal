module.exports = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET,
  adminCodes: (process.env.ADMIN_CODES || '').split(',').filter(Boolean),

  // scheduled reports
  cronSecret: process.env.CRON_SECRET,                              // protects /cron/report (cron-job.org)
  reportSchedule: process.env.REPORT_SCHEDULE || '*/10 * * * *',    // node-cron: every 10 minutes
  reportWindowMinutes: Number(process.env.REPORT_WINDOW_MINUTES) || 10,
  nodeCronEnabled: process.env.ENABLE_NODE_CRON !== 'false',        // set to false if only cron-job.org should trigger it

  // MySQL -> Supabase copy (one way). Switched on only when both Supabase values are set.
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,             // secret key: keep it on the server, never in git
  syncSchedule: process.env.SYNC_SCHEDULE || '*/5 * * * *',         // node-cron: every 5 minutes
  syncEnabled: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
}
