'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { api, parseBackend } from '@/lib/api'
import { requireSession } from '@/lib/session'

const pick = (form, keys) => Object.fromEntries(keys.map((k) => [k, form.get(k)]))

// "secure" cookies only travel over https. On Vercel that is automatic (production).
// If you ever run `npm start` over plain http on another PC / LAN IP, set COOKIE_SECURE=false in .env.local.
const secure = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production'

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge,
  secure,
})

export async function login(_prev, form) {
  const backend = parseBackend(form.get('backend')) // "mysql" or "supabase"
  const { ok, data } = await api('/auth/login', { method: 'POST', backend, body: pick(form, ['email', 'password']) })
  if (!ok) return { error: data.error || 'Login failed' }

  const jar = await cookies()
  jar.set('token', data.token, cookieOptions(60 * 60 * 24))
  jar.set('backend', backend, cookieOptions(60 * 60 * 24 * 30)) // remembers which backend this token belongs to
  redirect('/dashboard')
}

export async function register(_prev, form) {
  const backend = parseBackend(form.get('backend'))
  const fields = ['name', 'email', 'password', 'role', 'adminCode']
  const { ok, data } = await api('/auth/register', { method: 'POST', backend, body: pick(form, fields) })
  if (!ok) return { error: data.error || 'Registration failed' }

  const jar = await cookies()
  jar.set('backend', backend, cookieOptions(60 * 60 * 24 * 30)) // so the login page opens on the same backend
  redirect('/login?registered=1')
}

export async function logout() {
  const jar = await cookies()
  jar.delete('token') // the "backend" cookie stays, so the login page remembers your last choice
  redirect('/login')
}

export async function addCourse(form) {
  const { token } = await requireSession(['teacher', 'admin']) // server actions need their own check
  await api('/api/courses', { method: 'POST', token, body: { title: form.get('title') } })
  revalidatePath('/dashboard')
}
