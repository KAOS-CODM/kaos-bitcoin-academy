import { Link, useParams } from 'react-router-dom'
import { useCourse, useMe } from '../lib/queries'
import { ProgressBar } from '../components/ProgressBar'
import type { LessonSummary } from '../lib/types'

export function CourseDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { data: me } = useMe()
  const course = useCourse(slug)
  const user = me?.user ?? null

  if (course.isPending) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6" role="status">
        <p className="text-muted">Loading course…</p>
      </div>
    )
  }

  if (course.isError || !course.data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-semibold text-parchment">Course not available</h1>
        <p className="mt-2 text-muted">
          This course could not be found, or it is not published yet.
        </p>
        <Link to="/courses" className="mt-6 inline-block text-amber hover:text-amber-soft">
          ← Back to all courses
        </Link>
      </div>
    )
  }

  const { course: info, modules, progress, complete, assessment } = course.data
  const resumeSlug = progress.nextLessonSlug
  const assessmentHref = assessment
    ? user
      ? `/quizzes/${assessment.slug}`
      : `/login?next=${encodeURIComponent(`/quizzes/${assessment.slug}`)}`
    : null

  const lessonHref = (lesson: LessonSummary) => {
    if (!user && !lesson.isPreview) {
      return `/login?next=${encodeURIComponent(`/lessons/${lesson.slug}`)}`
    }
    return `/lessons/${lesson.slug}`
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link to="/courses" className="hover:text-parchment">
          Courses
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-parchment">{info.title}</span>
      </nav>

      <header className="mt-6">
        <p className="text-xs uppercase tracking-widest text-amber">
          {info.level} · ~{info.estimatedMinutes} minutes
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-parchment sm:text-4xl">{info.title}</h1>
        <p className="mt-3 max-w-2xl leading-8 text-muted">{info.description}</p>
      </header>

      <div className="mt-8 rounded-lg border border-line bg-surface p-5">
        {user ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="w-full max-w-md">
              <ProgressBar
                percent={progress.percent}
                completed={progress.completedLessons}
                total={progress.totalLessons}
                label="Your progress in this course"
              />
            </div>
            {resumeSlug ? (
              <Link
                to={`/lessons/${resumeSlug}`}
                className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
              >
                {progress.completedLessons === 0 ? 'Start course' : 'Resume course'}
              </Link>
            ) : complete ? (
              <p className="text-sm font-semibold text-amber">Course complete</p>
            ) : assessmentHref ? (
              <Link
                to={assessmentHref}
                className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
              >
                Take the course assessment
              </Link>
            ) : (
              <p className="text-sm text-muted">All lessons completed.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted">
              Sign in to save progress. The preview lesson is open to everyone.
            </p>
            <Link
              to={`/login?next=${encodeURIComponent(`/courses/${info.slug}`)}`}
              className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
            >
              Sign in
            </Link>
          </div>
        )}
      </div>

      {assessment ? (
        <section aria-labelledby="course-assessment" className="mt-8 rounded-lg border border-amber/40 bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-amber">Required for completion</p>
              <h2 id="course-assessment" className="mt-1 text-xl font-semibold text-parchment">
                {assessment.title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                {assessment.questionCount} questions · {assessment.passingScore}% needed to pass
              </p>
              {user ? (
                <p className="mt-2 text-sm text-muted">
                  {assessment.passed
                    ? `Passed${assessment.bestPercent !== null ? ` · best ${assessment.bestPercent}%` : ''}`
                    : assessment.attempts
                      ? `Not passed yet · best ${assessment.bestPercent ?? 0}%`
                      : 'Not attempted yet'}
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  Sign in to see your assessment status and submit answers.
                </p>
              )}
            </div>
            {assessmentHref ? (
              <Link
                to={assessmentHref}
                className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
              >
                {user ? (assessment.passed ? 'Review assessment' : 'Start assessment') : 'Sign in to take it'}
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="mt-10 space-y-8">
        {modules.map((module) => (
          <section key={module.slug} aria-labelledby={`module-${module.slug}`}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id={`module-${module.slug}`} className="text-lg font-semibold text-parchment">
                {module.order}. {module.title}
              </h2>
              <span className="text-xs text-muted">
                {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}
              </span>
            </div>
            <ul className="overflow-hidden rounded-lg border border-line">
              {module.lessons.map((lesson) => (
                <li key={lesson.slug} className="border-b border-line/70 last:border-b-0">
                  <Link
                    to={lessonHref(lesson)}
                    className="flex items-start justify-between gap-4 bg-surface px-5 py-4 transition hover:bg-surface-2"
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-parchment">{lesson.title}</span>
                        {lesson.isPreview ? (
                          <span className="rounded-full border border-amber/50 px-2 py-0.5 text-[0.7rem] uppercase tracking-wide text-amber">
                            Free preview
                          </span>
                        ) : null}
                        {!user && !lesson.isPreview ? (
                          <span className="rounded-full border border-line px-2 py-0.5 text-[0.7rem] text-muted">
                            Sign in
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-muted">
                        {lesson.summary}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-muted">
                      {lesson.completed ? (
                        <span className="font-semibold text-amber">Completed</span>
                      ) : (
                        <span>{lesson.minutes} min</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
