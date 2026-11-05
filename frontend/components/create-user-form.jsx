
'use client'

import { useActionState } from 'react'
import { useState } from 'react'
import { UserPlus, Copy, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CreateUserForm({
  action,
  roles = ['student', 'teacher', 'admin'],
  organizations = [],
}) {
  const [result, formAction, pending] = useActionState(action, null)
  const [copied, setCopied] = useState(false)

  async function copyCredentials() {
    if (!result?.password) return

    await navigator.clipboard.writeText(
      `Email: ${result.email}\nPassword: ${result.password}`
    )

    setCopied(true)
  }

  return (
    <form action={formAction} className="space-y-4">

      <div className="space-y-2">
        <label className="text-sm font-medium">Full name</label>
        <Input
          name="name"
          placeholder="Enter full name"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Email address</label>
        <Input
          name="email"
          type="email"
          placeholder="Enter email address"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Role</label>

        <select
          name="role"
          required
          defaultValue="student"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Organization</label>

        <select
          name="organization_id"
          required
          defaultValue=""
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="" disabled>
            Select an organization
          </option>

          {organizations.map((organization) => (
            <option
              key={organization.id}
              value={organization.id}
              disabled={organization.is_active === 0}
            >
              {organization.name} ({organization.code})
              {organization.is_active === 0 ? ' - Inactive' : ''}
            </option>
          ))}
        </select>

        {organizations.length === 0 && (
          <p className="text-xs text-amber-600">
            No organizations available. Create an organization first.
          </p>
        )}
      </div>

      {result?.error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {result.error}
        </p>
      )}

      {result?.created && (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-semibold text-emerald-800">
            User created successfully!
          </p>

          <p>
            Registration ID:{' '}
            <strong>{result.reg_id || 'Not applicable'}</strong>
          </p>

          <p>
            Email: <strong>{result.email}</strong>
          </p>

          <p>
            Temporary password: <strong>{result.password}</strong>
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyCredentials}
          >
            {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
            {copied ? 'Copied' : 'Copy credentials'}
          </Button>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={pending || organizations.length === 0}
      >
        <UserPlus className="mr-2 size-4" />
        {pending ? 'Creating user...' : 'Create User'}
      </Button>

    </form>
  )
}
