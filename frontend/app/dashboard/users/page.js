import { api } from '@/lib/api'
import { requireSession } from '@/lib/session'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const roleVariant = { admin: 'warning', teacher: 'success', student: 'default' }

export default async function UsersPage() {
  const { token } = await requireSession(['admin']) // students/teachers get sent back
  const { data } = await api('/api/users', { token })
  const users = data.users ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>All users ({users.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-accent/50">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white">
                {u.name[0]?.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Badge variant={roleVariant[u.role]}>{u.role}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
