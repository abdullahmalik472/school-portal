'use client'

import { useState } from 'react'
import { BookOpen, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

// full class names written out so Tailwind can find them
const colors = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-sky-500 to-cyan-500',
  'from-fuchsia-500 to-purple-500',
]

export function CourseList({ courses }) {
  const [q, setQ] = useState('')
  const text = q.trim().toLowerCase()
  const list = courses.filter((c) => c.title.toLowerCase().includes(text) || c.teacher.toLowerCase().includes(text))

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by course or teacher..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {courses.length === 0 ? 'No courses yet.' : 'No course matches your search.'}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {list.map((c) => (
            <li
              key={c.id}
              className="group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${colors[c.id % colors.length]} text-white shadow`}>
                <BookOpen className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{c.title}</p>
                <p className="truncate text-sm text-muted-foreground">by {c.teacher}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
