
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const check = ({ data, error }) => {
  if (error) throw error
  return data
}

const withOrganization = (user) => {
  if (!user) return null

  return {
    ...user,
    organization_name: user.organization?.name || null,
    organization_code: user.organization?.code || null,
  }
}

const USER_ORGANIZATION =
  'organization:organizations(name, code)'

module.exports = {
  // Authentication: find one user by email
  findUserByEmail: async (email) => {
    const user = check(
      await supabase
        .from('users')
        .select(`*, ${USER_ORGANIZATION}`)
        .eq('email', email)
        .limit(1)
        .maybeSingle()
    )

    return withOrganization(user)
  },

  // Authentication: find all accounts belonging to an email
  findUsersByEmail: async (email) => {
    const users = check(
      await supabase
        .from('users')
        .select(`*, ${USER_ORGANIZATION}`)
        .eq('email', email)
        .order('id')
    )

    return users.map(withOrganization)
  },

  // Find organizations belonging to an email
  listOrganizationsForEmail: async (email) => {
    const rows = check(
      await supabase
        .from('users')
        .select('organization_id, organization:organizations(id, name, code)')
        .eq('email', email)
    )

    const unique = new Map()

    for (const row of rows) {
      if (row.organization) {
        unique.set(String(row.organization.id), row.organization)
      }
    }

    return [...unique.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  },

  // Find user by ID
  findUserById: async (id) => {
    const user = check(
      await supabase
        .from('users')
        .select(`*, ${USER_ORGANIZATION}`)
        .eq('id', id)
        .maybeSingle()
    )

    return withOrganization(user)
  },

  // Users
  listUsers: async () => {
    const users = check(
      await supabase
        .from('users')
        .select(
          `id, name, email, role, reg_id, organization_id, created_at, ${USER_ORGANIZATION}`
        )
        .order('id')
    )

    return users.map(withOrganization)
  },

  // Organizations
  listOrganizations: async () =>
    check(
      await supabase
        .from('organizations')
        .select('id, name, code, is_active')
        .eq('is_active', true)
        .order('name')
    ),

  // Create organization
  createOrganization: async ({ name, code }) =>
    check(
      await supabase
        .from('organizations')
        .insert({
          name,
          code: code.toUpperCase(),
        })
        .select()
        .single()
    ),

  // User creation through PostgreSQL function
  createUser: async ({
    organization_id,
    name,
    email,
    password_hash,
    role,
  }) => {
    const result = check(
      await supabase.rpc('create_user_in_org', {
        p_org: organization_id,
        p_name: name,
        p_email: email,
        p_hash: password_hash,
        p_role: role,
      })
    )

    const user = Array.isArray(result) ? result[0] : result

    if (!user) {
      throw new Error('User creation returned no result')
    }

    return user
  },

  // Courses for students and teachers
  listCourses: async (organizationId) => {
    const rows = check(
      await supabase
        .from('courses')
        .select(
          'id, title, teacher_id, organization_id, created_at, teacher:users!courses_teacher_same_org(name)'
        )
        .eq('organization_id', organizationId)
        .order('id', { ascending: false })
    )

    return rows.map((row) => ({
      ...row,
      teacher: row.teacher?.name || 'Unknown',
    }))
  },

  // All courses for admin
  listCoursesForAdmin: async () => {
    const rows = check(
      await supabase
        .from('courses')
        .select(
          'id, title, teacher_id, organization_id, created_at, teacher:users!courses_teacher_same_org(name)'
        )
        .order('id', { ascending: false })
    )

    return rows.map((row) => ({
      ...row,
      teacher: row.teacher?.name || 'Unknown',
    }))
  },

  // Create course
  createCourse: async ({ title, teacher_id, organization_id }) =>
    check(
      await supabase
        .from('courses')
        .insert({
          title,
          teacher_id,
          organization_id,
        })
        .select()
        .single()
    ),
}
