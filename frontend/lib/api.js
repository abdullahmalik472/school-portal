import { cookies } from 'next/headers'

// The two backends this ONE frontend can talk to.
// Local: http://localhost:4000 and :4001  |  Vercel: the two Railway URLs (set in .env.local / Vercel env).
export const BACKENDS = {
  mysql: { label: 'MySQL', url: process.env.MYSQL_API_URL },
  supabase: { label: 'Supabase', url: process.env.SUPABASE_API_URL },
}

// Only the two known names are accepted, so a tampered cookie can never point us at another server.
export const parseBackend = (value) => (Object.hasOwn(BACKENDS, value) ? value : 'mysql')

// Which backend is the current visitor using? (saved in a cookie at login)
export async function getBackend() {
  return parseBackend((await cookies()).get('backend')?.value)
}

// Talks to the chosen Express backend. Only used on the server (actions, pages).
// Pass `backend` explicitly at login/register (no cookie exists yet); otherwise the cookie decides.
export async function api(path, { token, body, method = 'GET', backend } = {}) {
  const key = backend ? parseBackend(backend) : await getBackend()
  const base = BACKENDS[key].url

  if (!base) {
    console.error(`[api] The ${BACKENDS[key].label} backend URL is not set. Add it to frontend/.env.local (or Vercel env) and restart.`)
    return { ok: false, data: { error: `The ${BACKENDS[key].label} backend URL is not set on the frontend server.` } }
  }

  try {
    const res = await fetch(base + path, {
      method,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(body && { body: JSON.stringify(body) }),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, data }
  } catch (err) {
    // Backend is off / wrong port / wrong URL. Show a clear message instead of crashing.
    console.error(`[api] Cannot reach ${BACKENDS[key].label} backend at ${base}${path}:`, err.cause?.code || err.message)
    return { ok: false, data: { error: `Cannot reach the ${BACKENDS[key].label} backend (${base}). Is it running?` } }
  }
}
