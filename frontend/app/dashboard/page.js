import { BookOpen, GraduationCap, UserCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { requireSession } from '@/lib/session'
import { AddCourseForm } from '@/components/add-course-form'
import { CourseList } from '@/components/course-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function Stat({ icon: Icon, label, value, tile }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex size-11 items-center justify-center rounded-xl text-white ${tile}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold capitalize leading-none">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function DashboardPage() {
  const { token, user } = await requireSession()
  const { data } = await api('/api/courses', { token })
  const courses = data.courses ?? []
  const teachers = new Set(courses.map((c) => c.teacher)).size
  const canAdd = ['teacher', 'admin'].includes(user.role) // only changes what we SHOW

  return (
    <>
      <section className="rounded-2xl bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Welcome back, {user.name} 👋</h1>
        <p className="mt-1 text-sm text-white/80">
          {canAdd ? 'Create and manage your courses below.' : 'Browse all available courses below.'}
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={BookOpen} label="Total courses" value={courses.length} tile="bg-linear-to-br from-indigo-500 to-violet-500" />
        <Stat icon={UserCheck} label="Teachers" value={teachers} tile="bg-linear-to-br from-emerald-500 to-teal-500" />
        <Stat icon={GraduationCap} label="Your role" value={user.role} tile="bg-linear-to-br from-amber-500 to-orange-500" />
      </div>

      {canAdd && (
        <Card>
          <CardHeader>
            <CardTitle>Add a course</CardTitle>
          </CardHeader>
          <CardContent>
            <AddCourseForm />
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">All courses</h2>
        <CourseList courses={courses} />
      </div>
    </>
  )
}
