import Link from 'next/link'
import { Database, GraduationCap } from 'lucide-react'
import { logout } from '@/app/actions'
import { requireSession } from '@/lib/session'
import { BACKENDS, getBackend } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NavLink } from '@/components/nav-link'

const roleVariant = { admin: 'warning', teacher: 'success', student: 'default' }
const backendVariant = { mysql: 'info', supabase: 'success' }

export default async function DashboardLayout({ children }) {
  const { user } = await requireSession()
  const backend = await getBackend() // which database this login belongs to

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-indigo-600 to-violet-600 text-white">
                <GraduationCap className="size-5" />
              </span>
              School Portal
            </Link>
            <nav className="flex gap-1">
              <NavLink href="/dashboard">Courses</NavLink>
              <NavLink href="/dashboard/profile">Profile</NavLink>
              {user.role === 'admin' && <NavLink href="/dashboard/users">Users</NavLink>}
            </nav>
          </div>

          <form action={logout} className="flex items-center gap-3 text-sm">
            <Badge variant={backendVariant[backend]} className="gap-1 normal-case">
              <Database className="size-3" /> {BACKENDS[backend].label}
            </Badge>
            <span className="hidden sm:inline">{user.name}</span>
            <Badge variant={roleVariant[user.role]}>{user.role}</Badge>
            <Button variant="outline" size="sm">Logout</Button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-6">{children}</main>
    </div>
  )
}
