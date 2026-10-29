import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { api } from './api'

// Layer 2 (the vault): asks the backend "is this token really valid?"
export const getSession = cache(async () => {
  const token = (await cookies()).get('token')?.value
  if (!token) return null
  const { ok, data } = await api('/auth/me', { token })
  return ok ? { token, user: data.user } : null
})

// Call at the top of every protected page / action. Pass roles to restrict.
export async function requireSession(roles) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (roles && !roles.includes(session.user.role)) redirect('/dashboard')
  return session
}
