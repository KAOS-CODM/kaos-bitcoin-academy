import { Link } from 'react-router-dom'
import { useCourses, useMe } from '../lib/queries'
import { ProgressBar } from '../components/ProgressBar'

export function Catalogue() {
  const { data: me } = useMe()
  const courses = useCourses()
  const user = me?.user ?? null

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold text-parchment">Courses</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Eight courses, in order. Bitcoin 101 is complete; every later course currently includes its
        first module.
        {user ? ' Your progress is saved to your account.' : ' Sign in to track your progress.'}
      </p>

      {courses.isPending ? (
        <p className="mt-10 text-muted" role="status">
          Loading courses…
        </p>
      ) : courses.isError ? (
        <div className="mt-10 rounded-lg border border-line bg-surface p-6">
          <p className="text-parchment">The catalogue could not be loaded.</p>
          <p className="mt-1 text-sm text-muted">
            The database may be temporarily unavailable. Please try again.
          </p>
          <button
            type="button"
            onClick={() => void courses.refetch()}
            className="mt-4 rounded border border-line px-4 py-2 text-sm hover:border-amber"
          >
            Try again
          </button>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {courses.data.courses.map((course) => (
            <li key={course.slug}>
              <Link
                to={`/courses/${course.slug}`}
                className="block rounded-lg border border-line bg-surface p-5 transition hover:border-amber/60 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-muted">
                      Course {course.slug.slice(0, 2)} · {course.level}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-parchment">{course.title}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
                      {course.description}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <p>{course.moduleCount} modules</p>
                    <p>{course.lessonCount} lessons</p>
                    <p>~{course.estimatedMinutes} min</p>
                  </div>
                </div>

                {user ? (
                  <div className="mt-5 max-w-md">
                    <ProgressBar
                      percent={course.progress.percent}
                      completed={course.progress.completedLessons}
                      total={course.progress.totalLessons}
                      label={`${course.title} progress`}
                      size="sm"
                    />
                  </div>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
