import { api } from '@/lib/api'
import { requireSession } from '@/lib/session'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const fmt = (unix) => new Date(unix * 1000).toLocaleString()

export default async function ProfilePage() {
  const { token } = await requireSession()
  const { ok, data } = await api('/auth/profile', { token })

  if (!ok) return <p className="text-sm text-rose-600">{data.error || 'Could not load profile'}</p>

  const { user, token: info } = data
  const secondsLeft = info.expiresAt - Math.floor(Date.now() / 1000)
  const active = secondsLeft > 0
  const hours = Math.floor(secondsLeft / 3600)
  const mins = Math.floor((secondsLeft % 3600) / 60)

  return (
    <>
      <h1 className="text-2xl font-semibold">My profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">Name</dt><dd>{user.name}</dd>
            <dt className="text-muted-foreground">Email</dt><dd>{user.email}</dd>
            <dt className="text-muted-foreground">Role</dt><dd className="capitalize">{user.role}</dd>
            <dt className="text-muted-foreground">Member since</dt>
            <dd>{new Date(user.created_at).toLocaleDateString()}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session / token status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="flex items-center gap-2">
            Status: <Badge variant={active ? 'success' : 'danger'}>{active ? 'Active' : 'Expired'}</Badge>
          </p>
          <p>Issued at: {fmt(info.issuedAt)}</p>
          <p>Expires at: {fmt(info.expiresAt)}</p>
          {active && <p>Time left: {hours}h {mins}m</p>}

          <details>
            <summary className="cursor-pointer text-primary underline">Show my token</summary>
            <p className="mt-2 break-all rounded-md bg-secondary p-3 font-mono text-xs">{token}</p>
          </details>
        </CardContent>
      </Card>
    </>
  )
}
