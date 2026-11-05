'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Building2, Database, GraduationCap, LogIn, Search, ShieldCheck, UserPlus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const backends = [
  { id: 'mysql', label: 'MySQL', active: 'bg-sky-600 text-white shadow' },
  { id: 'supabase', label: 'Supabase', active: 'bg-emerald-600 text-white shadow' },
]

// Step 1 of 2 before login: "which organization are you from?"
// MySQL and Supabase each keep their own list, so the picker has the same database switch as the login form.
export function OrganizationPicker({ defaultBackend = 'mysql', organizations = {} }) {
  const [backend, setBackend] = useState(defaultBackend)
  const [query, setQuery] = useState('')

  const list = organizations[backend] ?? []
  const shown = list.filter((o) => `${o.name} ${o.code}`.toLowerCase().includes(query.trim().toLowerCase()))
  const link = (path, code) => `${path}?org=${encodeURIComponent(code)}&backend=${backend}`

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-indigo-50 via-background to-sky-50 px-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="size-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Choose your organization</CardTitle>
          <CardDescription>Select your school first, then login or create an account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Database className="size-3.5" /> Database
            </p>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
              {backends.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBackend(b.id)}
                  className={cn(
                    'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                    backend === b.id ? b.active : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {list.length > 5 && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search organizations" className="pl-9" />
            </div>
          )}

          <ul className="space-y-2">
            {shown.map((o) => (
              <li key={o.code} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Building2 className="size-4.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{o.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{o.code}</p>
                </div>
                <Link href={link('/login', o.code)} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                  <LogIn className="size-3.5" /> Login
                </Link>
                <Link href={link('/register', o.code)} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                  <UserPlus className="size-3.5" /> Register
                </Link>
              </li>
            ))}
          </ul>

          {list.length === 0 && (
            <p className="rounded-md bg-secondary px-3 py-2 text-center text-sm text-muted-foreground">
              No organizations found. Is this backend running and migrated?
            </p>
          )}
          {list.length > 0 && shown.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">No organization matches your search.</p>
          )}

          <p className="border-t pt-3 text-center text-sm text-muted-foreground">
            <Link href={link('/login', 'PLATFORM')} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
              <ShieldCheck className="size-4" /> Platform administrator login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
