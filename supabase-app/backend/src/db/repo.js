// The ONLY file that knows about Supabase. Routes just call these functions.
// Supabase is used purely as a database here. Login/JWT stays in our Express code.
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// every Supabase call returns { data, error }; throw the error so Express can handle it
const check = ({ data, error }) => {
  if (error) throw error
  return data
}

module.exports = {
  findUserByEmail: async (email) =>
    check(await supabase.from('users').select('*').eq('email', email).maybeSingle()),

  findUserById: async (id) =>
    check(await supabase.from('users').select('*').eq('id', id).maybeSingle()),

  listUsers: async () =>
    check(await supabase.from('users').select('id, name, email, role, created_at').order('id')),

  createUser: async (user) => check(await supabase.from('users').insert(user).select().single()),

  async listCourses() {
    const rows = check(
      await supabase.from('courses').select('id, title, teacher:users(name)').order('id', { ascending: false })
    )
    return rows.map(({ id, title, teacher }) => ({ id, title, teacher: teacher.name }))
  },

  createCourse: async (course) => check(await supabase.from('courses').insert(course).select().single()),
}
