'use client'

import { useActionState, useRef } from 'react'
import { Plus } from 'lucide-react'
import { createOrganization } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Platform admin: add a new organization (code is used in registration IDs, e.g. BHL -> BHL0001, BHL-T0001)
export function OrganizationForm() {
  const formRef = useRef(null)
  const [state, formAction, pending] = useActionState(async (prev, form) => {
    const result = await createOrganization(prev, form)
    if (result?.ok) formRef.current?.reset()
    return result
  }, null)

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
        <Input name="code" placeholder="Code, e.g. LGS" maxLength={6} className="uppercase placeholder:normal-case" required />
        <Input name="name" placeholder="Organization name, e.g. Lahore Grammar School" required />
        <Button disabled={pending}>
          <Plus className="size-4" /> {pending ? 'Creating...' : 'Create'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        The code (2-6 letters/digits) goes into every registration ID and cannot be changed later.
      </p>
      {state?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>}
    </form>
  )
}
