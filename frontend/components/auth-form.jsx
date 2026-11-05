
'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Database, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  getOrganizations,
  getLoginOrganizations,
} from '@/app/actions'

const backends = [
  {
    id: 'mysql',
    label: 'MySQL',
    active: 'bg-sky-600 text-white shadow',
  },
  {
    id: 'supabase',
    label: 'Supabase',
    active: 'bg-emerald-600 text-white shadow',
  },
]

export function AuthForm({
  mode,
  action,
  notice,
  defaultBackend = 'mysql',
}) {
  const [state, formAction, pending] = useActionState(action, null)

  const [role, setRole] = useState('student')
  const [backend, setBackend] = useState(defaultBackend)

  const [organizations, setOrganizations] = useState([])
  const [organizationId, setOrganizationId] = useState('')
  const [orgLoading, setOrgLoading] = useState(false)
  const [orgError, setOrgError] = useState('')

  const [email, setEmail] = useState('')
  const [loginOrganizations, setLoginOrganizations] = useState([])
  const [loginOrganizationId, setLoginOrganizationId] = useState('')
  const [loginOrgLoading, setLoginOrgLoading] = useState(false)
  const [loginOrgError, setLoginOrgError] = useState('')
  const [loginLookupDone, setLoginLookupDone] = useState(false)

  const requestId = useRef(0)
  const isRegister = mode === 'register'

  // Load registration organizations
  useEffect(() => {
    if (!isRegister) {
      setOrganizations([])
      setOrganizationId('')
      setOrgError('')
      return
    }

    let cancelled = false

    async function loadOrganizations() {
      try {
        setOrgLoading(true)
        setOrgError('')
        setOrganizations([])
        setOrganizationId('')

        const result = await getOrganizations(backend)

        if (!cancelled) {
          const list = Array.isArray(result.organizations)
            ? result.organizations
            : []

          setOrganizations(list)
          setOrganizationId(
            list.length > 0 ? String(list[0].id) : ''
          )

          if (result.error) {
            setOrgError(result.error)
          }
        }
      } catch (error) {
        if (!cancelled) {
          setOrgError(error.message || 'Unable to load organizations')
        }
      } finally {
        if (!cancelled) {
          setOrgLoading(false)
        }
      }
    }

    loadOrganizations()

    return () => {
      cancelled = true
    }
  }, [isRegister, backend])

  // Find organizations for the entered login email
  async function handleEmailBlur() {
    if (isRegister) return

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return
    }

    const currentRequest = ++requestId.current

    try {
      setLoginOrgLoading(true)
      setLoginOrgError('')
      setLoginOrganizations([])
      setLoginOrganizationId('')
      setLoginLookupDone(false)

      const result = await getLoginOrganizations(backend, cleanEmail)

      if (currentRequest !== requestId.current) return

      const list = Array.isArray(result.organizations)
        ? result.organizations
        : []

      setLoginOrganizations(list)

      if (list.length === 1) {
        setLoginOrganizationId(String(list[0].id))
      }

      if (result.error) {
        setLoginOrgError(result.error)
      }

      setLoginLookupDone(true)
    } catch (error) {
      if (currentRequest === requestId.current) {
        setLoginOrgError(
          error.message || 'Unable to find account organizations'
        )
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoginOrgLoading(false)
      }
    }
  }

  function handleEmailChange(value) {
    setEmail(value)
    requestId.current += 1
    setLoginOrganizations([])
    setLoginOrganizationId('')
    setLoginOrgError('')
    setLoginLookupDone(false)
    setLoginOrgLoading(false)
  }

  function handleBackendChange(value) {
    setBackend(value)
    requestId.current += 1
    setLoginOrganizations([])
    setLoginOrganizationId('')
    setLoginOrgError('')
    setLoginLookupDone(false)
    setLoginOrgLoading(false)
  }

  const loginNeedsOrganization =
    !isRegister && loginOrganizations.length > 1

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-indigo-50 via-background to-sky-50 px-4 py-8">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="size-6 text-primary" />
          </div>

          <CardTitle className="text-xl">
            {isRegister ? 'Create account' : 'Welcome back'}
          </CardTitle>

          <CardDescription>
            {isRegister
              ? 'Fill in your details to get started'
              : 'Login to your School Portal'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={formAction} className="space-y-3">

            {/* Database selector */}
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Database className="size-3.5" />
                Database
              </p>

              <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
                {backends.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleBackendChange(b.id)}
                    className={cn(
                      'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                      backend === b.id
                        ? b.active
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <input
                type="hidden"
                name="backend"
                value={backend}
              />
            </div>

            {/* Registration fields */}
            {isRegister && (
              <>
                <Input
                  name="name"
                  placeholder="Full name"
                  required
                />

                {/* Registration organization selector */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Select Organization
                  </label>

                  <select
                    name="organization_id"
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                    required
                    disabled={
                      orgLoading ||
                      organizations.length === 0 ||
                      !!orgError
                    }
                    className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">
                      {orgLoading
                        ? 'Loading organizations...'
                        : 'Please select an organization'}
                    </option>

                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>

                  {orgError && (
                    <p className="mt-1 text-sm text-destructive">
                      {orgError}
                    </p>
                  )}

                  {!orgLoading &&
                    !orgError &&
                    organizations.length === 0 && (
                      <p className="mt-1 text-sm text-destructive">
                        No organizations available.
                      </p>
                    )}
                </div>

                {/* Role selector */}
                <select
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>

                {role === 'admin' && (
                  <Input
                    name="adminCode"
                    placeholder="Admin code"
                    required
                  />
                )}
              </>
            )}

            {/* Login and registration credentials */}
            <Input
              name="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={handleEmailBlur}
              required
            />

            {/* Login organization selector */}
            {!isRegister && loginOrganizations.length > 1 && (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Select Organization
                </label>

                <select
                  name="organization_id"
                  value={loginOrganizationId}
                  onChange={(e) =>
                    setLoginOrganizationId(e.target.value)
                  }
                  required
                  className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Please select your organization</option>

                  {loginOrganizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!isRegister && loginOrganizations.length === 1 && (
              <input
                type="hidden"
                name="organization_id"
                value={loginOrganizationId}
              />
            )}

            {!isRegister && loginOrgLoading && (
              <p className="text-xs text-muted-foreground">
                Finding your organizations...
              </p>
            )}

            {!isRegister && loginOrgError && (
              <p className="text-sm text-destructive">
                {loginOrgError}
              </p>
            )}

            {!isRegister &&
              loginLookupDone &&
              loginOrganizations.length === 0 &&
              !loginOrgError && (
                <p className="text-sm text-muted-foreground">
                  No account found for this email in this database.
                </p>
              )}

            <Input
              name="password"
              type="password"
              placeholder="Password"
              required
            />

            {notice && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {notice}
              </p>
            )}

            {state?.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}

            <Button
              className="w-full"
              disabled={
                pending ||
                (isRegister &&
                  (
                    !organizationId ||
                    orgLoading ||
                    !!orgError
                  )) ||
                (!isRegister &&
                  (
                    loginOrgLoading ||
                    (loginNeedsOrganization && !loginOrganizationId)
                  ))
              }
            >
              {pending
                ? 'Please wait...'
                : isRegister
                  ? 'Register'
                  : 'Login'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isRegister
              ? 'Already have an account? '
              : 'No account? '}

            <Link
              className="font-medium text-primary hover:underline"
              href={isRegister ? '/login' : '/register'}
            >
              {isRegister ? 'Login' : 'Register'}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
