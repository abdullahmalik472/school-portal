
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { api, parseBackend } from '@/lib/api'
import { requireSession } from '@/lib/session'

const pick = (form, keys) =>
  Object.fromEntries(keys.map((key) => [key, form.get(key)]))

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge,
  secure:
    process.env.COOKIE_SECURE === 'true' ||
    (!process.env.COOKIE_SECURE && process.env.NODE_ENV === 'production'),
})

// LOGIN
export async function login(_prev, form) {
  const backend = parseBackend(form.get('backend'))

  const { ok, data } = await api('/auth/login', {
    method: 'POST',
    backend,
body: pick(form, ['email', 'password', 'organization_id']),  })

  if (!ok) return { error: data.error || 'Login failed' }

  const jar = await cookies()

  jar.set('token', data.token, cookieOptions(60 * 60 * 24))
  jar.set('backend', backend, cookieOptions(60 * 60 * 24 * 30))

  redirect('/dashboard')
}

// REGISTER
export async function register(_prev, form) {
  const backend = parseBackend(form.get('backend'))

  const organizationId =
    form.get('organization_id') || form.get('organizationId')

  const body = {
    ...pick(form, ['name', 'email', 'password', 'role', 'adminCode']),
    organization_id: organizationId,
  }

  const { ok, data } = await api('/auth/register', {
    method: 'POST',
    backend,
    body,
  })

  if (!ok) return { error: data.error || 'Registration failed' }

  const jar = await cookies()
  jar.set('backend', backend, cookieOptions(60 * 60 * 24 * 30))

  redirect('/login?registered=1')
}

// LOGOUT
export async function logout() {
  const jar = await cookies()
  jar.delete('token')
  redirect('/login')
}

// ADD COURSE
export async function addCourse(form) {
  const { token } = await requireSession(['teacher', 'admin'])

  const { ok, data } = await api('/api/courses', {
    method: 'POST',
    token,
    body: { title: form.get('title') },
  })

  if (!ok) throw new Error(data.error || 'Course creation failed')

  revalidatePath('/dashboard')
}

// CREATE ORGANIZATION
export async function createOrganization(_prev, form) {
  const { token } = await requireSession(['admin'])

  const { ok, data } = await api('/api/organizations', {
    method: 'POST',
    token,
    body: pick(form, ['code', 'name']),
  })

  if (!ok) {
    return { error: data.error || 'Organization creation failed' }
  }

  revalidatePath('/dashboard')
  return { ok: true }
}

// CREATE USER
export async function createUser(_prev, form) {
  const { token } = await requireSession(['admin'])

  const { ok, data } = await api('/api/users', {
    method: 'POST',
    token,
    body: pick(form, ['name', 'email', 'role', 'organization_id']),
  })

  if (!ok) {
    return { error: data.error || 'User creation failed' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/users')

  return {
    created: true,
    reg_id: data.user.reg_id,
    email: data.credentials.email,
    password: data.credentials.password,
  }
}
export async function getOrganizations(backend) {
  const { ok, data } = await api('/api/organizations', { backend })

  if (!ok) {
    return {
      error: data.error || 'Could not load organizations',
      organizations: [],
    }
  }

  return {
    organizations: Array.isArray(data.organizations)
      ? data.organizations
      : [],
  }
}
export async function getLoginOrganizations(backend, email) {
  const { ok, data } = await api('/auth/login-organizations', {
    method: 'POST',
    backend,
    body: { email },
  })

  if (!ok) {
    return {
      error: data.error || 'Could not find account organizations',
      organizations: [],
    }
  }

  return {
    organizations: Array.isArray(data.organizations)
      ? data.organizations
      : [],
  }
}