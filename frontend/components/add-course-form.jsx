'use client'

import { useRef, useState, useTransition } from 'react'
import { Check, Plus } from 'lucide-react'
import { addCourse } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AddCourseForm() {
  const formRef = useRef(null)
  const [pending, start] = useTransition()
  const [added, setAdded] = useState(false)

  function onSubmit(e) {
    e.preventDefault()
    const data = new FormData(formRef.current)
    start(async () => {
      await addCourse(data)
      formRef.current.reset()
      setAdded(true)
      setTimeout(() => setAdded(false), 2500)
    })
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex gap-2">
      <Input name="title" placeholder="New course title, e.g. Physics 101" required />
      <Button variant={added ? 'success' : 'default'} disabled={pending} className="min-w-28">
        {pending ? 'Adding...' : added ? <><Check className="size-4" /> Added</> : <><Plus className="size-4" /> Add</>}
      </Button>
    </form>
  )
}
