import { Link } from 'react-router-dom'
import { ProgressBar } from '../components/ProgressBar'
import { useDashboard, useMe } from '../lib/queries'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function Dashboard() {
  const { data: me } = useMe()
  const dashboard = useDashboard(true)
  const user = me?.user ?? null

  if (dashboard.isPending) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6" role="status">
        <p className="text-muted">Loading your dashboard…</p>
      </div>
    )
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-semibold text-parchment">Dashboard unavailable</h1>
        <p className="mt-2 text-muted">
          We could not load your progress right now. The database may be temporarily unavailable.
        </p>
        <button
          type="button"
          onClick={() => void dashboard.refetch()}
          className="mt-5 rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
        >
          Try again
        </button>
      </div>
    )
  }

  const { overall, resume, courses, recent, isNewLearner, xp, achievements } = dashboard.data

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-amber">Your learning</p>
        <h1 className="mt-2 text-3xl font-semibold text-parchment sm:text-4xl">
          {user ? `Welcome back, ${user.displayName}` : 'Your dashboard'}
        </h1>
        <p className="mt-2 text-muted">
          {isNewLearner
            ? 'Your progress will appear here once you complete your first lesson.'
            : 'Pick up where you left off, or start a new course.'}
        </p>
        <Link
          to={resume?.lesson ? `/tutor?lesson=${resume.lesson.slug}` : '/tutor'}
          className="mt-5 inline-block rounded-md border border-amber/50 px-4 py-2.5 text-sm font-semibold text-amber hover:border-amber"
        >
          Ask the AI Tutor
        </Link>
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
            Overall progress
          </h2>
          <p className="mt-3 text-5xl font-semibold text-amber">{overall.percent}%</p>
          <p className="mt-1 text-sm text-muted">
            {overall.completedLessons} of {overall.totalLessons} published lessons completed
          </p>
          <p className="mt-1 text-sm text-muted">
            {overall.coursesComplete} of {overall.coursesTotal} courses complete
          </p>
          <div className="mt-5">
            <ProgressBar
              percent={overall.percent}
              completed={overall.completedLessons}
              total={overall.totalLessons}
              label="All courses"
            />
          </div>
          <p className="mt-5 text-sm font-semibold text-amber">{xp.total} XP earned</p>
        </section>

        <section className="rounded-lg border border-amber/40 bg-surface p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-amber">
            {isNewLearner ? 'Start here' : 'Resume learning'}
          </h2>
          {resume ? (
            <>
              <p className="mt-3 text-lg font-semibold text-parchment">
                {resume.lesson ? resume.lesson.title : resume.assessment?.title}
              </p>
              <p className="mt-1 text-sm text-muted">{resume.courseTitle}</p>
              {resume.lesson ? (
                <Link
                  to={`/lessons/${resume.lesson.slug}`}
                  className="mt-5 inline-block rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
                >
                  {isNewLearner ? 'Begin the first lesson' : 'Continue where I stopped'}
                </Link>
              ) : resume.assessment ? (
                <Link
                  to={`/quizzes/${resume.assessment.slug}`}
                  className="mt-5 inline-block rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
                >
                  Take the course assessment
                </Link>
              ) : null}
              {resume.lesson && resume.assessment && !resume.assessment.passed ? (
                <p className="mt-3 text-sm text-muted">
                  Course assessment also required: {resume.assessment.title}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="mt-3 text-lg font-semibold text-parchment">
                Every course is complete
              </p>
              <p className="mt-1 text-sm text-muted">
                You have finished every published lesson and passed every assessment.
              </p>
              <Link
                to="/courses"
                className="mt-5 inline-block rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-parchment hover:border-amber"
              >
                Browse courses
              </Link>
            </>
          )}
        </section>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold text-parchment">Course progress</h2>
          <Link to="/courses" className="text-sm font-semibold text-amber hover:text-amber-soft">
            All courses →
          </Link>
        </div>
        <ul className="space-y-3">
          {courses.map((course) => (
            <li key={course.slug} className="rounded-lg border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/courses/${course.slug}`}
                    className="font-semibold text-parchment hover:text-amber-soft"
                  >
                    {course.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {course.progress.percent}% complete · {course.progress.completedLessons} of{' '}
                    {course.progress.totalLessons} lessons
                  </p>
                </div>
                {course.nextLesson ? (
                  <Link
                    to={`/lessons/${course.nextLesson.slug}`}
                    className="rounded border border-line px-3 py-2 text-sm text-parchment hover:border-amber"
                  >
                    {course.progress.completedLessons === 0 ? 'Start' : 'Resume'}
                  </Link>
                ) : course.complete ? (
                  <span className="text-sm font-semibold text-amber">Complete</span>
                ) : course.assessment ? (
                  <Link
                    to={`/quizzes/${course.assessment.slug}`}
                    className="rounded border border-amber/50 px-3 py-2 text-sm text-amber hover:border-amber"
                  >
                    Take assessment
                  </Link>
                ) : null}
              </div>
              <div className="mt-4">
                <ProgressBar
                  percent={course.progress.percent}
                  completed={course.progress.completedLessons}
                  total={course.progress.totalLessons}
                  label={`${course.title} progress`}
                  size="sm"
                />
              </div>
              {course.nextLesson ? (
                <p className="mt-3 text-sm text-muted">
                  Next: <span className="text-parchment">{course.nextLesson.title}</span>
                </p>
              ) : course.assessment ? (
                <p className="mt-3 text-sm text-muted">
                  Assessment: {course.assessment.title} ·{' '}
                  {course.assessment.passed
                    ? 'passed'
                    : course.assessment.attempts
                      ? `best ${course.assessment.bestPercent ?? 0}%`
                      : 'not attempted'}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-parchment">Achievements</h2>
        {achievements.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              Pass a lesson knowledge check to earn your first achievement.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3">
            {achievements.map((achievement) => (
              <li key={achievement.slug} className="rounded-lg border border-amber/40 bg-surface p-4">
                <p className="font-semibold text-amber">{achievement.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{achievement.description}</p>
                <p className="mt-2 text-xs text-muted">{formatDate(achievement.earnedAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-parchment">Recently completed</h2>
        {recent.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              No completed lessons yet. Open the first lesson above — your progress will be recorded
              here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {recent.map((item) => (
              <li key={`${item.lessonSlug}-${item.completedAt}`}>
                <Link
                  to={`/lessons/${item.lessonSlug}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-surface-2"
                >
                  <span>
                    <span className="block font-medium text-parchment">{item.lessonTitle}</span>
                    <span className="block text-sm text-muted">{item.courseSlug}</span>
                  </span>
                  <span className="text-xs text-muted">{formatDate(item.completedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
