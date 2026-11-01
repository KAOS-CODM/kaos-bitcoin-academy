import { Link } from 'react-router-dom'
import { useCourses, useMe } from '../lib/queries'
import { PREVIEW_LESSON_SLUG } from '../lib/config'

export function Home() {
  const { data } = useMe()
  const courses = useCourses()
  const user = data?.user ?? null

  return (
    <div>
      <section className="border-b border-line/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-amber">
            Free · Beginner-first · Self-paced
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-parchment sm:text-5xl">
            Understand Bitcoin, one clear lesson at a time.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            No hype, no trading signals, no investment promises. Just plain explanations of how
            Bitcoin works, why it exists, and how to stay safe while you learn.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={user ? '/dashboard' : '/register'}
              className="rounded-md bg-amber px-5 py-3 font-semibold text-ink transition hover:bg-amber-soft"
            >
              {user ? 'Continue learning' : 'Create a free account'}
            </Link>
            <Link
              to={`/lessons/${PREVIEW_LESSON_SLUG}`}
              className="rounded-md border border-line px-5 py-3 font-semibold text-parchment transition hover:border-amber"
            >
              Read a lesson without signing up
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">
            The preview lesson is fully readable. An account lets you save your progress.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-parchment">Start here</h2>
            <p className="mt-2 text-muted">
              Bitcoin 101 is complete. Every later course opens with its first module.
            </p>
          </div>
          <Link to="/courses" className="text-sm font-semibold text-amber hover:text-amber-soft">
            View all courses →
          </Link>
        </div>

        {courses.isPending ? (
          <p className="text-muted" role="status">
            Loading courses…
          </p>
        ) : courses.isError ? (
          <div className="rounded-lg border border-line bg-surface p-5">
            <p className="text-parchment">Courses could not be loaded.</p>
            <p className="mt-1 text-sm text-muted">
              The academy catalogue is temporarily unavailable. Please try again shortly.
            </p>
            <button
              type="button"
              onClick={() => void courses.refetch()}
              className="mt-4 rounded border border-line px-4 py-2 text-sm text-parchment hover:border-amber"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {courses.data.courses.slice(0, 8).map((course) => (
              <Link
                key={course.slug}
                to={`/courses/${course.slug}`}
                className="group flex flex-col rounded-lg border border-line bg-surface p-5 transition hover:border-amber/60"
              >
                <span className="text-xs uppercase tracking-widest text-muted">
                  Course {course.slug.slice(0, 2)}
                </span>
                <span className="mt-2 font-semibold text-parchment group-hover:text-amber-soft">
                  {course.title}
                </span>
                <span className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                  {course.description}
                </span>
                <span className="mt-4 text-xs text-muted">
                  {course.lessonCount} lessons · {course.level}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-line/60 bg-surface/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
          <div>
            <h2 className="text-lg font-semibold text-parchment">Built for beginners</h2>
            <p className="mt-2 text-sm leading-7 text-muted">
              Every technical term is explained when it first appears. Lessons assume no
              background in cryptography, finance or programming.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-parchment">Honest about limits</h2>
            <p className="mt-2 text-sm leading-7 text-muted">
              Bitcoin has real risks and real trade-offs. You will read about volatility, custody
              and scams alongside the ideas.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-parchment">Progress you can see</h2>
            <p className="mt-2 text-sm leading-7 text-muted">
              Mark lessons complete, return where you stopped, and see how far you have come.
              Nothing is shared publicly.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
