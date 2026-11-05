
import { BookOpen, GraduationCap, UserCheck } from 'lucide-react'

import { api } from '@/lib/api'
import { requireSession } from '@/lib/session'

import { AddCourseForm } from '@/components/add-course-form'
import { CourseList } from '@/components/course-list'
import { OrganizationForm } from '@/components/organization-form'
import { CreateUserForm } from '@/components/create-user-form'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { createUser } from '@/app/actions'

function Stat({ icon: Icon, label, value, tile }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex size-11 items-center justify-center rounded-xl text-white ${tile}`}
        >
          <Icon className="size-5" />
        </div>

        <div>
          <p className="text-2xl font-bold capitalize leading-none">
            {value}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function DashboardPage() {
  const { token, user } = await requireSession()

  // Fetch courses
  const { data: courseData } = await api('/api/courses', { token })

  const courses = courseData.courses ?? []

  const teachers = new Set(
    courses.map((course) => course.teacher)
  ).size

  const isAdmin = user.role === 'admin'
  const canAddCourse = ['teacher', 'admin'].includes(user.role)

  // Fetch organizations for admin
  let organizations = []

  if (isAdmin) {
    const { ok, data } = await api('/api/organizations', { token })

    if (ok) {
      organizations = data.organizations ?? []
    }
  }

  return (
    <div className="space-y-6">

      {/* Welcome section */}
      <section className="rounded-2xl bg-linear-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">
          Welcome back, {user.name} 👋
        </h1>

        <p className="mt-1 text-sm text-white/80">
          {isAdmin
            ? 'Manage organizations, users and courses from your dashboard.'
            : canAddCourse
              ? 'Create and manage your courses below.'
              : 'Browse all available courses below.'}
        </p>
      </section>

      {/* Dashboard statistics */}
      <div className="grid gap-4 sm:grid-cols-3">

        <Stat
          icon={BookOpen}
          label="Total courses"
          value={courses.length}
          tile="bg-linear-to-br from-indigo-500 to-violet-500"
        />

        <Stat
          icon={UserCheck}
          label="Teachers"
          value={teachers}
          tile="bg-linear-to-br from-emerald-500 to-teal-500"
        />

        <Stat
          icon={GraduationCap}
          label="Your role"
          value={user.role}
          tile="bg-linear-to-br from-amber-500 to-orange-500"
        />

      </div>

      {/* Student and teacher organization details */}
      {['student', 'teacher'].includes(user.role) && (
        <Card>
          <CardHeader>
            <CardTitle>Your Organization Details</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">

            <div className="rounded-xl bg-indigo-50 p-4">
              <p className="text-sm text-muted-foreground">
                School / Organization
              </p>

              <p className="mt-1 text-lg font-bold text-indigo-700">
                {user.organization_name || 'Not assigned'}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-sm text-muted-foreground">
                Registration ID
              </p>

              <p className="mt-1 text-lg font-bold text-emerald-700">
                {user.reg_id || 'Not assigned'}
              </p>
            </div>

          </CardContent>
        </Card>
      )}

      {/* Admin-only management section */}
      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Create organization */}
          <Card>
            <CardHeader>
              <CardTitle>Create Organization</CardTitle>
            </CardHeader>

            <CardContent>
              <OrganizationForm />
            </CardContent>
          </Card>

          {/* Create user */}
          <Card>
            <CardHeader>
              <CardTitle>Create User</CardTitle>
            </CardHeader>

            <CardContent>
              <CreateUserForm
                action={createUser}
                roles={['student', 'teacher', 'admin']}
                organizations={organizations}
              />
            </CardContent>
          </Card>

        </div>
      )}

      {/* Add course */}
      {canAddCourse && (
        <Card>
          <CardHeader>
            <CardTitle>Add a course</CardTitle>
          </CardHeader>

          <CardContent>
            <AddCourseForm />
          </CardContent>
        </Card>
      )}

      {/* Course listing */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          All courses
        </h2>

        <CourseList courses={courses} />
      </div>

    </div>
  )
}
