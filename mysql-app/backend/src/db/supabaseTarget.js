// Write side of the MySQL -> Supabase copy. The ONLY file in this backend that talks to Supabase.
const { createClient } = require('@supabase/supabase-js')
const { supabaseUrl, supabaseServiceKey } = require('../config')

const CHUNK = 500 // rows per request, so big tables don't hit request-size limits

let client
function supabase() {
  if (!supabaseUrl || !supabaseServiceKey) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY are missing in .env')
  return (client ??= createClient(supabaseUrl, supabaseServiceKey))
}

const chunks = (rows) =>
  Array.from({ length: Math.ceil(rows.length / CHUNK) }, (_, i) => rows.slice(i * CHUNK, (i + 1) * CHUNK))

// Insert new rows and update existing ones (matched on `key`). Returns the saved rows.
async function upsert(table, rows, key, columns) {
  const saved = []
  for (const part of chunks(rows)) {
    const { data, error } = await supabase().from(table).upsert(part, { onConflict: key }).select(columns)
    if (error) throw error
    saved.push(...data)
  }
  return saved
}

module.exports = {
  // returns Map(email -> Supabase user id)
  async upsertUsers(users) {
    const saved = await upsert('users', users, 'email', 'id, email')
    return new Map(saved.map((u) => [u.email, u.id]))
  },

  upsertCourses: (courses) => upsert('courses', courses, 'mysql_id', 'id'),
}
