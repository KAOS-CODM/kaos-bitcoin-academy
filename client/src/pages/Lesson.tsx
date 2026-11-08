import { Link, useParams } from 'react-router-dom'
import { SectionRenderer } from '../components/SectionRenderer'
import { QuizRunner } from '../components/Quiz'
import { WALLET_ACTIVITY_LESSON } from '../features/wallet/activity'
import { WalletActivityCallout } from '../features/wallet/WalletActivityCallout'
import { useCompleteLesson, useLesson, useQuiz } from '../lib/queries'
import { ApiError } from '../lib/api'

export function Lesson() {
  const { slug } = useParams<{ slug: string }>()
  const lessonQuery = useLesson(slug)
  const complete = useCompleteLesson(slug ?? '')
  const quizQuery = useQuiz(lessonQuery.data?.quiz?.slug)

  if (lessonQuery.isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6" role="status">
        <p className="text-muted">Loading lesson…</p>
      </div>
    )
  }

  if (lessonQuery.isError) {
    const error = lessonQuery.error
    const status = error instanceof ApiError ? error.status : 0
    const signInHref = `/login?next=${encodeURIComponent(`/lessons/${slug ?? ''}`)}`

    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-semibold text-parchment">
          {status === 401
            ? 'Sign in to read this lesson'
            : status === 404
              ? 'Lesson not found'
              : 'Lesson temporarily unavailable'}
        </h1>
        <p className="mt-3 leading-7 text-muted">
          {status === 401
            ? 'This lesson is part of a course. Create a free account to save your progress — or read the open preview lesson without signing up.'
            : status === 404
              ? 'The lesson may have moved or is not published.'
              : 'The academy could not reach its database. Please try again in a moment.'}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {status === 401 ? (
            <>
              <Link
                to={signInHref}
                className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
              >
                Sign in or create an account
              </Link>
              <Link
                to="/lessons/btc101-what-is-bitcoin"
                className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-parchment hover:border-amber"
              >
                Read the free preview
              </Link>
            </>
          ) : (
            <>
              {status !== 404 ? (
                <button
                  type="button"
                  onClick={() => void lessonQuery.refetch()}
                  className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
                >
                  Try again
                </button>
              ) : null}
              <Link
                to="/courses"
                className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-parchment hover:border-amber"
              >
                Back to courses
              </Link>
            </>
          )}
        </div>
      </div>
    )
  }

  const { lesson, course, moduleTitle, navigation, viewer, quiz } = lessonQuery.data
  const signedIn = viewer.authenticated

  const lessonHref = (target: { slug: string }) =>
    signedIn
      ? `/lessons/${target.slug}`
      : `/login?next=${encodeURIComponent(`/lessons/${target.slug}`)}`

  const nextHref = navigation.next ? lessonHref(navigation.next) : null

  const onComplete = () => {
    complete.mutate()
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link to="/courses" className="hover:text-parchment">
          Courses
        </Link>
        <span aria-hidden="true"> / </span>
        <Link to={`/courses/${course.slug}`} className="hover:text-parchment">
          {course.title}
        </Link>
        {moduleTitle ? (
          <>
            <span aria-hidden="true"> / </span>
            <span>{moduleTitle}</span>
          </>
        ) : null}
      </nav>

      <header className="mt-6">
        <p className="text-xs uppercase tracking-widest text-amber">
          {course.level} · {lesson.minutes} min read
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-parchment sm:text-4xl">
          {lesson.title}
        </h1>
        <p className="mt-3 text-lg leading-8 text-muted">{lesson.summary}</p>
      </header>

      {lesson.isPreview && !signedIn ? (
        <div className="mt-6 rounded-lg border border-amber/40 bg-amber/5 p-4">
          <p className="text-sm font-semibold text-amber">Free preview</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            This lesson is open to everyone. Progress is not saved for anonymous visitors — create
            a free account to keep your place and track the rest of the course.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              to={`/register?next=${encodeURIComponent(`/lessons/${lesson.slug}`)}`}
              className="rounded bg-amber px-3 py-2 text-sm font-semibold text-ink hover:bg-amber-soft"
            >
              Create free account
            </Link>
            <Link
              to={`/login?next=${encodeURIComponent(`/lessons/${lesson.slug}`)}`}
              className="rounded border border-line px-3 py-2 text-sm text-parchment hover:border-amber"
            >
              Sign in
            </Link>
          </div>
        </div>
      ) : null}

      {lesson.objectives.length > 0 ? (
        <section aria-labelledby="objectives" className="mt-8 rounded-lg border border-line bg-surface p-5">
          <h2 id="objectives" className="text-sm font-semibold uppercase tracking-widest text-amber">
            By the end of this lesson
          </h2>
          <ul className="mt-3 space-y-2">
            {lesson.objectives.map((objective) => (
              <li key={objective} className="flex gap-3 text-sm leading-7 text-muted">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <article className="mt-10">
        <SectionRenderer sections={lesson.sections} />
      </article>

      {course.slug === WALLET_ACTIVITY_LESSON.courseSlug &&
      lesson.slug === WALLET_ACTIVITY_LESSON.slug ? (
        <WalletActivityCallout />
      ) : null}

      <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-surface p-5">
        <div>
          <h2 className="text-lg font-semibold text-parchment">Need another explanation?</h2>
          <p className="mt-1 text-sm text-muted">
            Ask the AI Tutor about this lesson and get a beginner-friendly walkthrough.
          </p>
        </div>
        <Link
          to={`/tutor?lesson=${lesson.slug}`}
          className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
        >
          Ask the tutor
        </Link>
      </section>

      {quiz ? (
        quizQuery.isPending ? (
          <div className="mt-10 rounded-lg border border-line bg-surface p-5" role="status">
            <p className="text-sm text-muted">Loading the lesson check…</p>
          </div>
        ) : quizQuery.isError ? (
          <div className="mt-10 rounded-lg border border-line bg-surface p-5">
            <p className="text-sm text-muted">
              The lesson check could not be loaded right now. You can still read the lesson and
              mark it complete.
            </p>
          </div>
        ) : quizQuery.data ? (
          <QuizRunner
            key={quizQuery.data.quiz.slug}
            quiz={quizQuery.data.quiz}
            authenticated={quizQuery.data.viewer.authenticated}
            initialSummary={quizQuery.data.attemptSummary}
            compact
          />
        ) : null
      ) : null}

      <section className="mt-12 rounded-lg border border-line bg-surface p-5 sm:p-6">
        {signedIn ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-parchment">
                {lesson.completed ? 'Lesson complete' : 'Finished this lesson?'}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {lesson.completed
                  ? 'Your progress is saved to your account.'
                  : 'Mark it complete to keep your place in the course.'}
              </p>
            </div>
            {lesson.completed ? (
              <span className="rounded-full border border-amber/50 px-4 py-2 text-sm font-semibold text-amber">
                Completed
              </span>
            ) : (
              <button
                type="button"
                onClick={onComplete}
                disabled={complete.isPending}
                className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-amber-soft disabled:opacity-60"
              >
                {complete.isPending ? 'Saving…' : 'Mark as complete'}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted">
              You are reading as a guest. Create an account to mark lessons complete and resume
              where you stopped.
            </p>
            <Link
              to={`/register?next=${encodeURIComponent(`/lessons/${lesson.slug}`)}`}
              className="rounded-md bg-amber px-4 py-2.5 text-sm font-semibold text-ink hover:bg-amber-soft"
            >
              Save my progress
            </Link>
          </div>
        )}

        {complete.isError ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {complete.error instanceof ApiError
              ? complete.error.message
              : 'Could not save your progress. Please try again.'}
          </p>
        ) : null}
      </section>

      <nav aria-label="Lesson navigation" className="mt-8 flex flex-wrap items-center justify-between gap-4">
        {navigation.previous ? (
          <Link
            to={lessonHref(navigation.previous)}
            className="rounded-md border border-line px-4 py-2.5 text-sm text-parchment hover:border-amber"
          >
            ← {navigation.previous.title}
          </Link>
        ) : (
          <Link
            to={`/courses/${course.slug}`}
            className="rounded-md border border-line px-4 py-2.5 text-sm text-parchment hover:border-amber"
          >
            ← Back to course
          </Link>
        )}

        {nextHref && navigation.next ? (
          <Link
            to={nextHref}
            className="rounded-md bg-surface px-4 py-2.5 text-sm font-semibold text-parchment hover:bg-surface-2"
          >
            Next: {navigation.next.title} →
          </Link>
        ) : null}
      </nav>
    </div>
  )
}
