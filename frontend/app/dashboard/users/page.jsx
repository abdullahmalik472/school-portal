

import { api } from '@/lib/api'
import { requireSession } from '@/lib/session'
import OrganizationUsers from '@/components/admin/organization-users'

export default async function UsersPage() {
  const { token } = await requireSession(['admin'])

  const { data } = await api('/api/users', { token })

  const users = data?.users ?? []

  return (
    <main className="p-4 md:p-8">
      <OrganizationUsers users={users} />
    </main>
  )
}
