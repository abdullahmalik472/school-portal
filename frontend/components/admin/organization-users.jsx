
'use client'

import { useMemo, useState } from 'react'

const roleStyles = {
  student: 'bg-blue-100 text-blue-700',
  teacher: 'bg-purple-100 text-purple-700',
  admin: 'bg-amber-100 text-amber-700',
  platform_admin: 'bg-red-100 text-red-700',
}

export default function OrganizationUsers({ users = [] }) {
  const [selectedOrg, setSelectedOrg] = useState(null)

  const organizations = useMemo(() => {
    const groups = new Map()

    users.forEach((user) => {
      const id = String(user.organization_id ?? 'unassigned')

      if (!groups.has(id)) {
        groups.set(id, {
          id,
          name: user.organization_name || 'Unassigned',
          code: user.organization_code || '',
          users: [],
        })
      }

      groups.get(id).users.push(user)
    })

    return Array.from(groups.values()).map((org) => ({
      ...org,
      students: org.users.filter((u) => u.role === 'student').length,
      teachers: org.users.filter((u) => u.role === 'teacher').length,
      admins: org.users.filter((u) => u.role === 'admin').length,
    }))
  }, [users])

  const activeOrg = organizations.find(
    (org) => org.id === selectedOrg
  )

  return (
    <div className="space-y-8">

      {/* Dashboard heading */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Organization Management
        </h1>
        <p className="mt-2 text-gray-500">
          View organizations and manage their registered users.
        </p>
      </div>

      {/* Overall statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-2xl bg-gray-900 p-6 text-white shadow">
          <p className="text-sm text-gray-300">Total Users</p>
          <p className="mt-2 text-3xl font-bold">{users.length}</p>
        </div>

        <div className="rounded-2xl bg-blue-50 p-6">
          <p className="text-sm font-medium text-blue-600">Students</p>
          <p className="mt-2 text-3xl font-bold text-blue-800">
            {users.filter((u) => u.role === 'student').length}
          </p>
        </div>

        <div className="rounded-2xl bg-purple-50 p-6">
          <p className="text-sm font-medium text-purple-600">Teachers</p>
          <p className="mt-2 text-3xl font-bold text-purple-800">
            {users.filter((u) => u.role === 'teacher').length}
          </p>
        </div>

        <div className="rounded-2xl bg-amber-50 p-6">
          <p className="text-sm font-medium text-amber-600">Admins</p>
          <p className="mt-2 text-3xl font-bold text-amber-800">
            {users.filter((u) => u.role === 'admin').length}
          </p>
        </div>

      </div>

      {/* Organization cards */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          All Organizations
        </h2>

        {organizations.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-gray-500">
            No organization users found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

            {organizations.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => setSelectedOrg(
                  selectedOrg === org.id ? null : org.id
                )}
                className={`rounded-2xl border p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                  selectedOrg === org.id
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {org.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {org.code || 'No organization code'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-indigo-100 px-3 py-2 text-indigo-700">
                    <span className="text-xl font-bold">
                      {org.users.length}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-xs text-blue-600">Students</p>
                    <p className="mt-1 text-xl font-bold text-blue-800">
                      {org.students}
                    </p>
                  </div>

                  <div className="rounded-lg bg-purple-50 p-3">
                    <p className="text-xs text-purple-600">Teachers</p>
                    <p className="mt-1 text-xl font-bold text-purple-800">
                      {org.teachers}
                    </p>
                  </div>

                  <div className="rounded-lg bg-amber-50 p-3">
                    <p className="text-xs text-amber-600">Admins</p>
                    <p className="mt-1 text-xl font-bold text-amber-800">
                      {org.admins}
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-sm font-semibold text-indigo-600">
                  {selectedOrg === org.id
                    ? 'Hide organization users ↑'
                    : 'View organization users →'}
                </p>
              </button>
            ))}

          </div>
        )}
      </div>

      {/* Selected organization users */}
      {activeOrg && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900 p-6 text-white">
            <div>
              <h2 className="text-xl font-bold">
                {activeOrg.name}
              </h2>
              <p className="mt-1 text-sm text-gray-300">
                {activeOrg.users.length} registered users
              </p>
            </div>

            <button
              onClick={() => setSelectedOrg(null)}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            >
              Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Registration ID</th>
                  <th className="px-5 py-4">Role</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {activeOrg.users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {user.name}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {user.email}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {user.reg_id || '—'}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          roleStyles[user.role] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  )
}
